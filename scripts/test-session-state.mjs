import { check, equal, finish } from "./test-helpers.mjs";
import {
	XIAO_TERMINAL_HOLD_MS,
	classifySettledRun,
	deriveXiaoSessionPhase,
	isTerminalXiaoState,
	readAwaitingSignal,
	readCompletionSignal,
	resolveSessionId,
	selectMainViewSessionId
} from "../src/client/session/compat.js";
import {
	clearXiaoSessionState,
	getXiaoSessionState,
	resetXiaoSessionStore,
	setXiaoSessionState,
	subscribeXiaoSessionState
} from "../src/client/session/status-store.js";

// --- live phase -------------------------------------------------------------
equal(deriveXiaoSessionPhase(undefined), "unknown", "a missing snapshot is unknown");
equal(deriveXiaoSessionPhase({ running: true }), "running", "a running snapshot is running");
equal(deriveXiaoSessionPhase({ awaitingFirstTurn: true }), "sending", "an awaiting first turn is sending");
equal(deriveXiaoSessionPhase({ pendingSubmissions: [{ id: 1 }] }), "sending", "queued submissions are sending");
equal(deriveXiaoSessionPhase({ promptError: { message: "boom" } }), "failed", "a prompt error is failed");
equal(deriveXiaoSessionPhase({ lastAgentError: "boom" }), "failed", "an agent error is failed");
equal(deriveXiaoSessionPhase({}), "idle", "an inactive snapshot is idle");
equal(deriveXiaoSessionPhase({ awaitingInput: true }), "awaiting-input", "an explicit awaiting flag is surfaced");

// --- completion signals -----------------------------------------------------
equal(readCompletionSignal({ stopReason: "stop" }).reason, "completed", "stopReason=stop is a completion signal");
equal(readCompletionSignal({ finishReason: "end_turn" }).reason, "completed", "end_turn is a completion signal");
equal(readCompletionSignal({ stopReason: "aborted" }).reason, "stopped", "aborted is a user-stop signal");
equal(readCompletionSignal({ completionStatus: "cancelled" }).reason, "stopped", "cancelled is a user-stop signal");
equal(readCompletionSignal({ stopReason: "something-else" }).reason, null, "an unknown reason is not a signal");
equal(readCompletionSignal({}).reason, null, "no field means no signal");
check(readAwaitingSignal({ pendingToolApproval: {} }), "a pending tool approval counts as awaiting input");
check(!readAwaitingSignal({}), "no awaiting field is not awaiting");
check(!readAwaitingSignal({ awaitingInput: false }), "an explicit false is not awaiting");

// --- the neutral ended state ------------------------------------------------
equal(classifySettledRun(undefined), "ended", "a missing snapshot settles as ended");
equal(classifySettledRun({}), "ended", "an idle snapshot without a signal settles as ended");
equal(classifySettledRun({ stopReason: "stop" }), "completed", "an explicit stop reason completes the run");
equal(classifySettledRun({ stopReason: "aborted" }), "stopped", "an explicit abort stops the run");
equal(classifySettledRun({ promptError: { message: "x" } }), "failed", "an error settles as failed");
equal(classifySettledRun({ error: true }), "failed", "a generic error settles as failed");
equal(classifySettledRun({ stopReason: "stop", error: true }), "failed", "an error outranks a completion signal");

check(isTerminalXiaoState("completed"), "completed is terminal");
check(isTerminalXiaoState("ended"), "ended is terminal");
check(!isTerminalXiaoState("running"), "running is not terminal");
check(XIAO_TERMINAL_HOLD_MS.completed > 0 && XIAO_TERMINAL_HOLD_MS.running === 0,
	"only terminal states hold before relaxing");

// --- session identity -------------------------------------------------------
equal(resolveSessionId("slot-1", { sessionId: "snap-1" }), "slot-1", "the slot session id wins");
equal(resolveSessionId(undefined, { sessionId: "snap-1" }), "snap-1", "the snapshot session id is the fallback");
equal(resolveSessionId(undefined, { id: "snap-2" }), "snap-2", "the snapshot id is the next fallback");
equal(resolveSessionId(undefined, undefined), "legacy-main", "the legacy main session is the last fallback");

equal(selectMainViewSessionId({ current: "a" }), "a", "the single-current model resolves the current session");
equal(selectMainViewSessionId({
	byId: { a: { retainedBy: { mainView: 0 } }, b: { retainedBy: { mainView: 1 } } },
	ids: ["a", "b"]
}), "b", "the retained model prefers the main-view session");
equal(selectMainViewSessionId({ byId: { a: { retainedBy: { mainView: 0 } } }, ids: ["a"] }), undefined,
	"a background-only model resolves nothing instead of guessing");
equal(selectMainViewSessionId(undefined), undefined, "a missing snapshot resolves nothing");

// --- store isolation --------------------------------------------------------
resetXiaoSessionStore();
const seen = [];
const unsubscribe = subscribeXiaoSessionState(changed => seen.push(changed));
equal(getXiaoSessionState("main"), "idle", "an unknown session starts idle");
setXiaoSessionState("main", "running");
setXiaoSessionState("background", "failed");
equal(getXiaoSessionState("main"), "running", "the main session keeps its own state");
equal(getXiaoSessionState("background"), "failed", "a background session keeps its own state");
equal(getXiaoSessionState("unrelated"), "idle", "an unrelated session is never inherited");
equal(getXiaoSessionState(undefined), "idle", "an undefined session id is idle");

const publishCount = seen.length;
setXiaoSessionState("main", "running");
equal(seen.length, publishCount, "setting an identical state does not notify again");
setXiaoSessionState("main", "completed", { holdMs: 5 });
check(seen.includes("main"), "subscribers are notified for the changed session");
clearXiaoSessionState("main");
equal(getXiaoSessionState("main"), "idle", "clearing releases the session entry");
unsubscribe();
const afterUnsubscribe = seen.length;
setXiaoSessionState("main", "running");
equal(seen.length, afterUnsubscribe, "unsubscribing stops notifications");

// A terminal state must relax on its own after its hold window.
setXiaoSessionState("timer", "completed", { holdMs: 5 });
await new Promise(resolve => setTimeout(resolve, 20));
equal(getXiaoSessionState("timer"), "idle", "a held terminal state relaxes after its hold window");

finish("session state");
