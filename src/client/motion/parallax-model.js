/** Maximum welcome-page parallax displacement, in CSS pixels. */
export const XIAO_PARALLAX_MAX_PX = 3.5;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Map a pointer position to a bounded scene offset. The result never exceeds
 * XIAO_PARALLAX_MAX_PX in either axis and stays at zero for small viewports.
 */
export function xiaoParallaxOffset(clientX, clientY, rect, max = XIAO_PARALLAX_MAX_PX) {
	if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
	if (rect.width < 900) return { x: 0, y: 0 };
	const relativeX = (clientX - rect.left) / rect.width - 0.5;
	const relativeY = (clientY - rect.top) / rect.height - 0.5;
	return {
		x: Number(clamp(relativeX * 2 * max, -max, max).toFixed(2)),
		y: Number(clamp(relativeY * 2 * max, -max, max).toFixed(2))
	};
}
