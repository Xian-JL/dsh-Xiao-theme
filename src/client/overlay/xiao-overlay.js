import { createElement as h, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_XIAO_SETTINGS } from "../../shared/settings.js";
import { XIAO_CELEBRATION_DATA_URI, XIAO_COMPANION_DATA_URI, XIAO_NUO_MASK_DATA_URI, XIAO_STANDING_DATA_URI } from "../assets.generated.js";
import { useXiaoSettings } from "../hooks/use-xiao-settings.js";
import { getXiaoThemeTokens, XIAO_THEME_SOURCE } from "../theme/tokens.js";
import { getXiaoSessionState, subscribeXiaoSessionState } from "../session/status-store.js";
import { isTerminalXiaoState, selectMainViewSessionId, XIAO_TERMINAL_HOLD_MS } from "../session/compat.js";
import { refreshBalance } from "../balance/balance-store.js";
import { useBalance } from "../balance/use-balance.js";
import { XIAO_CLICK_RIPPLE_EVENT } from "../interaction/interaction-bridge.js";
import { XiaoStatusPanel } from "../companion/status-panel.js";
import {
	XIAO_COMPANION_DOCK,
	clampCompanionPercent,
	companionPixelSize,
	computeDragPosition,
	displayCompanionPosition,
	isDragGesture,
	nudgeCompanionPosition,
	presentedCompanionFlip,
	presentedCompanionPosition,
	resolveCompanionPanelPlacement
} from "../companion/position.js";
import { useXiaoPagePhase } from "../scene/hero-phase.js";
import { isXiaoHeroSettled, isXiaoHeroTarget } from "../scene/phase-model.js";
import { useXiaoActivity } from "../motion/lifecycle.js";
import { useXiaoParallax } from "../motion/parallax.js";
import { xiaoParticleIndices, xiaoParticleStyle } from "../motion/particles.js";
import {
	XIAO_RIPPLE_FRAGMENT_COUNT,
	XIAO_RIPPLE_POOL_SIZE,
	clearWindRipple,
	playWindRipple,
	rippleFragmentMotion,
	ripplePoolSlot,
	toOverlayPoint
} from "../motion/click-ripple.js";

const FEEDBACK_PRIORITY = ["failed", "stopped", "completed", "ended", "running", "sending", "awaiting-input", "unknown", "idle"];

const FEEDBACK_KEY = {
	"awaiting-input": "feedback.awaiting",
	completed: "feedback.completed",
	ended: "feedback.ended",
	failed: "feedback.failed",
	running: "feedback.running",
	sending: "feedback.sending",
	stopped: "feedback.stopped",
	unknown: "feedback.unknown"
};

function text(t, key, fallback) {
	return typeof t === "function" ? t(key) : fallback;
}

/** Mirror the session store into local state with a display-level decay. */
function useSessionFeedback(sessionId) {
	const [state, setState] = useState(() => getXiaoSessionState(sessionId));
	const timer = useRef(null);
	useEffect(() => {
		setState(getXiaoSessionState(sessionId));
		return subscribeXiaoSessionState(changed => {
			if (sessionId === undefined || changed === sessionId) setState(getXiaoSessionState(sessionId));
		});
	}, [sessionId]);
	useEffect(() => {
		if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
		if (!isTerminalXiaoState(state)) return undefined;
		timer.current = setTimeout(() => {
			timer.current = null;
			setState(current => (current === state ? "idle" : current));
		}, XIAO_TERMINAL_HOLD_MS[state] ?? 0);
		return () => { if (timer.current !== null) clearTimeout(timer.current); };
	}, [state]);
	return state;
}

