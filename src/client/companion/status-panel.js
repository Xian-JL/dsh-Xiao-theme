import { createElement as h } from "react";
import { balanceTone, getBalanceRetryMinutes } from "../balance/policy.js";

const STATUS_KEY = {
	"awaiting-input": "status.awaiting",
	completed: "status.completed",
	ended: "status.ended",
	failed: "status.failed",
	idle: "status.idle",
	running: "status.running",
	sending: "status.sending",
	stopped: "status.stopped",
	unknown: "status.unknown"
};

/** Human-readable amount; never invents a value when the balance is unknown. */
export function balanceAmount(balance) {
	if (typeof balance?.totalBalance !== "string") return "—";
	const symbol = balance.currency === "CNY" ? "¥" : balance.currency === "USD" ? "$" : `${balance.currency ?? ""} `;
	return `${symbol}${balance.totalBalance}`;
}

/** One line that explains the current balance state without blaming the user. */
export function balanceNote(balance, t, enabled) {
	if (!enabled) return t("balance.disabled");
	const retryMinutes = getBalanceRetryMinutes(balance);
	if (retryMinutes !== null) {
		return `${t("balance.retry.before")}${retryMinutes}${t("balance.retry.after")}`;
	}
	const parts = [];
	if (balance?.stale) parts.push(t("balance.stale"));
	if (balance?.overheated === true) parts.push(t("balance.low"));
	if (parts.length > 0) return parts.join(" ");
	return t("balance.live");
}

/**
 * Companion status panel: session feedback first, optional balance second.
 *
 * The low-balance state is expressed here as text plus a local warning tone; it
 * never blocks an interaction and never restyles the whole application.
 */
export function XiaoStatusPanel({
	balance,
	balanceEnabled,
	manualRefreshStatus,
	onClose,
	onRefresh,
	sessionState,
	t,
	open
}) {
	if (!open) return null;
	const tone = balanceEnabled ? balanceTone(balance) : "inactive";
	const statusKey = `balance.status.${balance?.status ?? "loading"}`;
	return h("section", {
		"aria-busy": manualRefreshStatus === "loading",
		"aria-label": t("balance.dialog"),
		"aria-modal": "false",
		className: "xiao-panel",
		"data-balance": tone,
		"data-state": sessionState,
		onClick: event => event.stopPropagation(),
		onPointerDown: event => event.stopPropagation(),
		role: "dialog"
	}, [
		h("header", { className: "xiao-panel__header", key: "header" }, [
			h("span", { className: "xiao-panel__provider", key: "provider" }, [
				h("span", { "aria-hidden": "true", className: "xiao-panel__diamond", key: "diamond" }),
				t("balance.provider")
			]),
			h("span", { className: "xiao-panel__actions", key: "actions" }, [
				balanceEnabled ? h("button", {
					"aria-label": t("balance.refresh"),
					className: "xiao-panel__refresh",
					disabled: manualRefreshStatus === "loading",
					key: "refresh",
					onClick: () => void onRefresh(),
					type: "button"
				}, "↻") : null,
				h("button", {
					"aria-label": t("balance.close"),
					className: "xiao-panel__close",
					key: "close",
					onClick: onClose,
					type: "button"
				}, "×")
			])
		]),

		h("div", { className: "xiao-panel__state", key: "state" }, [
			h("span", { className: "xiao-panel__state-label", key: "label" }, t("status.hint")),
			h("strong", { "data-state": sessionState, className: "xiao-panel__state-value", key: "value" },
				t(STATUS_KEY[sessionState] ?? "status.unknown"))
		]),

		balanceEnabled && h("div", { className: "xiao-panel__balance", key: "balance" }, [
			h("span", { className: "xiao-panel__balance-label", key: "label" }, t("balance.current")),
			h("strong", { className: "xiao-panel__amount", key: "amount" }, balanceAmount(balance)),
			h("span", { className: "xiao-panel__status", key: "status" }, [
				h("span", { "aria-hidden": "true", className: "xiao-panel__dot", key: "dot" }),
				t(statusKey)
			]),
			h("span", { className: "xiao-panel__note", key: "note" }, balanceNote(balance, t, true))
		]),

		!balanceEnabled && h("p", { className: "xiao-panel__note xiao-panel__note--muted", key: "disabled" }, t("balance.disabled")),

		h("span", {
			"aria-live": "polite",
			className: "xiao-panel__refresh-status",
			key: "refreshStatus",
			role: "status"
		}, manualRefreshStatus === "loading" ? t("balance.refreshing")
			: manualRefreshStatus === "done" ? t("balance.refreshed")
				: manualRefreshStatus === "limited" ? t("balance.refreshLimited")
					: manualRefreshStatus === "failed" ? t("balance.refreshFailed") : "")
	]);
}
