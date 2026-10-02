// src/shared/settings.js
var XIAO_SETTINGS_NAMESPACE = "dsh-xiao-theme";
var VISUAL_INTENSITIES = Object.freeze(["minimal", "balanced", "immersive"]);
var CHARACTER_POSITIONS = Object.freeze(["corner", "edge"]);
var CHARACTER_OPACITIES = Object.freeze(["low", "medium", "high"]);
var CHARACTER_VARIANTS = Object.freeze(["standing", "celebration"]);
var COMPANION_SIZES = Object.freeze(["sm", "md", "lg"]);
var XIAO_DEFAULT_COMPANION_POSITION = Object.freeze({ x: 92, y: 86 });
var XIAO_SETTING_DEFINITIONS = Object.freeze({
  enabled: Object.freeze({ kind: "boolean", default: true }),
  intensity: Object.freeze({ kind: "choice", default: "balanced", options: VISUAL_INTENSITIES }),
  showHero: Object.freeze({ kind: "boolean", default: true }),
  characterVariant: Object.freeze({ kind: "choice", default: "standing", options: CHARACTER_VARIANTS }),
  characterPosition: Object.freeze({ kind: "choice", default: "edge", options: CHARACTER_POSITIONS }),
  characterOpacity: Object.freeze({ kind: "choice", default: "medium", options: CHARACTER_OPACITIES }),
  animateCharacter: Object.freeze({ kind: "boolean", default: true }),
  showCompanion: Object.freeze({ kind: "boolean", default: true }),
  animatedCompanion: Object.freeze({ kind: "boolean", default: true }),
  companionSize: Object.freeze({ kind: "choice", default: "md", options: COMPANION_SIZES }),
  companionFlipped: Object.freeze({ kind: "boolean", default: false }),
  companionPosition: Object.freeze({ kind: "position", default: XIAO_DEFAULT_COMPANION_POSITION, min: 0, max: 100 }),
  showOrnament: Object.freeze({ kind: "boolean", default: true }),
  ambientMotion: Object.freeze({ kind: "boolean", default: true }),
  clickRipple: Object.freeze({ kind: "boolean", default: true }),
  heroParallax: Object.freeze({ kind: "boolean", default: true }),
  convergeWhileRunning: Object.freeze({ kind: "boolean", default: true }),
  balanceEnabled: Object.freeze({ kind: "boolean", default: false })
});
var XIAO_SETTING_KEYS = Object.freeze(Object.keys(XIAO_SETTING_DEFINITIONS));
function cloneDefaultValue(value) {
  if (typeof value === "object" && value !== null) return Object.freeze({ ...value });
  return value;
}
var DEFAULT_XIAO_SETTINGS = Object.freeze(Object.fromEntries(
  Object.entries(XIAO_SETTING_DEFINITIONS).map(([key, definition]) => [key, cloneDefaultValue(definition.default)])
));
var XIAO_VISUAL_PRESETS = Object.freeze({
  minimal: Object.freeze({
    intensity: "minimal",
    showHero: true,
    characterOpacity: "low",
    animateCharacter: false,
    showOrnament: false,
    ambientMotion: false,
    clickRipple: true,
    heroParallax: false
  }),
  balanced: Object.freeze({
    intensity: "balanced",
    showHero: true,
    characterOpacity: "medium",
    animateCharacter: true,
    showOrnament: true,
    ambientMotion: true,
    clickRipple: true,
    heroParallax: false
  }),
  immersive: Object.freeze({
    intensity: "immersive",
    showHero: true,
    characterOpacity: "high",
    animateCharacter: true,
    showOrnament: true,
    ambientMotion: true,
    clickRipple: true,
    heroParallax: true
  })
});

// src/host/settings-schema.js
import z from "@deepseek-ai/schemastery";
function schemaFor(definition) {
  switch (definition.kind) {
    case "boolean":
      return z.boolean().default(definition.default);
    case "number":
      return z.number().min(definition.min).max(definition.max).step(definition.step ?? 1).default(definition.default);
    case "choice":
      return z.union([...definition.options]).default(definition.default);
    case "position":
      return z.object({
        x: z.number().min(definition.min).max(definition.max).default(definition.default.x),
        y: z.number().min(definition.min).max(definition.max).default(definition.default.y)
      }).default(definition.default);
    default:
      throw new TypeError(`Unsupported Xiao setting kind: ${definition.kind}`);
  }
}
var XiaoThemeSettingsSchema = z.object(Object.fromEntries(
  Object.entries(XIAO_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition)])
));
var XiaoThemeConfigSchema = z.object(Object.fromEntries(
  Object.entries(XIAO_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition).volatile()])
));

