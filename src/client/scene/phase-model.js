/** Welcome/conversation phase model for the continuous illustration transition. */
export const XIAO_HERO_SELECTOR = "[data-phase='hero']";
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
