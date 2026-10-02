import { createHash } from "node:crypto";

/** Authenticated, Host-only DeepSeek balance bridge for the Xiao companion. */
export const BALANCE_PATH = "/api/xiao-balance";
export const OFFICIAL_HOST = "api.deepseek.com";
export const CACHE_TTL_MS = 60_000;
export const MANUAL_REFRESH_FLOOR_MS = 15_000;
export const REQUEST_TIMEOUT_MS = 10_000;
export const FAILURE_BACKOFF_BASE_MS = 30_000;
export const FAILURE_BACKOFF_MAX_MS = 300_000;
/** Only the official endpoint may be queried, and only with a resolved credential. */
const ALLOWED_PROTOCOL = "https:";

let cached;
let inFlight;
let generation = 0;
let consecutiveFailures = 0;

function json(value, status = 200) {
	return new Response(JSON.stringify(value), {
		status,
		headers: {
			"cache-control": "private, no-store",
			"content-type": "application/json; charset=utf-8",
			"x-content-type-options": "nosniff"
		}
	});
}

/** Reuse the last good numbers only when they belong to the same credential binding. */
function errorSnapshot(status, extra = {}) {
	const previous = cached?.value;
	const sameBinding = typeof previous?.totalBalance === "string" &&
		typeof extra.bindingId === "string" && previous.bindingId === extra.bindingId;
	return {
		status,
		providerLabel: "DeepSeek API",
		checkedAt: new Date().toISOString(),
		stale: sameBinding,
		...(sameBinding ? {
			bindingId: previous.bindingId,
			generation: previous.generation,
			currency: previous.currency,
			totalBalance: previous.totalBalance,
			grantedBalance: previous.grantedBalance,
			toppedUpBalance: previous.toppedUpBalance,
			isAvailable: previous.isAvailable
		} : {}),
		...extra
	};
}

export function parseRetryAt(header, now = Date.now()) {
	if (header === null || header === undefined || header === "") return now + 60_000;
	const seconds = Number(header);
	if (Number.isFinite(seconds) && seconds >= 0) return now + seconds * 1000;
	const date = Date.parse(header);
	return Number.isFinite(date) ? date : now + 60_000;
}

/** Exponential backoff for repeated provider failures, capped at five minutes. */
export function failureBackoffMs(failures) {
	if (!Number.isFinite(failures) || failures <= 0) return 0;
	return Math.min(FAILURE_BACKOFF_BASE_MS * 2 ** (failures - 1), FAILURE_BACKOFF_MAX_MS);
}

/** Decide whether a cached snapshot may still be served. */
export function cacheDecision(entry, bindingId, force, now = Date.now()) {
	if (!entry || entry.bindingId !== bindingId) return "miss";
	const retryAt = entry.value?.status === "rate-limited" ? Date.parse(entry.value.retryAt ?? "") : Number.NaN;
	if (Number.isFinite(retryAt) && retryAt > now) return "serve";
	const age = now - entry.at;
	if (age < (force ? MANUAL_REFRESH_FLOOR_MS : CACHE_TTL_MS)) return "serve";
	return "miss";
}

/**
 * Resolve the active DeepSeek connection without ever exposing the key to the
 * client. Only the official https endpoint is accepted.
 */
export function resolveConnection(settings, launchEnvironment) {
	let section;
	if (typeof settings?.get === "function") {
		section = settings.get("llm-deepseek") ?? {};
	} else if (typeof settings?.describe === "function") {
		const entries = settings.describe({ redactSecrets: true });
		const provider = entries.find(entry => entry.ns === "llm-deepseek-api-key")
			?? entries.find(entry => entry.ns === "llm-deepseek");
		if (!provider) return { status: "unbound" };
		section = provider.value ?? {};
	} else {
		return { status: "unbound" };
	}
	const apiKeyEnv = typeof section.apiKeyEnv === "string" && section.apiKeyEnv.length > 0
		? section.apiKeyEnv
		: "DEEPSEEK_API_KEY";
	const rawBaseURL = typeof section.baseURL === "string" && section.baseURL.length > 0
		? section.baseURL
		: launchEnvironment?.get("DEEPSEEK_BASE_URL")?.value ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
	let baseURL;
	try { baseURL = new URL(rawBaseURL); } catch { return { status: "unsupported" }; }
	if (baseURL.protocol !== ALLOWED_PROTOCOL || baseURL.hostname !== OFFICIAL_HOST) return { status: "unsupported" };
	return { apiKeyEnv, balanceURL: new URL("/user/balance", baseURL.origin).href };
}

