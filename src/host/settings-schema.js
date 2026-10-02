import z from "@deepseek-ai/schemastery";
import { XIAO_SETTING_DEFINITIONS } from "../shared/settings.js";

function schemaFor(definition) {
	switch (definition.kind) {
		case "boolean":
			return z.boolean().default(definition.default);
		case "number":
			return z.number().min(definition.min).max(definition.max).step(definition.step ?? 1).default(definition.default);
		case "choice":
			return z.union([...definition.options]).default(definition.default);
		case "position":
			return z.object({
				x: z.number().min(definition.min).max(definition.max).default(definition.default.x),
				y: z.number().min(definition.min).max(definition.max).default(definition.default.y)
			}).default(definition.default);
		default:
			throw new TypeError(`Unsupported Xiao setting kind: ${definition.kind}`);
	}
}

/** Host-side schema is derived from the shared setting definition table. */
export const XiaoThemeSettingsSchema = z.object(Object.fromEntries(
	Object.entries(XIAO_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition)])
));

/** Newer DSH versions store plugin preferences in the live Profile configuration. */
export const XiaoThemeConfigSchema = z.object(Object.fromEntries(
	Object.entries(XIAO_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition).volatile()])
));
