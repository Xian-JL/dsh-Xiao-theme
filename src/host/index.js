import { XIAO_SETTINGS_NAMESPACE } from "../shared/settings.js";
import { XiaoThemeConfigSchema, XiaoThemeSettingsSchema } from "./settings-schema.js";
import { installBalanceRoute } from "./balance-route.js";

/** Stable package id shared by the Host, Client and bundle row. */
export const name = "dsh-xiao-theme";
export const Config = XiaoThemeConfigSchema;

/**
 * Register the durable settings section and the optional, authenticated
 * DeepSeek balance route whenever the matching Host services exist.
 */
export function apply(ctx) {
	installBalanceRoute(ctx);
	ctx.inject(["settings"], (settingsCtx) => {
		if (typeof settingsCtx.settings.register === "function") {
			settingsCtx.settings.register(XIAO_SETTINGS_NAMESPACE, XiaoThemeSettingsSchema, { applies: "live" });
		} else if (typeof settingsCtx.settings.configure === "function") {
			settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
		}
	});
}
