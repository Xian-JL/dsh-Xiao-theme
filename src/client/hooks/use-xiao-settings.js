import * as react from "react";

/** Subscribe to the DSH settings scope through the external-store contract. */
export function useXiaoSettings(scope) {
	const subscribe = react.useCallback(listener => scope.subscribe(listener), [scope]);
	const getSnapshot = react.useCallback(() => scope.getSnapshot(), [scope]);
	return react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