function useClickRippleLayer(overlayRef, enabled) {
	const layerRef = useRef(null);
	const sequence = useRef(0);
	useEffect(() => {
		if (!enabled || typeof document === "undefined") return undefined;
		const clearPool = () => {
			sequence.current += XIAO_RIPPLE_POOL_SIZE;
			const layer = layerRef.current;
			if (!layer) return;
			for (const node of layer.children) {
				clearWindRipple(node);
			}
		};
		const receive = event => {
			const rect = overlayRef.current?.getBoundingClientRect();
			const point = toOverlayPoint(event.detail?.clientX, event.detail?.clientY, rect);
			if (!point) return;
			const generation = ++sequence.current;
			const node = layerRef.current?.children[ripplePoolSlot(generation, XIAO_RIPPLE_POOL_SIZE)];
			playWindRipple(node, point, generation);
		};
		document.addEventListener(XIAO_CLICK_RIPPLE_EVENT, receive);
		document.addEventListener("visibilitychange", clearPool);
		window.addEventListener("blur", clearPool);
		window.addEventListener("focus", clearPool);
		window.addEventListener("pageshow", clearPool);
		window.addEventListener("pagehide", clearPool);
		return () => {
			document.removeEventListener(XIAO_CLICK_RIPPLE_EVENT, receive);
			document.removeEventListener("visibilitychange", clearPool);
			window.removeEventListener("blur", clearPool);
			window.removeEventListener("focus", clearPool);
			window.removeEventListener("pageshow", clearPool);
			window.removeEventListener("pagehide", clearPool);
			clearPool();
		};
	}, [enabled, overlayRef]);
	return layerRef;
}

/** Apply the Xiao palette for exactly as long as the theme is enabled. */
function useXiaoTheme(theme, enabled) {
	useEffect(() => {
		if (!theme || !enabled) return undefined;
		const dispose = theme.overrideTokens(XIAO_THEME_SOURCE, getXiaoThemeTokens());
		return typeof dispose === "function" ? dispose : undefined;
	}, [theme, enabled]);
}

function useBodyPresentation(value, sessionState, phase) {
	useEffect(() => {
		if (typeof document === "undefined") return undefined;
		const body = document.body;
		const previous = {
			intensity: body.dataset.xiaoIntensity,
			phase: body.dataset.xiaoPhase,
			state: body.dataset.xiaoState,
			theme: body.dataset.xiaoTheme
		};
		body.dataset.xiaoTheme = value.enabled ? "on" : "off";
		body.dataset.xiaoIntensity = value.intensity;
		body.dataset.xiaoPhase = phase;
		body.dataset.xiaoState = sessionState;
		return () => {
			for (const [key, datasetKey] of [["theme", "xiaoTheme"], ["intensity", "xiaoIntensity"], ["phase", "xiaoPhase"], ["state", "xiaoState"]]) {
				if (previous[key] === undefined) delete body.dataset[datasetKey];
				else body.dataset[datasetKey] = previous[key];
			}
		};
	}, [value.enabled, value.intensity, phase, sessionState]);
}

