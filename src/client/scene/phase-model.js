/** Welcome/conversation phase model for the continuous illustration transition. */
export const XIAO_HERO_SELECTOR = "[data-phase='hero']";
export const XIAO_HOST_PHASE_SELECTOR = "[data-phase='hero'],[data-phase='active'],[data-phase='settling']";

/** Streaming text and theme-owned decoration do not require a document scan. */
export function xiaoPhaseMutationRelevant(records) {
	return records.some(record => {
		if (record.type === "attributes") return record.attributeName === "data-phase";
		if (record.type !== "childList") return false;
		return [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 &&
			(node.matches?.(XIAO_HOST_PHASE_SELECTOR) || node.querySelector?.(XIAO_HOST_PHASE_SELECTOR)));
	});
}
export const XIAO_TRANSITION_MS = 700;
export const XIAO_REDUCED_TRANSITION_MS = 80;

export function detectXiaoHero(root) {
	return Boolean(root?.querySelector?.(XIAO_HERO_SELECTOR));
}

export function stableXiaoPagePhase(hero) {
	return hero ? "hero" : "conversation";
}

export function transitionXiaoPagePhase(hero) {
	return hero ? "entering-hero" : "leaving-hero";
}

/** True whenever the welcome composition should be on stage. */
export function isXiaoHeroTarget(phase) {
	return phase === "entering-hero" || phase === "hero";
}

/** Only a settled welcome page may run the optional parallax. */
export function isXiaoHeroSettled(phase) {
	return phase === "hero";
}
