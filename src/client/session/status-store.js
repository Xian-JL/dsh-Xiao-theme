/** Session-keyed companion feedback store. Background sessions stay isolated. */
const states = new Map();
const listeners = new Set();

export function getXiaoSessionState(sessionId) {
	if (sessionId === undefined || sessionId === null) return "idle";
	const entry = states.get(sessionId);
	if (!entry) return "idle";
	if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
		states.delete(sessionId);
		return "idle";
	}
	return entry.state;
}

function notify(sessionId) {
	for (const listener of listeners) listener(sessionId);
}

export function setXiaoSessionState(sessionId, state, options = {}) {
	if (sessionId === undefined || sessionId === null) return;
	const holdMs = Number.isFinite(options.holdMs) ? options.holdMs : 0;
	const expiresAt = holdMs > 0 ? Date.now() + holdMs : undefined;
	const previous = states.get(sessionId);
	if (previous?.state === state && previous?.expiresAt === expiresAt) return;
	states.set(sessionId, { state, expiresAt });
	notify(sessionId);
}

export function clearXiaoSessionState(sessionId) {
	if (sessionId === undefined || sessionId === null) return;
	if (!states.delete(sessionId)) return;
	notify(sessionId);
}

export function subscribeXiaoSessionState(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Test seam: drop every entry and listener count without touching the module. */
export function resetXiaoSessionStore() {
	states.clear();
}
