import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(resolve(ROOT, relative), "utf8");

const packageJson = JSON.parse(await read("package.json"));
const host = await read("lib/index.js");
const client = await read("lib/client.js");
const sharedSettings = await read("src/shared/settings.js");
const schemaSource = await read("src/host/settings-schema.js");
const decodeSource = await read("src/client/settings/decode.js");
const overlaySource = await read("src/client/overlay/xiao-overlay.js");
const settingsUiSource = await read("src/client/settings/xiao-settings-row.js");
const brandSource = await read("src/client/components/brand.js");
const themeSource = await read("src/client/theme/tokens.js");
const balanceRouteSource = await read("src/host/balance-route.js");
const balanceStoreSource = await read("src/client/balance/balance-store.js");
const balancePolicySource = await read("src/client/balance/policy.js");
const sessionCompatSource = await read("src/client/session/compat.js");
const sessionBridgeSource = await read("src/client/session/session-state-bridge.js");
const interactionSource = await read("src/client/interaction/interaction-bridge.js");
const rippleSource = await read("src/client/motion/click-ripple.js");
const particlesSource = await read("src/client/motion/particles.js");
const parallaxSource = await read("src/client/motion/parallax-model.js");
const companionSource = await read("src/client/companion/position.js");
const stylesSource = await read("src/client/styles.css");
const localesSource = await read("src/client/locales.js");

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const sourceFiles = [
  "src/shared/settings.js",
  "src/host/index.js",
  "src/host/settings-schema.js",
  "src/host/balance-route.js",
  "src/client/index.js",
  "src/client/locales.js",
  "src/client/styles.js",
  "src/client/assets.generated.js",
  "src/client/styles.generated.js",
  "src/client/version.generated.js",
  "src/client/theme/tokens.js",
  "src/client/background/image.js",
  "src/client/background/palette.js",
  "src/client/components/brand.js",
  "src/client/hooks/use-xiao-settings.js",
  "src/client/scene/phase-model.js",
  "src/client/scene/hero-phase.js",
  "src/client/interaction/interaction-bridge.js",
  "src/client/session/compat.js",
  "src/client/session/status-store.js",
  "src/client/session/session-state-bridge.js",
  "src/client/balance/policy.js",
  "src/client/balance/balance-store.js",
  "src/client/balance/use-balance.js",
  "src/client/balance/provider-watch.js",
  "src/client/motion/lifecycle.js",
  "src/client/motion/click-ripple.js",
  "src/client/motion/particles.js",
  "src/client/motion/parallax-model.js",
  "src/client/motion/parallax.js",
  "src/client/companion/position.js",
  "src/client/companion/status-panel.js",
  "src/client/settings/controls.js",
  "src/client/settings/decode.js",
  "src/client/settings/resolve.js",
  "src/client/settings/write.js",
  "src/client/settings/xiao-settings-row.js",
  "src/client/overlay/xiao-overlay.js",
];

for (const file of [...sourceFiles, "lib/index.js", "lib/client.js"]) {
  const result = spawnSync(process.execPath, ["--check", resolve(ROOT, file)], { encoding: "utf8" });
  assert(result.status === 0, `${file}: syntax check failed\n${result.stderr}`);
}

// --- package contract -------------------------------------------------------
assert(/^\d+\.\d+\.\d+$/.test(packageJson.version), "package.json must use a release version");
assert(packageJson.name === "dsh-xiao-theme", "package name must stay dsh-xiao-theme");
assert(packageJson.dsh?.manifestVersion === 1, "DSH public manifest version must be 1");
assert(packageJson.dsh?.client?.platform === "web", "DSH client platform must remain web");
assert(packageJson.dsh?.bundle?.patch === "./cordis.patch.yml", "Bundle patch path changed unexpectedly");
assert(packageJson.dependencies?.["@deepseek-ai/schemastery"] === "3.18.4", "@deepseek-ai/schemastery must support live Config fields");
assert(packageJson.devDependencies?.esbuild === "0.28.2", "esbuild 0.28.2 must remain the development bundler");
assert(packageJson.engines?.dsh === "^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2", "Top-level DSH compatibility range must cover the verified baseline");
assert(!packageJson.dsh?.client?.inject?.includes("@deepseek-ai/dsh-client-runtime"), "Removed DSH client-runtime package must not be injected");
assert(packageJson.keywords?.includes("dsh-plugin"), "dsh-plugin discovery keyword missing");
assert(Array.isArray(packageJson.files) && !packageJson.files.includes("assets"), "Source assets must stay out of the published package");

