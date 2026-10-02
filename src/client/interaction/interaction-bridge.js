/**
 * Host interaction bridge.
 *
 * Decorative feedback must run after DSH has handled the interaction itself, so
 * every mutation is deferred to a macrotask and nothing is captured in the
 * capture phase. Only presentation attributes are written: no DSH state is read
 * or changed, and removing the plugin removes every listener and attribute.
 */
export const XIAO_CLICK_RIPPLE_EVENT = "xiao:click-ripple";

const TEXT_INPUT_SELECTOR = "textarea, input[type='text'], input[type='search'], [contenteditable='true'], [role='textbox']";
const ACTION_SELECTOR = "button, [role='button'], a[href], summary";
const PRESS_HOLD_MS = 190;
const NAV_PULSE_MS = 280;

function elementFrom(target) {
	return target instanceof Element ? target : target?.parentElement ?? null;
}

export function getTextInput(target) {
	return elementFrom(target)?.closest(TEXT_INPUT_SELECTOR) ?? null;
}

export function getAction(target) {
	return elementFrom(target)?.closest(ACTION_SELECTOR) ?? null;
}

export function shouldQueueRipple(pointer, clickDetail) {
	return pointer !== null && clickDetail > 0;
}

export function isSelectedNavigationNode(node) {
	if (node?.getAttribute?.("role") !== "treeitem" || node.getAttribute("aria-selected") !== "true") return false;
	const rowKey = node.getAttribute("data-row-key");
	if (rowKey !== null) return rowKey.startsWith("session:");
	const treeLabel = node.closest?.('[role="tree"]')?.getAttribute("aria-label");
	return treeLabel === "会话" || treeLabel === "Sessions";
}

export function installInteractionBridge() {
	if (typeof document === "undefined") return () => {};
	let focusedInput = null;
	let pendingPointer = null;
	const pressTimers = new WeakMap();
	const navigationTimers = new Map();
	let navigationPulse = 0;

	const setFocused = input => {
		if (focusedInput && focusedInput !== input) delete focusedInput.dataset.xiaoFocus;
		focusedInput = input;
		if (input) input.dataset.xiaoFocus = "true";
	};
	const focusIn = event => setFocused(getTextInput(event.target));
	const focusOut = event => {
		const input = getTextInput(event.target);
		if (!input) return;
		queueMicrotask(() => { if (!getTextInput(document.activeElement)) setFocused(null); });
	};
	const pulseAction = action => {
		if (!action?.isConnected || action.closest(".xiao-overlay")) return;
		action.dataset.xiaoPressed = "true";
		const previous = pressTimers.get(action);
		if (previous) clearTimeout(previous);
		pressTimers.set(action, setTimeout(() => {
			delete action.dataset.xiaoPressed;
			pressTimers.delete(action);
		}, PRESS_HOLD_MS));
	};
	const pointerDown = event => {
		pendingPointer = event.button === 0 && event.pointerType !== "touch"
			? { clientX: event.clientX, clientY: event.clientY }
			: null;
	};
	const pointerCancel = () => { pendingPointer = null; };
	const click = event => {
		const action = getAction(event.target);
		const pointer = pendingPointer;
		const queueRipple = Boolean(action) && shouldQueueRipple(pointer, event.detail);
		pendingPointer = null;
		// DSH owns workspace, menu and session actions. Decoration runs afterwards
		// so React can finish switching views before we touch the DOM.
		setTimeout(() => {
			pulseAction(action);
			if (queueRipple) {
				document.dispatchEvent(new CustomEvent(XIAO_CLICK_RIPPLE_EVENT, { detail: pointer }));
			}
		}, 0);
	};
	const selectedNavigation = new MutationObserver(records => {
		if (document.visibilityState !== "visible") return;
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
		for (const record of records) {
			const item = record.target;
			if (!isSelectedNavigationNode(item)) continue;
			const generation = String(++navigationPulse);
			item.dataset.xiaoNavPulse = generation;
			const previous = navigationTimers.get(item);
			if (previous !== undefined) clearTimeout(previous);
			navigationTimers.set(item, setTimeout(() => {
				if (item.dataset.xiaoNavPulse === generation) delete item.dataset.xiaoNavPulse;
				navigationTimers.delete(item);
			}, NAV_PULSE_MS));
		}
	});
	selectedNavigation.observe(document.body, { attributes: true, attributeFilter: ["aria-selected"], subtree: true });
	document.addEventListener("focusin", focusIn, true);
	document.addEventListener("focusout", focusOut, true);
	document.addEventListener("pointerdown", pointerDown, true);
	document.addEventListener("pointercancel", pointerCancel, true);
	document.addEventListener("click", click);
	return () => {
		selectedNavigation.disconnect();
		for (const [item, timer] of navigationTimers) {
			clearTimeout(timer);
			delete item.dataset.xiaoNavPulse;
		}
		navigationTimers.clear();
		setFocused(null);
		document.removeEventListener("focusin", focusIn, true);
		document.removeEventListener("focusout", focusOut, true);
		document.removeEventListener("pointerdown", pointerDown, true);
		document.removeEventListener("pointercancel", pointerCancel, true);
		document.removeEventListener("click", click);
	};
}
