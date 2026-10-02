/**
 * Ambient particle model.
 *
 * Counts are hard-capped per intensity, convergence halves them instead of
 * removing the layer, and every particle's motion is derived from its index so
 * rendering is deterministic and testable.
 */
export const XIAO_PARTICLE_MAX = Object.freeze({ minimal: 6, balanced: 18, immersive: 28 });

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** How many motes this configuration is allowed to render. */
export function xiaoParticleCount(intensity, ambientMotion = true, converged = false) {
	if (!ambientMotion) return 0;
	const max = XIAO_PARTICLE_MAX[intensity] ?? XIAO_PARTICLE_MAX.balanced;
	const base = intensity === "minimal" ? Math.min(6, max) : max;
	const value = converged ? Math.floor(base / 2) : base;
	return clamp(value, 0, XIAO_PARTICLE_MAX.immersive);
}

/**
 * Per-mote presentation values, expressed as CSS custom properties. The values
 * keep every mote inside the viewport and give it a slow, non-synchronised loop.
 */
export function xiaoParticleStyle(index, count) {
	const spread = Math.max(1, count);
	const golden = 0.61803398875;
	const left = ((index * golden) % 1) * 100;
	const top = 8 + ((index * 0.377 + 0.13) % 1) * 78;
	const size = 2 + (index % 3);
	const duration = 14 + ((index * 5) % 13);
	const delay = -((index * 3.7) % duration);
	const drift = (index % 2 === 0 ? 1 : -1) * (10 + (index % 5) * 6);
	return {
		"--xiao-mote-delay": `${delay.toFixed(2)}s`,
		"--xiao-mote-drift": `${drift}px`,
		"--xiao-mote-duration": `${duration}s`,
		"--xiao-mote-left": `${left.toFixed(2)}%`,
		"--xiao-mote-opacity": `${(0.18 + ((index * 0.19) % 0.4)).toFixed(2)}`,
		"--xiao-mote-size": `${size}px`,
		"--xiao-mote-top": `${top.toFixed(2)}%`,
		"--xiao-mote-spread": String(spread)
	};
}

/** Indices for the motes that should currently exist. */
export function xiaoParticleIndices(intensity, ambientMotion = true, converged = false) {
	return Array.from({ length: xiaoParticleCount(intensity, ambientMotion, converged) }, (_, index) => index);
}
