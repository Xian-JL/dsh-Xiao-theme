import { HeroBrandMark, SidebarBrandMark, SidebarBrandName } from "./components/brand.js";
import { XiaoOverlay } from "./overlay/xiao-overlay.js";
import { XiaoSettingsRow } from "./settings/xiao-settings-row.js";
import { SessionStateBridge } from "./session/session-state-bridge.js";
import { XIAO_LOCALE_NAMESPACE, XIAO_LOCALES } from "./locales.js";
import { installXiaoStyles } from "./styles.js";
import { resolveXiaoSettings } from "./settings/resolve.js";
import { installInteractionBridge } from "./interaction/interaction-bridge.js";
import { watchDeepSeekBalanceProvider } from "./balance/provider-watch.js";

export const inject = ["theme", "slots", "locale", "connection", "remote"];
export const BRAND_PRIORITY = -20;

export function apply(ctx) {
	installXiaoStyles(ctx);
	ctx.effect(installInteractionBridge, "dsh-xiao-theme: host interaction feedback");
	ctx.effect(() => watchDeepSeekBalanceProvider(ctx), "dsh-xiao-theme: DeepSeek credential changes");
	const settings = resolveXiaoSettings(ctx);
	ctx.effect(() => ctx.locale.register(XIAO_LOCALE_NAMESPACE, XIAO_LOCALES), "dsh-xiao-theme: dictionaries");
	ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({ name: "sidebar.brand.mark", priority: BRAND_PRIORITY }, SidebarBrandMark));
	ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({ name: "sidebar.brand.name", priority: BRAND_PRIORITY }, SidebarBrandName));
	ctx.slots.inject("conversation.hero.brand.mark", () => ctx.slots.register({ name: "conversation.hero.brand.mark", priority: BRAND_PRIORITY }, HeroBrandMark));
	ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({ name: "conversation.composer.dock", id: "xiao-session-state", order: 9999 }, SessionStateBridge));
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		name: "shell.overlay",
		id: "xiao-theme-decoration",
		order: -100,
		locale: XIAO_LOCALE_NAMESPACE,
		inject: () => ({ settings, theme: ctx.theme })
	}, XiaoOverlay));
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "xiao-theme",
		order: 40,
		label: () => "魈 · Xiao",
		locale: XIAO_LOCALE_NAMESPACE,
		inject: () => ({ settings })
	}, XiaoSettingsRow));
}
