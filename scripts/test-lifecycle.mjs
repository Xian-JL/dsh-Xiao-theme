import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check, equal, finish } from "./test-helpers.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(resolve(ROOT, relative), "utf8");

const overlay = await read("src/client/overlay/xiao-overlay.js");
const parallax = await read("src/client/motion/parallax.js");
const interaction = await read("src/client/interaction/interaction-bridge.js");
const heroPhase = await read("src/client/scene/hero-phase.js");
const balanceStore = await read("src/client/balance/balance-store.js");
const useBalance = await read("src/client/balance/use-balance.js");
const styles = await read("src/client/styles.css");
const brand = await read("src/client/components/brand.js");
const settingsRow = await read("src/client/settings/xiao-settings-row.js");
const statusPanel = await read("src/client/companion/status-panel.js");
const controls = await read("src/client/settings/controls.js");
const index = await read("src/client/index.js");

// --- listener hygiene -------------------------------------------------------
function balanced(source, label) {
	const added = (source.match(/addEventListener\(/g) ?? []).length;
	const removed = (source.match(/removeEventListener\(/g) ?? []).length;
	check(added > 0 && added === removed, `${label}: every addEventListener needs a matching removeEventListener (${added} added, ${removed} removed)`);
	return added;
}

balanced(interaction, "interaction bridge");
balanced(parallax, "parallax");
balanced(balanceStore, "balance store");
equal((heroPhase.match(/addEventListener\(/g) ?? []).length, 0,
	"hero phase observer: the phase model must rely on MutationObserver only");

check(/selectedNavigation\.disconnect\(\)/.test(interaction), "the navigation observer must be disconnected");
check(/observer\.disconnect\(\)/.test(heroPhase), "the phase observer must be disconnected");
check(/observer\?\.disconnect\(\)/.test(parallax), "the parallax size observer must be disconnected");
check(/clearInterval\(pollTimer\)/.test(balanceStore), "polling must be cleared when the last consumer leaves");
check(/removeEventListener\("visibilitychange", handleVisibility\)/.test(balanceStore), "polling listeners must be released");
check(/clearTimeout\(timer\)/.test(interaction), "press timers must be cleared");
check(/cancelAnimationFrame\(frameRef\.current\)/.test(overlay), "pending frames must be cancelled on unmount");
check(/clearTimeout\(reactionTimer\.current\)/.test(overlay), "reaction timers must be cleared on unmount");
check(/return \(\) => \{ if \(timer\.current !== null\) clearTimeout\(timer\.current\); \}/.test(overlay), "session feedback timers must be cleared");
check(/style\.removeProperty\("--xiao-parallax-x"\)/.test(parallax), "parallax properties must be removed when disabled");
check(/animation\.cancel\(\)/.test(overlay), "in-flight ripple animations must be cancelled when disabled");

// --- visibility and reduced-motion gates ------------------------------------
check(/"data-hidden": String\(!activity\.visible\)/.test(overlay), "the overlay must publish the page-hidden flag");
check(/"data-reduced": String\(activity\.reducedMotion\)/.test(overlay), "the overlay must publish the reduced-motion flag");
check(/value\.clickRipple && activity\.visible && !activity\.reducedMotion/.test(overlay),
	"wind traces must be gated on visibility and reduced motion");
check(/value\.heroParallax && value\.intensity === "immersive"/.test(overlay),
	"parallax must be limited to the immersive preset");
check(/isXiaoHeroSettled\(phase\)/.test(overlay), "parallax must wait for the settled hero phase");
check(/data-hidden='true'/.test(styles), "the stylesheet must react to the hidden flag");
check(/animation-play-state: paused/.test(styles), "hidden pages must pause animation instead of continuing to render");
check(/prefers-reduced-motion: reduce/.test(styles), "the stylesheet must respect the system reduced-motion setting");
check(/useXiaoActivity/.test(overlay) && /visibilitychange/.test(await read("src/client/motion/lifecycle.js")),
	"page activity must be tracked from the visibility API");
check(/if \(!enabled\) return undefined;/.test(useBalance), "balance polling must not start while the feature is disabled");

// --- no remote resources ----------------------------------------------------
for (const [label, source] of [["stylesheet", styles], ["overlay", overlay], ["brand", brand], ["settings", settingsRow]]) {
	check(!/url\(\s*['"]?https?:/i.test(source), `${label}: remote url() references are not allowed`);
	check(!/@import/i.test(source), `${label}: css @import is not allowed`);
}
check(!/fonts\.googleapis|cdn\./i.test(overlay + styles), "no online font or CDN reference is allowed");

// --- class coverage ---------------------------------------------------------
// Every xiao-* token that appears inside a quoted string must have a matching
// rule in the authored stylesheet. This catches class-name typos at build time.
const sources = [overlay, brand, settingsRow, statusPanel, controls];
const candidates = new Set();
for (const source of sources) {
	for (const match of source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g)) {
		const literal = match[1] ?? match[2] ?? match[3] ?? "";
		for (const word of literal.split(/[\s,]+/)) {
			const cleaned = word.replace(/[^a-z0-9_-]/g, "");
			if (/^xiao-[a-z0-9]+(?:__[a-z0-9]+)?(?:--[a-z0-9]+)?$/.test(cleaned)) candidates.add(cleaned);
		}
	}
}
check(candidates.size > 25, `class coverage needs a meaningful sample (found ${candidates.size})`);
const missing = [...candidates].filter(name => !styles.includes(`.${name}`));
equal(missing, [], "every authored class name must exist in the stylesheet");

// --- teardown paths ---------------------------------------------------------
check(/return null;/.test(overlay), "a disabled theme must render nothing");
check(/delete body\.dataset\[datasetKey\]/.test(overlay), "body presentation attributes must be restored on teardown");
check(/document\.head\.appendChild\(tag\)/.test(await read("src/client/styles.js")), "the stylesheet must be mounted once");
check(/return \(\) => tag\.remove\(\)/.test(await read("src/client/styles.js")), "the stylesheet must be removed with the plugin");
check(/ctx\.effect\(installInteractionBridge/.test(index), "the interaction bridge must be owned by a plugin effect");
check(/ctx\.effect\(\(\) => ctx\.locale\.register/.test(index), "locale registration must be owned by a plugin effect");
check(/ctx\.slots\.inject/.test(index), "slot registrations must be owned by the plugin");

finish("lifecycle");
