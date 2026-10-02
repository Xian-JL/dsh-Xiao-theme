import { check, equal, finish } from "./test-helpers.mjs";
import {
	XIAO_LOW_BALANCE_CNY,
	balanceTone,
	getBalanceRetryMinutes,
	isBelowCnyThreshold
} from "../src/client/balance/policy.js";
import {
	CACHE_TTL_MS,
	FAILURE_BACKOFF_MAX_MS,
	MANUAL_REFRESH_FLOOR_MS,
	cacheDecision,
	credentialBindingId,
	failureBackoffMs,
	parseRetryAt,
	resolveConnection
} from "../src/host/balance-route.js";
import {
	getBalanceSnapshot,
	refreshBalance,
	refreshBalanceForCredentialChange,
	resetBalanceStore
} from "../src/client/balance/balance-store.js";

// --- low-balance policy -----------------------------------------------------
equal(XIAO_LOW_BALANCE_CNY, 10, "the low-balance threshold stays at CNY 10");
check(isBelowCnyThreshold({ currency: "CNY", totalBalance: "9.99" }), "9.99 is below the threshold");
check(isBelowCnyThreshold({ currency: "CNY", totalBalance: "0.50" }), "a small balance is below the threshold");
check(isBelowCnyThreshold({ currency: "CNY", totalBalance: "09.50" }), "leading zeros are normalised");
check(!isBelowCnyThreshold({ currency: "CNY", totalBalance: "10" }), "exactly 10 is not below the threshold");
check(!isBelowCnyThreshold({ currency: "CNY", totalBalance: "10.00" }), "10.00 is not below the threshold");
check(!isBelowCnyThreshold({ currency: "CNY", totalBalance: "10.01" }), "10.01 is not below the threshold");
check(!isBelowCnyThreshold({ currency: "CNY", totalBalance: "120" }), "a large balance is not below the threshold");
check(!isBelowCnyThreshold({ currency: "USD", totalBalance: "1" }), "a non-CNY balance never triggers the warning");
check(!isBelowCnyThreshold({ status: "ready" }), "a missing amount never triggers the warning");
check(!isBelowCnyThreshold({ currency: "CNY", totalBalance: "not-a-number" }), "an unparsable amount never triggers the warning");

equal(getBalanceRetryMinutes({ retryAt: new Date(Date.now() + 90_000).toISOString(), status: "rate-limited" }), 2,
	"a rate-limited answer reports the remaining minutes");
equal(getBalanceRetryMinutes({ status: "ready" }), null, "only rate limiting reports a retry window");
equal(getBalanceRetryMinutes({ retryAt: new Date(Date.now() - 90_000).toISOString(), status: "rate-limited" }), null,
	"an expired retry window reports nothing");

equal(balanceTone({ status: "ready" }), "ready", "a ready balance is ready");
equal(balanceTone({ stale: true, status: "ready" }), "stale", "a stale balance is marked stale");
equal(balanceTone({ status: "unbound" }), "inactive", "an unbound key is inactive rather than an error");
equal(balanceTone({ status: "auth-error" }), "error", "an auth failure is an error");
equal(balanceTone({ status: "unavailable" }), "unavailable", "an unavailable service is unavailable");
equal(balanceTone(undefined), "unavailable", "a missing balance is unavailable");

// --- host rate limits -------------------------------------------------------
const now = 1_700_000_000_000;
equal(parseRetryAt("120", now), now + 120_000, "a retry-after delay is converted to a timestamp");
equal(parseRetryAt(null, now), now + 60_000, "a missing retry-after falls back to one minute");
check(parseRetryAt("not-a-date", now) >= now, "an unparsable retry-after still produces a future timestamp");
equal(failureBackoffMs(0), 0, "no failures need no backoff");
equal(failureBackoffMs(1), 30_000, "the first failure backs off thirty seconds");
equal(failureBackoffMs(2), 60_000, "backoff doubles");
equal(failureBackoffMs(9), FAILURE_BACKOFF_MAX_MS, "backoff is capped at five minutes");
equal(CACHE_TTL_MS, 60_000, "the automatic cache window is sixty seconds");
equal(MANUAL_REFRESH_FLOOR_MS, 15_000, "manual refreshes respect a fifteen second floor");

