/**
 * Balance presentation policy. The threshold is fixed at CNY 10 and the low
 * state is a local warning: it never recolours the whole interface, doubles
 * animation speed, or blocks any interaction.
 */
export const XIAO_LOW_BALANCE_CNY = 10;

/** Compare a decimal string against the threshold without losing precision. */
export function isBelowCnyThreshold(value, threshold = XIAO_LOW_BALANCE_CNY) {
	if (value?.currency !== "CNY" || typeof value.totalBalance !== "string") return false;
	const normalized = value.totalBalance.trim();
	if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false;
	const [whole] = normalized.split(".");
	const canonicalWhole = whole.replace(/^0+(?=\d)/, "");
	const canonicalThreshold = String(threshold);
	if (canonicalWhole.length !== canonicalThreshold.length) return canonicalWhole.length < canonicalThreshold.length;
	// Equal-length integers compare correctly as digit strings. An equal integer
	// part is never "below": the fractional part can only push it further up.
	return canonicalWhole < canonicalThreshold;
}

export function getBalanceRetryMinutes(value, now = Date.now()) {
	if (value?.status !== "rate-limited") return null;
	const retryAt = Date.parse(value.retryAt ?? "");
	if (!Number.isFinite(retryAt) || retryAt <= now) return null;
	return Math.ceil((retryAt - now) / 60_000);
}

/** Coarse grouping used by the panel to pick an icon and tone. */
export function balanceTone(value) {
	if (value?.status === "ready") return value.stale ? "stale" : "ready";
	if (value?.status === "loading") return "loading";
	if (value?.status === "unbound" || value?.status === "unsupported") return "inactive";
	if (value?.status === "auth-error") return "error";
	if (value?.status === "rate-limited") return "limited";
	return "unavailable";
}
