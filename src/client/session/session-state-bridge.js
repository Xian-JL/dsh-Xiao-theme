import * as react from "react";
import { clearXiaoSessionState, setXiaoSessionState } from "./status-store.js";
import {
	XIAO_TERMINAL_HOLD_MS,
	classifySettledRun,
	deriveXiaoSessionPhase,
	resolveSessionId
} from "./compat.js";

/**
 * Invisible Session-scoped bridge. It converts DSH SessionSnapshot lifecycle
 * into product feedback for exactly one sessionId, so a background task or a
 * sub-session can never repaint the main view's companion.
 */
export function SessionStateBridge({ useSession, sessionId }) {
	const phase = useSession(deriveXiaoSessionPhase);
	const snapshotSessionId = useSession(snapshot => snapshot?.sessionId ?? snapshot?.id);
	const stopReason = useSession(snapshot => {
		if (!snapshot || typeof snapshot !== "object") return "";
		for (const field of ["stopReason", "lastStopReason", "finishReason", "endReason", "completionStatus"]) {
			const value = snapshot[field];
			if (typeof value === "string") return value;
		}
		return "";
	});
	const hasError = useSession(snapshot => {
		if (!snapshot || typeof snapshot !== "object") return false;
		return Boolean(snapshot.promptError ?? snapshot.openError ?? snapshot.lastAgentError ?? snapshot.error ?? snapshot.lastError);
	});
	const resolvedSessionId = resolveSessionId(sessionId, { sessionId: snapshotSessionId });
	const previousActive = react.useRef(phase === "sending" || phase === "running");
	const previousSession = react.useRef(resolvedSessionId);
	const timer = react.useRef(null);

	react.useEffect(() => {
		if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
		if (previousSession.current !== resolvedSessionId) {
			previousSession.current = resolvedSessionId;
			previousActive.current = false;
		}
		const active = phase === "sending" || phase === "running";
		const hold = state => {
			const holdMs = XIAO_TERMINAL_HOLD_MS[state] ?? 0;
			if (holdMs <= 0) return;
			timer.current = setTimeout(() => {
				setXiaoSessionState(resolvedSessionId, "idle");
				timer.current = null;
			}, holdMs);
		};
		if (phase === "failed") {
			setXiaoSessionState(resolvedSessionId, "failed", { holdMs: XIAO_TERMINAL_HOLD_MS.failed });
			hold("failed");
		} else if (phase === "awaiting-input") {
			setXiaoSessionState(resolvedSessionId, "awaiting-input");
		} else if (phase === "sending") {
			setXiaoSessionState(resolvedSessionId, "sending");
		} else if (phase === "running") {
			setXiaoSessionState(resolvedSessionId, "running");
		} else if (phase === "unknown") {
			setXiaoSessionState(resolvedSessionId, "unknown");
		} else if (previousActive.current) {
			// The run left the active phase. Only an explicit signal may claim
			// success; otherwise report the neutral "ended" state.
			const settled = classifySettledRun({ stopReason, error: hasError ? true : undefined });
			setXiaoSessionState(resolvedSessionId, settled, { holdMs: XIAO_TERMINAL_HOLD_MS[settled] ?? 0 });
			hold(settled);
		} else {
			setXiaoSessionState(resolvedSessionId, "idle");
		}
		previousActive.current = active;
		return () => { if (timer.current !== null) clearTimeout(timer.current); };
	}, [phase, resolvedSessionId, stopReason, hasError]);

	react.useEffect(() => () => clearXiaoSessionState(resolvedSessionId), [resolvedSessionId]);

	return null;
}
