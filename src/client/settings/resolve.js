import { XIAO_SETTINGS_NAMESPACE } from "../../shared/settings.js";
import { decodeXiaoSettings } from "./decode.js";
import { exclusiveSettings } from "./exclusive.js";

/** Resolve the settings form behind the theme service on both DSH generations. */
export function resolveXiaoSettings(ctx) {
	const forms = ctx.get("configForms");
	if (forms) return exclusiveSettings(forms.get(XIAO_SETTINGS_NAMESPACE), forms.get("dsh-kinich-theme"));
	const legacyScope = ctx.get("settingsScope");
	if (legacyScope) return exclusiveSettings(legacyScope.bind({ namespace: XIAO_SETTINGS_NAMESPACE, decode: decodeXiaoSettings }), legacyScope.bind({ namespace: "dsh-kinich-theme", decode: value => value }));
	throw new Error("Xiao theme requires a DSH settings service");
}
