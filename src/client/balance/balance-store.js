import { isBelowCnyThreshold } from "./policy.js";

/**
 * Client-side balance cache.
 *
 * Every request carries the credential generation it was issued for; a late
 * answer from a replaced key is dropped instead of overwriting the current
 * account. Automatic polling, window focus and manual refreshes all reuse the
 * same guarded path, and the Host applies the real rate limits.
 */
const IDLE = Object.freeze({ status: "loading", stale: false, refreshing: false });
const CLIENT_REQUEST_TIMEOUT_MS = 15_000;

let snapshot = IDLE;
let request;
let requestController;
let pollTimer;
let consumers = 0;
let credentialGeneration = 0;
let sequence = 0;
const listeners = new Set();

function publish(next) {
	snapshot = Object.freeze(next);
	for (const listener of listeners) listener(snapshot);
}

export function getBalanceSnapshot() { return snapshot; }
export function subscribeBalance(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function decorate(value) {
	return { ...value, refreshing: false, overheated: isBelowCnyThreshold(value) };
}

export async function refreshBalance({ force = false } = {}) {
	if (request !== undefined && !requestController?.signal.aborted) return request;
	const generation = credentialGeneration;
	const ticket = ++sequence;
	const controller = new AbortController();
	requestController = controller;
	const timeout = setTimeout(() => controller.abort(), CLIENT_REQUEST_TIMEOUT_MS);
	const pending = fetch(`/api/xiao-balance${force ? "?force=1" : ""}`, {
		credentials: "same-origin",
		headers: { accept: "application/json" },
		signal: controller.signal
	}).then(async response => {
		if (!response.ok) throw new Error(`xiao balance endpoint ${response.status}`);
		const next = await response.json();
		// Only the newest answer for the current credential may be published.
		if (generation === credentialGeneration && ticket === sequence) publish(decorate(next));
		return next;
	}).catch(() => {
		if (generation === credentialGeneration && ticket === sequence) {
			publish({
				...snapshot,
				status: snapshot.totalBalance === undefined ? "unavailable" : snapshot.status,
				stale: true,
				refreshing: false
			});
		}
		return snapshot;
	});
	const tracked = pending.finally(() => {
		clearTimeout(timeout);
		if (request === tracked) { request = undefined; requestController = undefined; }
	});
	request = tracked;
	return tracked;
}

/** Called when the official DeepSeek credential form changes. */
export async function refreshBalanceForCredentialChange() {
	credentialGeneration += 1;
	sequence += 1;
	requestController?.abort();
	publish({ status: "loading", stale: false, refreshing: false });
	// Do not wait for a replaced account's request, even if its transport ignores abort.
	return consumers > 0 ? refreshBalance({ force: true }) : snapshot;
}

function schedulePoll() {
	if (pollTimer !== undefined || consumers === 0) return;
	pollTimer = setInterval(() => {
		if (typeof document === "undefined" || document.visibilityState === "visible") void refreshBalance();
	}, 60_000);
}

function handleVisibility() { if (document.visibilityState === "visible") void refreshBalance(); }
function handleFocus() { void refreshBalance(); }

/** Enable polling only while a component actually displays balance data. */
export function retainBalancePolling() {
	consumers += 1;
	if (consumers === 1) {
		void refreshBalance();
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibility);
			window.addEventListener("focus", handleFocus);
		}
	}
	schedulePoll();
	return () => {
		consumers = Math.max(0, consumers - 1);
		if (consumers !== 0) return;
		if (pollTimer !== undefined) clearInterval(pollTimer);
		pollTimer = undefined;
		sequence += 1;
		requestController?.abort();
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("focus", handleFocus);
		}
	};
}

/** Test seam. */
export function resetBalanceStore() {
	requestController?.abort();
	snapshot = IDLE;
	request = undefined;
	requestController = undefined;
	credentialGeneration += 1;
	sequence += 1;
}
