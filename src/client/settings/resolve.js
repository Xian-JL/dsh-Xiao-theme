import { XIAO_SETTINGS_NAMESPACE } from "../../shared/settings.js";
import { decodeXiaoSettings } from "./decode.js";

/** Resolve the settings form behind the theme service on both DSH generations. */
export function resolveXiaoSettings(ctx) {
	const forms = ctx.get("configForms");
	if (forms) return forms.get(XIAO_SETTINGS_NAMESPACE);
	const legacyScope = ctx.get("settingsScope");
	if (legacyScope) return legacyScope.bind({ namespace: XIAO_SETTINGS_NAMESPACE, decode: decodeXiaoSettings });
	throw new Error("Xiao theme requires a DSH settings service");
}
