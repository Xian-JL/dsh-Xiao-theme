/**
 * Shared, dependency-free description of every setting owned by dsh-xiao-theme.
 *
 * The Host derives its schemastery schema from this table and the Client derives
 * its decoder from it, so a single edit keeps both runtime sides in sync.
 */

/** Settings namespace owned by this plugin. Never shared with another theme. */
export const XIAO_SETTINGS_NAMESPACE = "dsh-xiao-theme";

/** How much decoration the interface carries. Light/dark mode stays a DSH concern. */
export const VISUAL_INTENSITIES = Object.freeze(["minimal", "balanced", "immersive"]);
/** Where the standing illustration rests on the conversation page. */
export const CHARACTER_POSITIONS = Object.freeze(["corner", "edge"]);
/** How present the conversation-page illustration is. */
export const CHARACTER_OPACITIES = Object.freeze(["low", "medium", "high"]);
/** Companion footprint. */
export const COMPANION_SIZES = Object.freeze(["sm", "md", "lg"]);

/** Default free position of the companion, in overlay percentages. */
export const XIAO_DEFAULT_COMPANION_POSITION = Object.freeze({ x: 92, y: 86 });

/** Single source of truth for every persisted setting. */
export const XIAO_SETTING_DEFINITIONS = Object.freeze({
	enabled: Object.freeze({ kind: "boolean", default: true }),
	intensity: Object.freeze({ kind: "choice", default: "balanced", options: VISUAL_INTENSITIES }),
	showHero: Object.freeze({ kind: "boolean", default: true }),
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

export const XIAO_SETTING_KEYS = Object.freeze(Object.keys(XIAO_SETTING_DEFINITIONS));

function cloneDefaultValue(value) {
	if (typeof value === "object" && value !== null) return Object.freeze({ ...value });
	return value;
}

export const DEFAULT_XIAO_SETTINGS = Object.freeze(Object.fromEntries(
	Object.entries(XIAO_SETTING_DEFINITIONS).map(([key, definition]) => [key, cloneDefaultValue(definition.default)])
));

/**
 * Named visual presets. They only move intensity-related switches; they never
 * introduce a second light/dark mode.
 */
export const XIAO_VISUAL_PRESETS = Object.freeze({
	minimal: Object.freeze({
		intensity: "minimal", showHero: true, characterOpacity: "low", animateCharacter: false,
		showOrnament: false, ambientMotion: false, clickRipple: true, heroParallax: false
	}),
	balanced: Object.freeze({
		intensity: "balanced", showHero: true, characterOpacity: "medium", animateCharacter: true,
		showOrnament: true, ambientMotion: true, clickRipple: true, heroParallax: false
	}),
	immersive: Object.freeze({
		intensity: "immersive", showHero: true, characterOpacity: "high", animateCharacter: true,
		showOrnament: true, ambientMotion: true, clickRipple: true, heroParallax: true
	})
});

function isFiniteRange(value, min, max) {
	return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** Runtime validation shared by the Host schema and the Client decoder. */
export function isXiaoSettingValue(definition, value) {
	switch (definition.kind) {
		case "boolean": return typeof value === "boolean";
		case "number": return isFiniteRange(value, definition.min, definition.max);
		case "choice": return typeof value === "string" && definition.options.includes(value);
		case "position": return typeof value === "object" && value !== null &&
			isFiniteRange(value.x, definition.min, definition.max) && isFiniteRange(value.y, definition.min, definition.max);
		default: return false;
	}
}

export function cloneXiaoSettingValue(definition, value) {
	if (definition.kind === "position") return { x: value.x, y: value.y };
	return value;
}

/**
 * Build a complete, validated settings object from an unknown section. Missing
 * fields fall back to defaults so an older profile keeps working after an
 * upgrade. Returns undefined only when a present field is genuinely invalid.
 */
export function normalizeXiaoSettings(section) {
	const source = typeof section === "object" && section !== null ? section : {};
	const decoded = {};
	for (const [key, definition] of Object.entries(XIAO_SETTING_DEFINITIONS)) {
		const candidate = source[key] ?? DEFAULT_XIAO_SETTINGS[key];
		if (!isXiaoSettingValue(definition, candidate)) return undefined;
		decoded[key] = cloneXiaoSettingValue(definition, candidate);
	}
	return decoded;
}