// src/host/balance-route.js
import { createHash } from "node:crypto";
var BALANCE_PATH = "/api/xiao-balance";
var OFFICIAL_HOST = "api.deepseek.com";
var CACHE_TTL_MS = 6e4;
var MANUAL_REFRESH_FLOOR_MS = 15e3;
var REQUEST_TIMEOUT_MS = 1e4;
var FAILURE_BACKOFF_BASE_MS = 3e4;
var FAILURE_BACKOFF_MAX_MS = 3e5;
var ALLOWED_PROTOCOL = "https:";
var cached;
var inFlight;
var generation = 0;
var consecutiveFailures = 0;
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
function errorSnapshot(status, extra = {}) {
  const previous = cached?.value;
  const sameBinding = typeof previous?.totalBalance === "string" && typeof extra.bindingId === "string" && previous.bindingId === extra.bindingId;
  return {
    status,
    providerLabel: "DeepSeek API",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    stale: sameBinding,
    ...sameBinding ? {
      bindingId: previous.bindingId,
      generation: previous.generation,
      currency: previous.currency,
      totalBalance: previous.totalBalance,
      grantedBalance: previous.grantedBalance,
      toppedUpBalance: previous.toppedUpBalance,
      isAvailable: previous.isAvailable
    } : {},
    ...extra
  };
}
function parseRetryAt(header, now = Date.now()) {
  if (header === null || header === void 0 || header === "") return now + 6e4;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return now + seconds * 1e3;
  const date = Date.parse(header);
  return Number.isFinite(date) ? date : now + 6e4;
}
function failureBackoffMs(failures) {
  if (!Number.isFinite(failures) || failures <= 0) return 0;
  return Math.min(FAILURE_BACKOFF_BASE_MS * 2 ** (failures - 1), FAILURE_BACKOFF_MAX_MS);
}
function cacheDecision(entry, bindingId, force, now = Date.now()) {
  if (!entry || entry.bindingId !== bindingId) return "miss";
  const retryAt = entry.value?.status === "rate-limited" ? Date.parse(entry.value.retryAt ?? "") : Number.NaN;
  if (Number.isFinite(retryAt) && retryAt > now) return "serve";
  const age = now - entry.at;
  if (age < (force ? MANUAL_REFRESH_FLOOR_MS : CACHE_TTL_MS)) return "serve";
  return "miss";
}
function resolveConnection(settings, launchEnvironment) {
  let section;
  if (typeof settings?.get === "function") {
    section = settings.get("llm-deepseek") ?? {};
  } else if (typeof settings?.describe === "function") {
    const entries = settings.describe({ redactSecrets: true });
    const provider = entries.find((entry) => entry.ns === "llm-deepseek-api-key") ?? entries.find((entry) => entry.ns === "llm-deepseek");
    if (!provider) return { status: "unbound" };
    section = provider.value ?? {};
  } else {
    return { status: "unbound" };
  }
  const apiKeyEnv = typeof section.apiKeyEnv === "string" && section.apiKeyEnv.length > 0 ? section.apiKeyEnv : "DEEPSEEK_API_KEY";
  const rawBaseURL = typeof section.baseURL === "string" && section.baseURL.length > 0 ? section.baseURL : launchEnvironment?.get("DEEPSEEK_BASE_URL")?.value ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  let baseURL;
  try {
    baseURL = new URL(rawBaseURL);
  } catch {
    return { status: "unsupported" };
  }
  if (baseURL.protocol !== ALLOWED_PROTOCOL || baseURL.hostname !== OFFICIAL_HOST) return { status: "unsupported" };
  return { apiKeyEnv, balanceURL: new URL("/user/balance", baseURL.origin).href };
}
function credentialBindingId(reference, source, secret) {
  const digest = createHash("sha256").update(String(reference)).update("\0").update(String(source)).update("\0").update(String(secret)).digest("hex").slice(0, 16);
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
    const primary = infos.find((info) => info?.currency === "CNY") ?? infos[0];
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
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
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
  const current = { bindingId: binding.bindingId, promise: void 0 };
  current.promise = queryBalance(binding).then((value) => {
    if (inFlight === current && value.bindingId === binding.bindingId) {
      cached = { at: Date.now(), bindingId: binding.bindingId, value };
    }
    return value;
  }).finally(() => {
    if (inFlight === current) inFlight = void 0;
  });
  inFlight = current;
  return current.promise;
}
function installBalanceRoute(ctx) {
  ctx.inject(["connection", "settings", "credentials"], (balanceCtx) => {
    balanceCtx.effect(() => balanceCtx.connection.fetch.register({
      path: BALANCE_PATH,
      methods: ["GET"],
      requestBody: "buffered",
      fetch: (request) => {
        const force = new URL(request.url).searchParams.get("force") === "1";
        return readBalance(balanceCtx, force).then((value) => json(value));
      }
    }), "dsh-xiao-theme: authenticated DeepSeek balance route");
  });
}

// src/host/index.js
var name = "dsh-xiao-theme";
var Config = XiaoThemeConfigSchema;
function apply(ctx) {
  installBalanceRoute(ctx);
  ctx.inject(["settings"], (settingsCtx) => {
    if (typeof settingsCtx.settings.register === "function") {
      settingsCtx.settings.register(XIAO_SETTINGS_NAMESPACE, XiaoThemeSettingsSchema, { applies: "live" });
    } else if (typeof settingsCtx.settings.configure === "function") {
      settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
    }
  });
}
export {
  Config,
  apply,
  name
};