/** Irreversible credential fingerprint: the raw secret never leaves this module. */
export function credentialBindingId(reference, source, secret) {
	const digest = createHash("sha256")
		.update(String(reference)).update("\0").update(String(source)).update("\0").update(String(secret))
		.digest("hex").slice(0, 16);
	return `deepseek-${digest}`;
}

async function resolveBalanceBinding(ctx) {
	const connection = resolveConnection(ctx.settings, ctx.launchEnvironment);
	if (connection.status) return connection;
	const credential = await ctx.credentials.resolve(connection.apiKeyEnv);
	if (credential === void 0 || credential.value === "") return { status: "unbound" };
	return {
		...connection,
		credential,
		bindingId: credentialBindingId(connection.apiKeyEnv, credential.source ?? "configured", credential.value)
	};
}

async function queryBalance(binding) {
	const { balanceURL, bindingId, credential } = binding;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(balanceURL, {
			headers: { accept: "application/json", authorization: `Bearer ${credential.value}` },
			signal: controller.signal
		});
		if (response.status === 401 || response.status === 403) {
			consecutiveFailures += 1;
			return errorSnapshot("auth-error", { bindingId, retryable: false });
		}
		if (response.status === 429) {
			consecutiveFailures += 1;
			return errorSnapshot("rate-limited", {
				bindingId,
				retryable: true,
				retryAt: new Date(parseRetryAt(response.headers.get("retry-after"))).toISOString()
			});
		}
		if (!response.ok) {
			consecutiveFailures += 1;
			return errorSnapshot("unavailable", { bindingId, retryable: true, retryAfterMs: failureBackoffMs(consecutiveFailures) });
		}
		const body = await response.json();
		const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : [];
		const primary = infos.find(info => info?.currency === "CNY") ?? infos[0];
		if (primary === void 0 || typeof primary.total_balance !== "string") {
			consecutiveFailures += 1;
			return errorSnapshot("unavailable", { bindingId, retryable: true, retryAfterMs: failureBackoffMs(consecutiveFailures) });
		}
		consecutiveFailures = 0;
		generation += 1;
		return {
			status: "ready",
			bindingId,
			generation,
			providerLabel: "DeepSeek API",
			currency: String(primary.currency ?? "CNY"),
			totalBalance: primary.total_balance,
			grantedBalance: String(primary.granted_balance ?? "0"),
			toppedUpBalance: String(primary.topped_up_balance ?? "0"),
			isAvailable: Boolean(body.is_available),
			checkedAt: new Date().toISOString(),
			stale: false
		};
	} catch {
		consecutiveFailures += 1;
		return errorSnapshot("unavailable", { bindingId, retryable: true, retryAfterMs: failureBackoffMs(consecutiveFailures) });
	} finally {
		clearTimeout(timer);
	}
}

async function readBalance(ctx, force) {
	const binding = await resolveBalanceBinding(ctx);
	if (binding.status) return errorSnapshot(binding.status);
	const now = Date.now();
	if (cacheDecision(cached, binding.bindingId, force, now) === "serve") return cached.value;
	if (inFlight?.bindingId === binding.bindingId) return inFlight.promise;
	const current = { bindingId: binding.bindingId, promise: undefined };
	current.promise = queryBalance(binding).then(value => {
		// A late response for a replaced credential must never overwrite the
		// snapshot that belongs to the current binding.
		if (inFlight === current && value.bindingId === binding.bindingId) {
			cached = { at: Date.now(), bindingId: binding.bindingId, value };
		}
		return value;
	}).finally(() => { if (inFlight === current) inFlight = void 0; });
	inFlight = current;
	return current.promise;
}

export function installBalanceRoute(ctx) {
	ctx.inject(["connection", "settings", "credentials"], balanceCtx => {
		balanceCtx.effect(() => balanceCtx.connection.fetch.register({
			path: BALANCE_PATH,
			methods: ["GET"],
			requestBody: "buffered",
			fetch: request => {
				const force = new URL(request.url).searchParams.get("force") === "1";
				return readBalance(balanceCtx, force).then(value => json(value));
			}
		}), "dsh-xiao-theme: authenticated DeepSeek balance route");
	});
}
