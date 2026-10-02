import { useEffect, useRef, useState } from "react";
import {
	XIAO_REDUCED_TRANSITION_MS,
	XIAO_TRANSITION_MS,
	detectXiaoHero,
	stableXiaoPagePhase,
	transitionXiaoPagePhase
} from "./phase-model.js";

/**
 * Observe only DSH's own phase marker. This is presentation state: it never
 * mutates navigation, sessions, or persisted settings, and it can be interrupted
 * mid-transition without leaving a stuck stage.
 */
export function useXiaoPagePhase() {
	const [phase, setPhase] = useState("conversation");
	const phaseRef = useRef("conversation");
	const heroRef = useRef(false);
	const initialized = useRef(false);
	const timer = useRef(null);
	const frame = useRef(null);

	useEffect(() => {
		if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
		const reducedMotion = typeof window !== "undefined"
			? window.matchMedia?.("(prefers-reduced-motion: reduce)")
			: undefined;

		const publish = next => {
			if (phaseRef.current === next) return;
			phaseRef.current = next;
			setPhase(next);
			if (document.body) document.body.dataset.xiaoPagePhase = next;
		};
		const settle = hero => {
			if (timer.current !== null) clearTimeout(timer.current);
			const delay = reducedMotion?.matches ? XIAO_REDUCED_TRANSITION_MS : XIAO_TRANSITION_MS;
			timer.current = setTimeout(() => {
				publish(stableXiaoPagePhase(hero));
				timer.current = null;
			}, delay);
		};
		const sync = () => {
			frame.current = null;
			const hero = detectXiaoHero(document);
			if (!initialized.current) {
				initialized.current = true;
				heroRef.current = hero;
				if (!hero) {
					publish("conversation");
					return;
				}
			} else if (hero === heroRef.current) {
				return;
			} else {
				heroRef.current = hero;
			}
			publish(transitionXiaoPagePhase(hero));
			settle(hero);
		};
		const scheduleSync = () => {
			if (frame.current !== null) return;
			frame.current = requestAnimationFrame(sync);
		};

		const observer = new MutationObserver(scheduleSync);
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-phase"],
			childList: true,
			subtree: true
		});
		scheduleSync();

		return () => {
			observer.disconnect();
			if (frame.current !== null) cancelAnimationFrame(frame.current);
			if (timer.current !== null) clearTimeout(timer.current);
			if (document.body?.dataset.xiaoPagePhase === phaseRef.current) {
				delete document.body.dataset.xiaoPagePhase;
			}
		};
	}, []);

	return phase;
}