// --- namespace isolation ----------------------------------------------------
for (const source of [host, client]) {
  assert(!/dsh-kinich-theme/.test(source), "Xiao bundles must not reference the Kinich namespace");
  assert(!/dsh-kinich-/.test(source), "Xiao bundles must not reference Kinich CSS identifiers");
}
assert(!/kinich/i.test(sharedSettings), "Shared settings must not reference Kinich");
assert(!/kinich/i.test(stylesSource), "Authored stylesheet must not reference Kinich");
assert(!/kinich/i.test(localesSource), "Locale dictionary must not reference Kinich");
assert(client.includes('id: "dsh-xiao-theme"'), "Client bundle must register the dsh-xiao-theme module id");

// --- host contract ----------------------------------------------------------
assert(host.includes("settingsCtx.settings.register(XIAO_SETTINGS_NAMESPACE"), "Host settings namespace registration missing");
assert(host.includes("settingsCtx.settings.configure({ auto: false }"), "Host Config presentation missing");
assert(host.includes("XiaoThemeConfigSchema"), "Live Config schema missing");
assert(schemaSource.includes("Object.entries(XIAO_SETTING_DEFINITIONS)"), "Host schema is no longer derived from shared definitions");
assert(balanceRouteSource.includes("path: BALANCE_PATH"), "Authenticated balance route registration missing");
assert(balanceRouteSource.includes('authorization: `Bearer ${credential.value}`'), "Host-side DeepSeek authorization missing");
assert(balanceRouteSource.includes('new URL("/user/balance"'), "Official DeepSeek balance endpoint missing");
assert(balanceRouteSource.includes("api.deepseek.com"), "Official host allow-list missing");
assert(balanceRouteSource.includes("CACHE_TTL_MS = 60_000"), "Host balance cache must remain 60 seconds");
assert(balanceRouteSource.includes("REQUEST_TIMEOUT_MS = 10_000"), "Host balance timeout must remain 10 seconds");
assert(balanceRouteSource.includes("credentialBindingId"), "Credential-bound cache key missing");
assert(!/apiKey\s*[:=]\s*["']sk-/.test(`${host}${client}`), "A literal API key must never appear in a bundle");

// --- client services and slots ---------------------------------------------
for (const slot of ["sidebar.brand.mark", "sidebar.brand.name", "conversation.hero.brand.mark", "conversation.composer.dock", "shell.overlay", "settings.section"]) {
  assert(client.includes(`ctx.slots.inject(${JSON.stringify(slot)}`), `Required slot missing: ${slot}`);
}
assert(!client.includes('ctx.slots.inject("settings.general.item"'), "Xiao settings must be a dedicated Settings section");
for (const service of ["theme", "slots", "locale", "connection", "remote"]) {
  assert(client.includes(JSON.stringify(service)), `Required client service missing: ${service}`);
}
assert(client.includes('ctx.get("settingsScope")'), "Legacy settingsScope binding missing");
assert(client.includes('ctx.get("configForms")'), "configForms binding missing");
assert(client.includes("theme: ctx.theme"), "Theme service is not projected into the overlay");
assert(client.includes("installXiaoStyles"), "Stylesheet installation missing");
assert(client.includes("watchDeepSeekBalanceProvider"), "Credential watch missing");
assert(client.includes("installInteractionBridge"), "Interaction bridge is not installed");

// --- settings surface -------------------------------------------------------
for (const field of [
  "enabled", "intensity", "showHero", "characterVariant", "characterPosition", "characterOpacity", "animateCharacter",
  "showCompanion", "animatedCompanion", "companionSize", "companionFlipped", "companionPosition",
  "showOrnament", "ambientMotion", "clickRipple", "heroParallax", "convergeWhileRunning", "balanceEnabled",
  "customBackgroundImage", "customBackgroundAccent", "backgroundAutoPalette", "backgroundVisibility"
]) {
  assert(sharedSettings.includes(`${field}:`), `Shared setting definition missing: ${field}`);
  assert(host.includes(field), `Setting missing from the Host schema: ${field}`);
  assert(client.includes(field), `Setting missing from the Client bundle: ${field}`);
}
assert(decodeSource.includes("normalizeXiaoSettings"), "Client decoder no longer fills missing defaults");
assert(settingsUiSource.includes("ThemePreview"), "Settings live preview missing");
assert(settingsUiSource.includes("resetAll"), "Settings reset action missing");
assert(settingsUiSource.includes("xiao-settings"), "Settings surface class missing");
assert(settingsUiSource.includes("normalizeXiaoBackgroundFile"), "Local background image processor missing from Settings");

// --- companion --------------------------------------------------------------
assert(overlaySource.includes("getXiaoSessionState"), "Companion session feedback missing");
assert(overlaySource.includes("useSessions(selectMainViewSessionId)"), "Overlay is not bound to the main-view session");
assert(overlaySource.includes("moveWithKeyboard"), "Companion keyboard movement missing");
assert(overlaySource.includes("onPointerDown: startDrag"), "Companion drag start missing");
assert(companionSource.includes("XIAO_DRAG_THRESHOLD_PX"), "Drag/click discrimination threshold missing");
assert(companionSource.includes("XIAO_COMPANION_DOCK"), "Welcome-page dock position missing");
assert(companionSource.includes("isDragGesture"), "Drag gesture classification missing");
assert(!overlaySource.includes("overheated || !writable"), "Low balance must not disable companion interaction");

// --- session state machine --------------------------------------------------
for (const field of ["promptError", "openError", "lastAgentError"]) {
  assert(sessionCompatSource.includes(field), `Session error field missing: ${field}`);
}
assert(sessionCompatSource.includes("retainedBy?.mainView"), "Main-view session selection missing");
assert(sessionCompatSource.includes('return "ended"'), "Neutral ended state missing");
assert(sessionCompatSource.includes("classifySettledRun"), "Settled-run classifier missing");
assert(!sessionBridgeSource.includes('setXiaoSessionState(resolvedSessionId, "complete")'), "Unverified completion state must not be published");
assert(sessionBridgeSource.includes("classifySettledRun"), "Bridge must classify a settled run instead of assuming success");
assert(sessionBridgeSource.includes("clearXiaoSessionState"), "Session state is not released on unmount");

// --- motion -----------------------------------------------------------------
assert(rippleSource.includes("XIAO_RIPPLE_POOL_SIZE = 6"), "Wind-trace pool must use a fixed node pool");
assert(rippleSource.includes("fragment.animate"), "Wind trace must use the Web Animations API");
assert(!rippleSource.includes("setTimeout"), "Ripple rendering must not use timers");
assert(particlesSource.includes("XIAO_PARTICLE_MAX"), "Particle cap missing");
assert(particlesSource.includes("immersive: 28"), "Immersive particle cap must stay at 28");
assert(parallaxSource.includes("XIAO_PARALLAX_MAX_PX = 10.5"), "Parallax must stay within the 3x 10.5 px cap");
assert(stylesSource.includes("data-hidden"), "Hidden-page animation gate missing");
assert(stylesSource.includes("prefers-reduced-motion"), "Reduced-motion styles missing");
assert(stylesSource.includes("animation-play-state: paused"), "Hidden page must pause animation");
assert(!stylesSource.includes("kinich"), "Authored stylesheet must not carry Kinich identifiers");
assert(!/https?:\/\//.test(stylesSource), "Stylesheet must not load remote resources");

// --- assets -----------------------------------------------------------------
for (const asset of [
  "XIAO_STANDING_DATA_URI", "XIAO_COMPANION_DATA_URI", "XIAO_COMPANION_MARK_DATA_URI",
  "XIAO_NUO_MASK_DATA_URI", "XIAO_CELEBRATION_DATA_URI"
]) {
  assert(client.includes(asset), `Runtime asset missing from the client bundle: ${asset}`);
}
assert(!/https?:\/\/(?!www\.w3\.org)/.test(client.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, "")), "Client bundle must not fetch remote resources");
assert(!/api\.deepseek\.com/.test(client), "The client must never call the provider directly");

// --- balance presentation ---------------------------------------------------
assert(balancePolicySource.includes("XIAO_LOW_BALANCE_CNY = 10"), "Low-balance threshold must stay at CNY 10");
assert(balanceStoreSource.includes("credentialGeneration"), "Credential generation guard missing");
assert(balanceStoreSource.includes("60_000"), "Client refresh interval missing");
assert(!/animation-duration: \.3s/.test(stylesSource), "Low balance must not double animation speed");
assert(!/data-overheated='true'\][^{]*\{[^}]*background: *(#ff|red)/.test(stylesSource), "Low balance must not recolour the whole interface");

try {
  await import("@deepseek-ai/schemastery");
} catch (error) {
  errors.push(`Runtime dependency @deepseek-ai/schemastery is not installed. Run npm install in ${ROOT}.\n${error}`);
}

if (errors.length) {
  console.error(`Xiao verification failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Xiao verification passed.");
console.log(`- version: ${packageJson.version}`);
console.log("- namespace: every setting, slot, class and locale key is xiao-scoped");
console.log("- settings: shared definitions + Host schema + backwards-compatible decode");
console.log("- session: explicit completion signal, neutral ended fallback, sessionId isolation");
console.log("- companion: drag, keyboard, dock/restore, accessible panel");
console.log("- motion: fixed ripple pool, capped particles, <=10.5 px parallax, hidden-page pause");
console.log("- balance: Host-only credential use, CNY 10 local warning, no global recolour");
console.log("- assets: five inlined local images, no remote fetch");
