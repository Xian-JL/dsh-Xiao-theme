import { refreshBalanceForCredentialChange } from "./balance-store.js";

/**
 * Invalidate any previously displayed account as soon as the official DeepSeek
 * credential form changes, so a cached balance can never belong to the old key.
 */
export function watchDeepSeekBalanceProvider(ctx, refresh = refreshBalanceForCredentialChange) {
	const forms = ctx.get?.("configForms");
	if (!forms) return () => {};
	const provider = forms.get("llm-deepseek-api-key");
	if (!provider || typeof provider.subscribe !== "function") return () => {};
	let previous = provider.getSnapshot();
	let initialized = previous?.status !== "loading";
	return provider.subscribe(() => {
		const next = provider.getSnapshot();
		if (next?.status === "loading") return;
		if (!initialized) { initialized = true; previous = next; return; }
		const changed = next?.revision !== previous?.revision || next?.status !== previous?.status;
		previous = next;
		if (changed) void refresh();
	});
}
