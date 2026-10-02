import { createElement as h } from "react";
import { XIAO_COMPANION_MARK_DATA_URI } from "../assets.generated.js";

/** Layered emblem shared by the sidebar and the welcome page. */
function BrandShell({ className = "", hero = false, size }) {
	const resolved = Number.isFinite(size) ? size : hero ? 96 : 28;
	const markSize = Math.round(resolved * (hero ? 0.66 : 0.74));
	return h("span", {
		"aria-hidden": "true",
		className: ["xiao-brand-shell", hero ? "xiao-brand-shell--hero" : "", className].filter(Boolean).join(" "),
		style: { height: resolved, width: resolved }
	}, [
		h("span", { className: "xiao-brand-shell__halo", key: "halo" }),
		h("span", { className: "xiao-brand-shell__ring", key: "ring" }),
		h("span", { className: "xiao-brand-shell__wind", key: "wind" }),
		h("img", {
			alt: "",
			className: "xiao-brand-mark",
			height: markSize,
			key: "mark",
			src: XIAO_COMPANION_MARK_DATA_URI,
			width: markSize
		})
	]);
}

export function SidebarBrandMark({ size }) { return h(BrandShell, { size }); }
export function HeroBrandMark({ className, size }) { return h(BrandShell, { className, hero: true, size }); }

export function SidebarBrandName() {
	return h("span", { className: "xiao-sidebar-brand-name" }, [
		h("strong", { key: "name" }, "魈"),
		h("small", { key: "sub" }, "青霄守夜 · DSH")
	]);
}