export function XiaoOverlay({ settings, theme, t, useSessions }) {
	const snapshot = useXiaoSettings(settings);
	const value = snapshot.value ?? DEFAULT_XIAO_SETTINGS;
	const writable = snapshot.writable !== false;
	const activity = useXiaoActivity();
	const phase = useXiaoPagePhase();
	const heroTarget = isXiaoHeroTarget(phase);
	const mainSessionId = typeof useSessions === "function" ? useSessions(selectMainViewSessionId) : undefined;
	const rawSessionState = useSessionFeedback(mainSessionId);
	const sessionState = FEEDBACK_PRIORITY.includes(rawSessionState) ? rawSessionState : "idle";
	const balanceEnabled = value.enabled && value.balanceEnabled;
	const balance = useBalance(balanceEnabled);
	const overheated = balance.overheated === true;

	const overlayRef = useRef(null);
	const clusterRef = useRef(null);
	const companionRef = useRef(null);
	const frameRef = useRef(null);
	const pendingPosition = useRef(null);
	const keyboardPosition = useRef(null);
	const dragRef = useRef(null);
	const ignoreClick = useRef(false);
	const reactionTimer = useRef(null);
	const [position, setPosition] = useState(() => displayCompanionPosition(value.companionPosition));
	const [dragging, setDragging] = useState(false);
	const [dockedOverride, setDockedOverride] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [reacting, setReacting] = useState(false);
	const [panelOpen, setPanelOpen] = useState(false);
	const [manualRefreshStatus, setManualRefreshStatus] = useState("idle");
	const [, refreshPanelPlacement] = useState(0);

	const converged = value.convergeWhileRunning && (sessionState === "running" || sessionState === "sending");
	const rippleEnabled = value.enabled && value.clickRipple && activity.visible && !activity.reducedMotion;

	useXiaoTheme(theme, value.enabled);
	useBodyPresentation(value, sessionState, phase);
	useXiaoParallax(overlayRef, Boolean(
		value.enabled && value.heroParallax && value.intensity === "immersive" &&
		isXiaoHeroSettled(phase) && activity.visible && !activity.reducedMotion
	));
	const rippleLayerRef = useClickRippleLayer(overlayRef, rippleEnabled);

	// Follow the stored position whenever the user is not currently dragging it.
	useEffect(() => {
		if (dragRef.current !== null) return;
		setPosition(displayCompanionPosition(value.companionPosition));
	}, [value.companionPosition.x, value.companionPosition.y]);

	// Re-clamp after window, sidebar or zoom changes without writing to settings.
	useEffect(() => {
		if (typeof ResizeObserver === "undefined") return undefined;
		const overlay = overlayRef.current;
		if (!overlay) return undefined;
		let frame = null;
		const reclamp = () => {
			frame = null;
			if (dragRef.current !== null) return;
			const rect = overlay.getBoundingClientRect();
			refreshPanelPlacement(revision => revision + 1);
			setPosition(current => {
				const next = clampCompanionPercent(current, rect, companionPixelSize(value.companionSize));
				return next.x === current.x && next.y === current.y ? current : next;
			});
		};
		const observer = new ResizeObserver(() => {
			if (frame !== null) return;
			frame = requestAnimationFrame(reclamp);
		});
		observer.observe(overlay);
		return () => {
			observer.disconnect();
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [value.companionSize]);

	useEffect(() => {
		if (phase !== "entering-hero") return;
		setPanelOpen(false);
		setDockedOverride(false);
	}, [phase]);

	useEffect(() => () => {
		if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
	}, []);

	// Panel dismissal: Escape restores focus to the trigger, outside pointer closes.
	useEffect(() => {
		if (!panelOpen || typeof document === "undefined") return undefined;
		const onKeyDown = event => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			setPanelOpen(false);
			companionRef.current?.focus();
		};
		const onPointerDown = event => {
			if (!clusterRef.current?.contains(event.target)) setPanelOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown);
		};
	}, [panelOpen]);

	const triggerReaction = useCallback(() => {
		setReacting(false);
		requestAnimationFrame(() => setReacting(true));
		if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
		reactionTimer.current = setTimeout(() => {
			setReacting(false);
			reactionTimer.current = null;
		}, 900);
	}, []);

	const persistPosition = useCallback(next => {
		if (!writable) return;
		settings.set("companionPosition", next)
			.then(accepted => { if (accepted === false) setPosition(displayCompanionPosition(value.companionPosition)); })
			.catch(() => setPosition(displayCompanionPosition(value.companionPosition)));
	}, [settings, value.companionPosition, writable]);

	const flushFrame = () => {
		frameRef.current = null;
		const next = pendingPosition.current;
		pendingPosition.current = null;
		const drag = dragRef.current;
		if (next === null || drag === null || clusterRef.current === null) return;
		const dx = (next.x - drag.startingPosition.x) / 100 * drag.overlayRect.width;
		const dy = (next.y - drag.startingPosition.y) / 100 * drag.overlayRect.height;
		clusterRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
	};
	const schedulePosition = next => {
		pendingPosition.current = next;
		if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushFrame);
	};

	const startDrag = event => {
		if (!writable || !value.showCompanion || event.button !== 0) return;
		const overlay = overlayRef.current;
		if (!overlay || !clusterRef.current) return;
		const overlayRect = overlay.getBoundingClientRect();
		const buttonRect = event.currentTarget.getBoundingClientRect();
		const centerX = buttonRect.left + buttonRect.width / 2;
		const centerY = buttonRect.top + buttonRect.height / 2;
		const docked = heroTarget && !dockedOverride;
		const startingPosition = docked ? { ...XIAO_COMPANION_DOCK } : position;
		if (docked) {
			setPosition(startingPosition);
			setDockedOverride(true);
		}
		dragRef.current = {
			halfHeight: buttonRect.height / 2,
			halfWidth: buttonRect.width / 2,
			moved: false,
			offsetX: event.clientX - centerX,
			offsetY: event.clientY - centerY,
			originClientX: event.clientX,
			originClientY: event.clientY,
			overlayRect,
			pointerId: event.pointerId,
			position: startingPosition,
			startingPosition
		};
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setDragging(true);
	};

	const moveDrag = event => {
		const drag = dragRef.current;
		if (drag === null || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		if (isDragGesture({ clientX: drag.originClientX, clientY: drag.originClientY }, { clientX: event.clientX, clientY: event.clientY })) {
			drag.moved = true;
		}
		const next = computeDragPosition(event.clientX, event.clientY, drag);
		drag.position = next;
		schedulePosition(next);
	};

	const finishDrag = event => {
		const drag = dragRef.current;
		if (drag === null || drag.pointerId !== event.pointerId) return;
		dragRef.current = null;
		if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
		pendingPosition.current = null;
		if (clusterRef.current) clusterRef.current.style.transition = "none";
		setPosition(drag.position);
		if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		setDragging(false);
		// A drag must never be mistaken for a click on the status panel.
		ignoreClick.current = drag.moved;
		if (!drag.moved) return;
		const stored = displayCompanionPosition(value.companionPosition);
		if (drag.position.x !== stored.x || drag.position.y !== stored.y) persistPosition(drag.position);
	};

	useLayoutEffect(() => {
		const cluster = clusterRef.current;
		if (dragging || !cluster || cluster.style.transition !== "none") return;
		cluster.style.transform = "";
		requestAnimationFrame(() => { if (cluster.isConnected) cluster.style.transition = ""; });
	}, [dragging, position]);

	const moveWithKeyboard = event => {
		if (!writable || !value.showCompanion) return;
		if (!(event.key.startsWith("Arrow") || event.key === "Home")) return;
		const overlayRect = overlayRef.current?.getBoundingClientRect();
		const buttonRect = event.currentTarget.getBoundingClientRect();
		const docked = heroTarget && !dockedOverride;
		const current = keyboardPosition.current ?? (docked ? { ...XIAO_COMPANION_DOCK } : position);
		const next = event.key === "Home"
			? displayCompanionPosition(DEFAULT_XIAO_SETTINGS.companionPosition)
			: nudgeCompanionPosition(current, event.key, overlayRect, buttonRect, event.shiftKey);
		if (!next) return;
		event.preventDefault();
		setDockedOverride(true);
		setPosition(next);
		keyboardPosition.current = next;
	};

	const commitKeyboardPosition = () => {
		const next = keyboardPosition.current;
		keyboardPosition.current = null;
		if (next) persistPosition(next);
	};

	const togglePanel = () => {
		if (ignoreClick.current) { ignoreClick.current = false; return; }
		if (!panelOpen && balanceEnabled) {
			setManualRefreshStatus("idle");
			void refreshBalance({ force: true });
		}
		setPanelOpen(open => !open);
		triggerReaction();
	};

	const refreshManually = async () => {
		setManualRefreshStatus("loading");
		const next = await refreshBalance({ force: true });
		setManualRefreshStatus(next.status === "rate-limited" ? "limited"
			: next.status === "unbound" || next.status === "unsupported" ? "idle"
				: next.stale || next.status !== "ready" ? "failed" : "done");
	};

	if (!value.enabled) return null;

	const presentedPosition = presentedCompanionPosition({
		docked: heroTarget,
		dragging,
		override: dockedOverride,
		position
	});
	const presentedFlip = presentedCompanionFlip({
		docked: heroTarget,
		override: dockedOverride,
		flipped: value.companionFlipped
	});
	const panelPlacement = resolveCompanionPanelPlacement(
		presentedPosition,
		overlayRef.current?.getBoundingClientRect(),
		companionPixelSize(value.companionSize)
	);
	const companionState = dragging ? "dragging"
		: sessionState !== "idle" ? sessionState
			: reacting ? "reacting"
				: hovered ? "hover" : "idle";
	const particles = xiaoParticleIndices(value.intensity, value.ambientMotion, converged);
	const ripplePool = Array.from({ length: XIAO_RIPPLE_POOL_SIZE }, (_, slot) => slot);

	const feedbackKey = FEEDBACK_KEY[sessionState] ?? "feedback.unknown";
	const feedbackFallback = sessionState === "idle" ? "" : text(t, "status.hint", "");
	const characterOff = !value.showHero || (value.intensity === "minimal" && phase === "conversation");

	return h("div", {
		className: "xiao-overlay",
		"data-companion": String(value.showCompanion),
		"data-converged": String(converged),
		"data-hidden": String(!activity.visible),
		"data-intensity": value.intensity,
		"data-ornament": String(value.showOrnament),
		"data-overheated": String(overheated),
		"data-page-phase": phase,
		"data-reduced": String(activity.reducedMotion),
		"data-session-state": sessionState,
		ref: overlayRef
	}, [
		h("div", { "aria-hidden": "true", className: "xiao-ripple-layer", key: "ripple", ref: rippleLayerRef },
			ripplePool.map(slot => h("span", { className: "xiao-wind-ripple", hidden: true, key: slot }, [
				h("i", { className: "xiao-wind-ripple__core", key: "core" }),
				h("i", { className: "xiao-wind-ripple__ring", key: "ring" }),
				h("i", { className: "xiao-wind-ripple__arc xiao-wind-ripple__arc--one", key: "arc1" }),
				h("i", { className: "xiao-wind-ripple__arc xiao-wind-ripple__arc--two", key: "arc2" }),
				...Array.from({ length: XIAO_RIPPLE_FRAGMENT_COUNT }, (_, index) => {
					const motion = rippleFragmentMotion(index);
					return h("i", {
						className: "xiao-wind-ripple__fragment",
						"data-angle": String(motion.angle),
						"data-delay": String(motion.delay),
						"data-distance": String(motion.distance),
						key: `f${index}`
					});
				})
			]))),

		h("span", {
			"aria-atomic": "true",
			"aria-live": "polite",
			className: "xiao-interaction-status",
			key: "status",
			role: "status"
		}, sessionState === "idle" ? "" : text(t, feedbackKey, feedbackFallback)),

		heroTarget ? h("h1", { className: "xiao-sr-only", key: "sr-title" },
			`${text(t, "hero.line1", "")}${text(t, "hero.line2", "")}`) : null,

		h("section", { "aria-hidden": "true", className: "xiao-welcome", key: "welcome" }, [
			h("span", { className: "xiao-welcome__eyebrow", key: "eyebrow" }, text(t, "hero.kicker", "◆ XIAO")),
			h("h1", { key: "title" }, [
				text(t, "hero.line1", "静守青霄，"),
				h("br", { key: "br" }),
				text(t, "hero.line2", "待风起时。")
			]),
			h("p", { key: "copy" }, [
				text(t, "hero.copy1", ""),
				h("br", { key: "br" }),
				text(t, "hero.copy2", "")
			])
		]),

		h("div", { "aria-hidden": "true", className: "xiao-decoration", key: "decoration" }, [
			h("div", { className: "xiao-atmosphere", key: "atmosphere" }),
			h("div", { className: "xiao-glow xiao-glow--jade", key: "glow-jade" }),
			h("div", { className: "xiao-glow xiao-glow--violet", key: "glow-violet" }),
			value.showOrnament ? h("img", {
				alt: "",
				className: "xiao-ornament xiao-ornament--nuo",
				key: "nuo",
				src: XIAO_NUO_MASK_DATA_URI
			}) : null,
			value.showOrnament ? h("div", { className: "xiao-ornament--cloud", key: "cloud" }) : null,
			h("div", { className: "xiao-wind-lines", key: "wind" }, [
				h("span", { className: "xiao-wind-lines__line xiao-wind-lines__line--one", key: "one" }),
				h("span", { className: "xiao-wind-lines__line xiao-wind-lines__line--two", key: "two" }),
				h("span", { className: "xiao-wind-lines__line xiao-wind-lines__line--three", key: "three" })
			]),
			h("div", { className: "xiao-particles", "data-count": String(particles.length), key: "particles" },
				particles.map(index => h("span", {
					className: "xiao-mote",
					key: index,
					style: xiaoParticleStyle(index, particles.length)
				}))),
			characterOff ? null : h("div", {
				className: "xiao-hero-frame",
				key: "hero-frame",
				"data-position": value.characterPosition,
				"data-opacity": value.characterOpacity,
				"data-variant": value.characterVariant,
				"data-animate": String(value.animateCharacter)
			}, h("img", {
				alt: "",
				className: "xiao-hero",
				src: value.characterVariant === "celebration" ? XIAO_CELEBRATION_DATA_URI : XIAO_STANDING_DATA_URI
			}))
		]),

		value.showCompanion ? h("div", {
			className: "xiao-companion-cluster",
			"data-bubble-side": panelPlacement.horizontal,
			"data-bubble-vertical": panelPlacement.vertical,
			"data-dragging": String(dragging),
			"data-open": String(panelOpen),
			"data-state": companionState,
			key: "companion",
			ref: clusterRef,
			style: {
				"--xiao-companion-flip": presentedFlip ? -1 : 1,
				"--xiao-companion-size": `${companionPixelSize(value.companionSize)}px`,
				left: `${presentedPosition.x}%`,
				top: `${presentedPosition.y}%`
			}
		}, [
			h("button", {
				"aria-controls": "xiao-companion-panel",
				"aria-describedby": "xiao-companion-help",
				"aria-expanded": panelOpen,
				"aria-haspopup": "dialog",
				"aria-label": text(t, "balance.open", "Open the Xiao companion panel"),
				className: "xiao-companion",
				"data-animated": String(value.animatedCompanion && !activity.reducedMotion),
				"data-draggable": String(writable),
				"data-size": value.companionSize,
				"data-state": companionState,
				key: "button",
				onBlur: commitKeyboardPosition,
				onClick: togglePanel,
				onKeyDown: moveWithKeyboard,
				onKeyUp: event => { if (event.key.startsWith("Arrow") || event.key === "Home") commitKeyboardPosition(); },
				onPointerCancel: finishDrag,
				onPointerDown: startDrag,
				onPointerEnter: () => setHovered(true),
				onPointerLeave: () => setHovered(false),
				onPointerMove: moveDrag,
				onPointerUp: finishDrag,
				ref: companionRef,
				type: "button"
			}, [
				h("span", { className: "xiao-companion__ring", key: "ring" }),
				h("span", { className: "xiao-companion__spark xiao-companion__spark--one", key: "spark1" }),
				h("span", { className: "xiao-companion__spark xiao-companion__spark--two", key: "spark2" }),
				h("span", { className: "xiao-companion__bubble", key: "bubble" },
					sessionState === "sending" ? "↗"
						: sessionState === "running" ? "…"
							: sessionState === "completed" ? "✓"
								: sessionState === "ended" ? "•"
									: sessionState === "failed" ? "!"
										: sessionState === "stopped" ? "■"
											: sessionState === "awaiting-input" ? "?" : ""),
				h("span", { className: "xiao-companion__sprite", key: "sprite" },
					h("img", { alt: "", src: XIAO_COMPANION_DATA_URI }))
			]),
			h("span", { className: "xiao-sr-only", id: "xiao-companion-help", key: "help" },
				text(t, "companion.keyboard", "")),
			h(XiaoStatusPanel, {
				balance,
				balanceEnabled,
				key: "panel",
				manualRefreshStatus,
				onClose: () => { setPanelOpen(false); companionRef.current?.focus(); },
				onRefresh: refreshManually,
				open: panelOpen,
				sessionState,
				t
			})
		]) : null
	]);
}
