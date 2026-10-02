import { useEffect, useSyncExternalStore } from "react";
import { getBalanceSnapshot, retainBalancePolling, subscribeBalance } from "./balance-store.js";

const DISABLED = Object.freeze({ status: "disabled", stale: false });

/**
 * Subscribe to the guarded balance cache.
 *
 * Polling is only retained while a surface actually displays the balance, so a
 * user who never enables the optional feature never touches the network.
 */
export function useBalance(enabled = true) {
	const value = useSyncExternalStore(subscribeBalance, getBalanceSnapshot, getBalanceSnapshot);
	useEffect(() => {
		if (!enabled) return undefined;
		return retainBalancePolling();
	}, [enabled]);
	return enabled ? value : DISABLED;
}
