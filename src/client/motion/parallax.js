import { useEffect } from "react";
import { xiaoParallaxOffset } from "./parallax-model.js";

/**
 * Bounded, opt-in welcome-page parallax.
 *
 * It only runs when the caller says the scene is settled and immersive, and it
 * publishes two custom properties instead of touching layout. Stopping it
 * removes every listener and both properties.
 */
export function useXiaoParallax(overlayRef, enabled) {
	useEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay || !enabled || typeof window === "undefined" || typeof document === "undefined") return;
		const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		let rect = overlay.getBoundingClientRect();
		let frame = null;
		let next = { x: 0, y: 0 };
		const publish = ({ x, y }) => {
			overlay.style.setProperty("--xiao-parallax-x", `${x}px`);
			overlay.style.setProperty("--xiao-parallax-y", `${y}px`);
		};
		const reset = () => {
			if (frame !== null) cancelAnimationFrame(frame);
			frame = null;
			next = { x: 0, y: 0 };
			publish(next);
		};
		const move = event => {
			if (document.visibilityState !== "visible" || reducedMotion?.matches) return;
			next = xiaoParallaxOffset(event.clientX, event.clientY, rect);
			if (frame !== null) return;
			frame = requestAnimationFrame(() => { frame = null; if (overlay.isConnected) publish(next); });
		};
		const resize = () => { rect = overlay.getBoundingClientRect(); reset(); };
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
		observer?.observe(overlay);
		const visibility = () => { if (document.visibilityState !== "hidden") return; reset(); };
		window.addEventListener("pointermove", move, { passive: true });
		window.addEventListener("resize", resize);
		window.addEventListener("blur", reset);
		document.addEventListener("visibilitychange", visibility);
		reducedMotion?.addEventListener?.("change", reset);
		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("resize", resize);
			window.removeEventListener("blur", reset);
			document.removeEventListener("visibilitychange", visibility);
			reducedMotion?.removeEventListener?.("change", reset);
			observer?.disconnect();
			reset();
			overlay.style.removeProperty("--xiao-parallax-x");
			overlay.style.removeProperty("--xiao-parallax-y");
		};
	}, [overlayRef, enabled]);
}
