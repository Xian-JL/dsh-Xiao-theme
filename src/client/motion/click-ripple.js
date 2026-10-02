/**
 * Click wind-trace pool.
 *
 * A fixed pool of hidden nodes is animated with the Web Animations API, so a
 * burst never allocates DOM during a burst and can never overlap itself. The
 * whole effect stays inside a bounded circle and is pointer-transparent.
 */
export const XIAO_RIPPLE_POOL_SIZE = 6;
export const XIAO_RIPPLE_FRAGMENT_COUNT = 8;
export const XIAO_RIPPLE_DURATION_MS = 260;
export const XIAO_RIPPLE_RADIUS_PX = 246;

/** Deterministic per-fragment motion: no timers, no randomness. */
export function rippleFragmentMotion(index, count = XIAO_RIPPLE_FRAGMENT_COUNT) {
	const step = 360 / Math.max(1, count);
	return {
		angle: index * step + (index % 2 === 0 ? 6 : -8),
		distance: 60 + (index % 3) * 18,
		delay: (index % 4) * 8
	};
}

export function ripplePoolSlot(sequence, poolSize = XIAO_RIPPLE_POOL_SIZE) {
	if (!Number.isFinite(sequence) || poolSize <= 0) return 0;
	return ((sequence % poolSize) + poolSize) % poolSize;
}

/** Retire a pooled burst before cancelling fills, so cancellation cannot expose idle artwork. */
export function clearWindRipple(node) {
	if (!node) return;
	node.hidden = true;
	delete node.dataset.generation;
	for (const animation of node.getAnimations?.({ subtree: true }) ?? []) animation.cancel();
}

/** Play one burst inside a pooled node. Returns false when the node is unusable. */
export function playWindRipple(node, point, generation) {
	if (!node || typeof node.querySelector !== "function") return false;
	if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
	clearWindRipple(node);
	node.hidden = false;
	node.dataset.generation = String(generation);
	node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;

	const animate = (selector, keyframes, options) => node.querySelector(selector)?.animate(keyframes, {
		duration: XIAO_RIPPLE_DURATION_MS,
		easing: "cubic-bezier(.16,.72,.24,1)",
		fill: "both",
		...options
	});

	animate(".xiao-wind-ripple__core", [
		{ opacity: 0, transform: "rotate(45deg) scale(.24)" },
		{ opacity: 1, transform: "rotate(45deg) scale(1.1)", offset: .3 },
		{ opacity: .85, transform: "rotate(45deg) scale(.74)", offset: .66 },
		{ opacity: 0, transform: "rotate(45deg) scale(.2)" }
	]);
	animate(".xiao-wind-ripple__ring", [
		{ opacity: 0, transform: "scale(.28)" },
		{ opacity: .9, offset: .32 },
		{ opacity: 0, transform: "scale(1)" }
	]);
	animate(".xiao-wind-ripple__arc--one", [
		{ opacity: 0, transform: "rotate(-24deg) translateX(-6px) scaleX(.4)" },
		{ opacity: .95, offset: .36 },
		{ opacity: 0, transform: "rotate(-24deg) translateX(9px) scaleX(1)" }
	], { duration: 245, delay: 18 });
	animate(".xiao-wind-ripple__arc--two", [
		{ opacity: 0, transform: "rotate(148deg) translateX(6px) scaleX(.4)" },
		{ opacity: .8, offset: .36 },
		{ opacity: 0, transform: "rotate(148deg) translateX(-8px) scaleX(1)" }
	], { duration: 250, delay: 26 });

	let last;
	const fragments = node.querySelectorAll(".xiao-wind-ripple__fragment");
	fragments.forEach(fragment => {
		const angle = Number(fragment.dataset.angle);
		const distance = Number(fragment.dataset.distance);
		const delay = Number(fragment.dataset.delay);
		last = fragment.animate([
			{ opacity: 0, transform: `rotate(${angle}deg) translateX(6px) rotate(45deg) scale(.5)` },
			{ opacity: .95, offset: .26 },
			{ opacity: 0, transform: `rotate(${angle}deg) translateX(${distance}px) rotate(45deg) scale(.16)` }
		], { delay, duration: XIAO_RIPPLE_DURATION_MS, easing: "cubic-bezier(.16,.72,.24,1)", fill: "both" });
	});
	if (last) {
		last.onfinish = () => {
			if (node.dataset.generation === String(generation)) node.hidden = true;
		};
	} else {
		const fallback = node.querySelector(".xiao-wind-ripple__ring")?.getAnimations?.()?.[0];
		if (fallback) fallback.onfinish = () => { node.hidden = true; };
	}
	return true;
}

/** Convert a client point into overlay-local coordinates, rejecting outliers. */
export function toOverlayPoint(clientX, clientY, rect) {
	if (!rect || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
	const x = clientX - rect.left;
	const y = clientY - rect.top;
	if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
	return { x, y };
}
