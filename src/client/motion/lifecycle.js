import { useEffect, useState } from "react";

/**
 * Page activity gate.
 *
 * Every dynamic layer asks this hook before scheduling work, so hiding the page
 * pauses non-essential motion, and turning on the system "reduce motion" setting
 * degrades the decoration immediately without rewriting the user's own switches.
 */
export function useXiaoActivity() {
	const [activity, setActivity] = useState(() => ({
		reducedMotion: typeof window !== "undefined"
			? Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
			: false,
		visible: typeof document === "undefined" ? true : document.visibilityState !== "hidden"
	}));

	useEffect(() => {
		if (typeof window === "undefined") return;
		const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		const sync = () => setActivity(previous => {
			const visible = document.visibilityState !== "hidden";
			const reducedMotion = Boolean(query?.matches);
			return previous.visible === visible && previous.reducedMotion === reducedMotion
				? previous
				: { reducedMotion, visible };
		});
		document.addEventListener("visibilitychange", sync);
		query?.addEventListener?.("change", sync);
		sync();
		return () => {
			document.removeEventListener("visibilitychange", sync);
			query?.removeEventListener?.("change", sync);
		};
	}, []);

	return activity;
}

/** Publish activity onto an element so CSS can pause whole subtrees at once. */
export function useActivityPresentation(ref, { visible, reducedMotion }) {
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		node.dataset.xiaoHidden = String(!visible);
		node.dataset.xiaoReduced = String(reducedMotion);
		return () => {
			delete node.dataset.xiaoHidden;
			delete node.dataset.xiaoReduced;
		};
	}, [ref, visible, reducedMotion]);
}
