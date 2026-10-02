import { normalizeXiaoSettings } from "../../shared/settings.js";

/**
 * Decode the mirrored settings section for DSH.
 *
 * A missing or non-object section returns undefined so DSH keeps its own
 * defaults, while a real section is filled in field by field: an older profile
 * that predates a newly introduced switch still decodes cleanly.
 */
export function decodeXiaoSettings(section) {
	if (typeof section !== "object" || section === null) return undefined;
	return normalizeXiaoSettings(section);
}
