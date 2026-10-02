import { XIAO_STYLE_TEXT } from "./styles.generated.js";

export const XIAO_STYLE_ID = "dsh-xiao-theme/xiao-layer.css";

/** Mount the authored stylesheet for exactly this plugin fiber's lifetime. */
export function installXiaoStyles(ctx) {
	if (typeof document === "undefined") return;
	ctx.effect(() => {
		if (document.querySelector(`style[data-plugin-css="${XIAO_STYLE_ID}"]`) !== null) return () => {};
		const tag = document.createElement("style");
		tag.dataset.plugin = "dsh-xiao-theme";
		tag.dataset.pluginCss = XIAO_STYLE_ID;
		tag.textContent = XIAO_STYLE_TEXT;
		document.head.appendChild(tag);
		return () => tag.remove();
	}, "dsh-xiao-theme: enhanced layer stylesheet");
}
