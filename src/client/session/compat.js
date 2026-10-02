/**
 * Translate DSH Session snapshots into the small product vocabulary used by the
 * Xiao companion, and separate "the run stopped" from "the run succeeded".
 *
 * DSH does not guarantee a positive success signal on every generation. A run
 * that simply becomes idle is therefore reported as the neutral state `ended`,
 * never as `completed`.
 */

export const XIAO_SESSION_STATES = Object.freeze([
	"unknown", "idle", "sending", "running",
	"completed", "ended", "failed", "stopped", "awaiting-input"
]);

/** Fields some DSH generations use to describe why a run finished. */
export const COMPLETION_FIELDS = Object.freeze([
	"stopReason", "lastStopReason", "finishReason", "endReason",
	"completionStatus", "lastCompletionStatus", "stop_reason", "finish_reason"
]);

const COMPLETED_VALUES = Object.freeze([
	"stop", "completed", "complete", "success", "succeeded", "finished", "done", "end_turn", "end-turn"
]);

const STOPPED_VALUES = Object.freeze([
	"aborted", "abort", "cancelled", "canceled", "user_stop", "user-stop", "userstop", "stopped", "interrupted"
]);

const AWAITING_FIELDS = Object.freeze([
	"awaitingInput", "awaitingUserInput", "awaiting_input",
	"pendingApproval", "pendingPermission", "pendingToolApproval"
]);

function readErrorField(snapshot) {
	return snapshot.promptError ?? snapshot.openError ?? snapshot.lastAgentError
		?? snapshot.error ?? snapshot.lastError ?? null;
}

/**
 * Read the run's completion reason when DSH exposes one. Returns
 * `{ reason: "completed" | "stopped" | null, source }`.
 */
export function readCompletionSignal(snapshot) {
	if (!snapshot || typeof snapshot !== "object") return { reason: null, source: null };
	for (const field of COMPLETION_FIELDS) {
		const raw = snapshot[field];
		if (typeof raw !== "string" || raw.length === 0) continue;
		const value = raw.toLowerCase();
		if (COMPLETED_VALUES.includes(value)) return { reason: "completed", source: field };
		if (STOPPED_VALUES.includes(value)) return { reason: "stopped", source: field };
	}
	return { reason: null, source: null };
}

/** Does DSH currently report that the run is waiting on the user? */
export function readAwaitingSignal(snapshot) {
	if (!snapshot || typeof snapshot !== "object") return false;
	for (const field of AWAITING_FIELDS) {
		if (snapshot[field] !== undefined && snapshot[field] !== null && snapshot[field] !== false) return true;
	}
	return false;
}

/** Coarse live phase while a run is in progress. */
export function deriveXiaoSessionPhase(snapshot) {
	if (!snapshot) return "unknown";
	if (readErrorField(snapshot)) return "failed";
	if (snapshot.awaitingFirstTurn === true ||
		(Array.isArray(snapshot.pendingSubmissions) && snapshot.pendingSubmissions.length > 0)) {
		return "sending";
	}
	if (snapshot.running === true) return "running";
	if (readAwaitingSignal(snapshot)) return "awaiting-input";
	return "idle";
}

/**
 * Classify the terminal state of a run that just stopped being active.
 *
 * The default is the neutral `ended`: without a positive signal from DSH we
 * must not claim the run succeeded.
 */
export function classifySettledRun(snapshot) {
	if (!snapshot) return "ended";
	if (readErrorField(snapshot)) return "failed";
	const signal = readCompletionSignal(snapshot);
	if (signal.reason === "completed") return "completed";
	if (signal.reason === "stopped") return "stopped";
	return "ended";
}

/** Session identity attached to a strict Session-scoped slot. */
export function resolveSessionId(slotSessionId, snapshot) {
	return slotSessionId ?? snapshot?.sessionId ?? snapshot?.id ?? "legacy-main";
}

/**
 * Resolve the main-view Session across the single-current model and the
 * retained multi-instance model. Background sessions must never win.
 */
export function selectMainViewSessionId(snapshot) {
	if (!snapshot) return undefined;
	if (snapshot.current !== undefined && snapshot.current !== null) return snapshot.current;
	const byId = snapshot.byId ?? {};
	for (const id of snapshot.ids ?? []) {
		if ((byId[id]?.retainedBy?.mainView ?? 0) > 0) return id;
	}
	for (const [id, summary] of Object.entries(byId)) {
		if ((summary?.retainedBy?.mainView ?? 0) > 0) return id;
	}
	return undefined;
}

/** How long a terminal state stays visible before the companion relaxes. */
export const XIAO_TERMINAL_HOLD_MS = Object.freeze({
	sending: 0,
	running: 0,
	completed: 2600,
	ended: 1800,
	stopped: 2000,
	failed: 3200,
	"awaiting-input": 0
});

/** Terminal states are one-shot presentations, never a permanent badge. */
export function isTerminalXiaoState(state) {
	return state === "completed" || state === "ended" || state === "stopped" || state === "failed";
}
