import { check, equal, finish } from "./test-helpers.mjs";
import {
	DEFAULT_XIAO_SETTINGS,
	XIAO_SETTING_DEFINITIONS,
	XIAO_VISUAL_PRESETS,
	isXiaoSettingValue,
	normalizeXiaoSettings
} from "../src/shared/settings.js";
import { decodeXiaoSettings } from "../src/client/settings/decode.js";
import { drainXiaoSettingsWrites, writeXiaoSettings } from "../src/client/settings/write.js";

// --- defaults and decoding --------------------------------------------------
equal(normalizeXiaoSettings({}), DEFAULT_XIAO_SETTINGS, "an empty section resolves to defaults");
equal(normalizeXiaoSettings(undefined), DEFAULT_XIAO_SETTINGS, "a missing section resolves to defaults");
equal(decodeXiaoSettings(null), undefined, "a null section is rejected");

const partial = normalizeXiaoSettings({ intensity: "immersive", enabled: false });
equal(partial.intensity, "immersive", "a present field is honoured");
equal(partial.enabled, false, "a present boolean is honoured");
equal(partial.showHero, DEFAULT_XIAO_SETTINGS.showHero, "missing fields fall back to defaults");

// An older profile without newly introduced fields must keep working.
const legacyShape = { enabled: true, intensity: "minimal" };
equal(Object.keys(normalizeXiaoSettings(legacyShape)).length, Object.keys(XIAO_SETTING_DEFINITIONS).length,
	"every defined field is produced for a legacy section");

equal(normalizeXiaoSettings({ intensity: "chaotic" }), undefined, "an unknown choice value is rejected");
equal(normalizeXiaoSettings({ companionPosition: { x: 400, y: 10 } }), undefined, "an out-of-range position is rejected");
equal(normalizeXiaoSettings({ companionPosition: { x: 40, y: 60 } }).companionPosition, { x: 40, y: 60 },
	"a valid position survives decoding");

check(isXiaoSettingValue(XIAO_SETTING_DEFINITIONS.enabled, true), "boolean validator accepts booleans");
check(!isXiaoSettingValue(XIAO_SETTING_DEFINITIONS.enabled, "true"), "boolean validator rejects strings");
check(isXiaoSettingValue(XIAO_SETTING_DEFINITIONS.companionSize, "lg"), "choice validator accepts known options");

// Decoding must never hand out a shared mutable default object.
const first = normalizeXiaoSettings({});
first.companionPosition.x = 1;
equal(normalizeXiaoSettings({}).companionPosition.x, 92, "defaults are cloned, not shared");

// --- presets ----------------------------------------------------------------
equal(XIAO_VISUAL_PRESETS.minimal.intensity, "minimal", "the minimal preset sets its intensity");
equal(XIAO_VISUAL_PRESETS.immersive.heroParallax, true, "the immersive preset enables welcome parallax");
equal(XIAO_VISUAL_PRESETS.balanced.ambientMotion, true, "the balanced preset keeps ambience on");
check(!("enabled" in XIAO_VISUAL_PRESETS.balanced), "presets must not toggle the master switch");

// --- serialized writes ------------------------------------------------------
function fakeScope({ failOn = [] } = {}) {
	const value = { ...DEFAULT_XIAO_SETTINGS };
	const calls = [];
	return {
		calls,
		value,
		async mutate(operations) {
			for (const operation of operations) {
				calls.push({ path: operation.path[0], value: operation.value });
				if (failOn.includes(operation.path[0])) return false;
				value[operation.path[0]] = operation.value;
			}
			return true;
		}
	};
}

const scope = fakeScope();
let order = [];
const slow = writeXiaoSettings(scope, { intensity: "immersive" }, DEFAULT_XIAO_SETTINGS).then(() => order.push("first"));
const fast = writeXiaoSettings(scope, { intensity: "minimal" }, DEFAULT_XIAO_SETTINGS).then(() => order.push("second"));
await Promise.all([slow, fast]);
await drainXiaoSettingsWrites();
equal(order, ["first", "second"], "concurrent adjustments are serialized in call order");
equal(scope.value.intensity, "minimal", "the last user action wins");

const failing = fakeScope({ failOn: ["ambientMotion"] });
let failed = null;
try {
	await writeXiaoSettings(failing, { ambientMotion: false }, DEFAULT_XIAO_SETTINGS);
} catch (error) {
	failed = error;
}
check(failed !== null, "a refused write must reject");
equal(failing.value.ambientMotion, DEFAULT_XIAO_SETTINGS.ambientMotion, "a refused write leaves the previous value in place");

// Legacy field-by-field scopes must roll back accepted fields on a later failure.
const legacyScope = {
	value: { ...DEFAULT_XIAO_SETTINGS },
	async set(field, next) {
		if (field === "showOrnament" && next === false) return false;
		this.value[field] = next;
		return true;
	}
};
let legacyFailure = null;
try {
	await writeXiaoSettings(legacyScope, { showHero: false, showOrnament: false }, DEFAULT_XIAO_SETTINGS);
} catch (error) {
	legacyFailure = error;
}
check(legacyFailure !== null, "a legacy partial failure must reject");
equal(legacyScope.value.showHero, true, "a legacy partial failure rolls the accepted field back");

finish("settings");