const entry = { at: now, bindingId: "b1", value: { status: "ready", totalBalance: "12.00" } };
equal(cacheDecision(undefined, "b1", false, now), "miss", "an empty cache is a miss");
equal(cacheDecision(entry, "b2", false, now), "miss", "a different credential binding is a miss");
equal(cacheDecision(entry, "b1", false, now + 1_000), "serve", "a fresh entry is served");
equal(cacheDecision(entry, "b1", false, now + 61_000), "miss", "an expired entry is refetched");
equal(cacheDecision(entry, "b1", true, now + 5_000), "serve", "a manual refresh inside the floor reuses the entry");
equal(cacheDecision(entry, "b1", true, now + 16_000), "miss", "a manual refresh after the floor refetches");
const limited = { at: now, bindingId: "b1", value: { retryAt: new Date(now + 120_000).toISOString(), status: "rate-limited" } };
equal(cacheDecision(limited, "b1", true, now + 60_000), "serve", "a rate-limit window is honoured even for manual refreshes");

// --- credential binding -----------------------------------------------------
const binding = credentialBindingId("DEEPSEEK_API_KEY", "env", "sk-secret-value");
equal(binding, credentialBindingId("DEEPSEEK_API_KEY", "env", "sk-secret-value"), "the binding id is stable");
check(binding !== credentialBindingId("DEEPSEEK_API_KEY", "env", "sk-other-value"), "a different key produces a different binding");
check(binding !== credentialBindingId("OTHER_ENV", "env", "sk-secret-value"), "a different reference produces a different binding");
check(!binding.includes("sk-secret-value"), "the binding id never contains the secret");
check(/^deepseek-[0-9a-f]{16}$/.test(binding), "the binding id is an irreversible fingerprint");

// --- connection allow-list --------------------------------------------------
equal(resolveConnection({ get: () => ({ baseURL: "https://api.deepseek.com" }) }, undefined).balanceURL,
	"https://api.deepseek.com/user/balance", "the official endpoint is accepted");
equal(resolveConnection({ get: () => ({ baseURL: "http://api.deepseek.com" }) }, undefined).status, "unsupported",
	"a non-TLS endpoint is refused");
equal(resolveConnection({ get: () => ({ baseURL: "https://example.com" }) }, undefined).status, "unsupported",
	"a third-party endpoint is refused");
equal(resolveConnection({ get: () => ({}) }, undefined).apiKeyEnv, "DEEPSEEK_API_KEY",
	"the default credential environment variable is used");
equal(resolveConnection({ describe: () => [] }, undefined).status, "unbound", "a missing provider section is unbound");

// --- stale answers must not overwrite a replaced credential -----------------
const pending = [];
globalThis.fetch = () => new Promise(resolve => { pending.push(resolve); });
const respond = body => ({ json: async () => body, ok: true, status: 200 });

resetBalanceStore();
const first = refreshBalance();
const second = refreshBalanceForCredentialChange();
equal(pending.length, 1, "only one request is in flight for the first credential");
pending[0](respond({ currency: "CNY", status: "ready", stale: false, totalBalance: "1.00" }));
await first;
check(getBalanceSnapshot().totalBalance !== "1.00", "a late answer for a replaced credential is dropped");
await new Promise(resolve => setTimeout(resolve, 0));
equal(pending.length, 2, "the credential change issues a fresh request");
pending[1](respond({ currency: "CNY", status: "ready", stale: false, totalBalance: "20.00" }));
const settled = await second;
equal(settled.totalBalance, "20.00", "the newest answer is published");
equal(getBalanceSnapshot().totalBalance, "20.00", "the cache holds the newest account value");
check(getBalanceSnapshot().overheated === false, "a healthy balance is not marked low");

// A low balance only raises the local warning state.
globalThis.fetch = async () => respond({ currency: "CNY", status: "ready", stale: false, totalBalance: "8.00" });
resetBalanceStore();
await refreshBalance({ force: true });
check(getBalanceSnapshot().overheated === true, "a balance below CNY 10 raises the local warning");
equal(getBalanceSnapshot().status, "ready", "a low balance is still a successful read");

// A failing endpoint must degrade without throwing.
globalThis.fetch = async () => { throw new Error("network down"); };
resetBalanceStore();
const failed = await refreshBalance({ force: true });
equal(failed.status, "unavailable", "a network failure degrades to unavailable");
equal(getBalanceSnapshot().status, "unavailable", "the degraded state is published");

finish("balance");
