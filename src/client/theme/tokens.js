import { deriveXiaoAccentPalette } from "../background/palette.js";

function token(light, dark) {
	return Object.freeze({ light, dark });
}

/**
 * Xiao semantic palette.
 *
 * Day: pale moon-white surfaces with deep jade text and low-saturation green
 * surfaces. Night: ink-teal surfaces with a luminous jade accent. Old gold and
 * a muted violet appear only as restrained decoration, never as a second
 * primary colour, and business/syntax colours keep their own meaning.
 */
const AZURE_TOKENS = Object.freeze({
	"--dsw-alias-bg-base": token("#F2F6F5", "#0A1214"),
	"--dsw-alias-bg-layer-1": token("#FAFCFB", "#0E1B1E"),
	"--dsw-alias-bg-layer-2": token("#E7EFED", "#122428"),
	"--dsw-alias-bg-layer-3": token("#DAE7E4", "#17302F"),
	"--dsw-alias-bg-overlay": token("#F8FBFA", "#12302E"),
	"--dsw-alias-bg-module-platform": token("#E6EFEC", "#10211F"),
	"--dsw-alias-bg-multi-select": token("#DFEAE6", "#19332F"),
	"--dsw-alias-bg-skeleton": token("rgba(16, 48, 44, 0.08)", "rgba(63, 191, 166, 0.08)"),
	"--dsw-alias-bg-mask-drop": token("rgba(238, 245, 243, 0.80)", "rgba(6, 12, 13, 0.82)"),
	"--dsw-alias-border-l1": token("rgba(16, 48, 44, 0.10)", "rgba(63, 116, 108, 0.55)"),
	"--dsw-alias-border-l2-darkmode-thin": token("rgba(16, 48, 44, 0.15)", "rgba(63, 116, 108, 0.72)"),
	"--dsw-alias-border-l2": token("rgba(16, 48, 44, 0.20)", "#2C4A47"),
	"--dsw-alias-border-l3": token("rgba(16, 48, 44, 0.28)", "#3C635E"),
	"--dsw-alias-border-l4": token("rgba(16, 48, 44, 0.38)", "#4E7C75"),
	"--dsw-alias-brand-primary": token("#1F8F78", "#35C4A6"),
	"--dsw-alias-brand-primary-invert": token("#D7EFE8", "#0B211E"),
	"--dsw-alias-brand-primary-new-colorprimary-new-color": token("#1F8F78", "#35C4A6"),
	"--dsw-alias-brand-text": token("#17685A", "#5FD9BE"),
	"--dsw-alias-button-primary-fill": token("#1F8F78", "#35C4A6"),
	"--dsw-alias-button-primary-hover": token("#187A66", "#4FD8BB"),
	"--dsw-alias-button-primary-dimmed": token("#CFE4DE", "#1E3B37"),
	"--dsw-alias-button-info-fill": token("#2A7D8F", "#2E8FA3"),
	"--dsw-alias-button-info-hover": token("#226A7A", "#39A0B5"),
	"--dsw-alias-button-elevated-fill": token("#FBFDFC", "#16302E"),
	"--dsw-alias-button-floating-fill": token("#F9FCFB", "#122A28"),
	"--dsw-alias-button-floating-hover": token("#EDF4F2", "#1B3A37"),
	"--dsw-alias-button-ghost-active-border": token("#3E8C7A", "#4FBFA4"),
	"--dsw-alias-button-ghost-active-fill": token("#D8EBE5", "#1B3A35"),
	"--dsw-alias-button-ghost-active-hover": token("#CBE3DC", "#22463F"),
	"--dsw-alias-interactive-bg-hover": token("rgba(31, 143, 120, 0.10)", "rgba(84, 216, 187, 0.09)"),
	"--dsw-alias-interactive-bg-hover-accent": token("rgba(31, 143, 120, 0.18)", "rgba(84, 216, 187, 0.16)"),
	"--dsw-alias-interactive-bg-active": token("rgba(31, 143, 120, 0.22)", "rgba(84, 216, 187, 0.20)"),
	"--dsw-alias-interactive-bg-hover-solid": token("#DCEAE4", "#1E3B36"),
	"--dsw-alias-label-primary": token("#10302C", "#E8F1F0"),
	"--dsw-alias-label-secondary": token("#4A6663", "#A9C0BE"),
	"--dsw-alias-label-tertiary": token("#5E7A76", "#7E9793"),
	"--dsw-alias-label-caption": token("#647F7B", "#8AA29E"),
	"--dsw-alias-label-dimmed": token("#A6B6B2", "#4E635F"),
	"--dsw-alias-label-primary-dimmed": token("#33473F", "#CFDCD9"),
	"--dsw-alias-label-primary-foreground": token("#FFFFFF", "#08201C"),
	"--dsw-alias-label-primary-inverted": token("#F2F6F5", "#0C1A1B"),
	"--dsw-alias-label-primary-bluish": token("#2C6E63", "#6FDCC2"),
	"--dsw-alias-markdown-citation": token("#DCEAE4", "#183430"),
	"--dsw-alias-markdown-code-block": token("#E9F0EE", "#0C1A18"),
	"--dsw-alias-markdown-code-block-banner": token("#DEE9E5", "#12241F"),
	"--dsw-alias-markdown-code-segment-selected": token("#F7FAF9", "#1B3630"),
	"--dsw-alias-markdown-code-segment-unselected": token("#D6E4E0", "#101F1D"),
	"--dsw-alias-markdown-inline-code": token("#E1EBE7", "#1D342F"),
	"--dsw-alias-markdown-placeholder": token("#EDF3F1", "#152622"),
	"--dsw-alias-markdown-tag": token("#DCEAE4", "#1B3630"),
	"--dsw-alias-scrollbar-bg-l1": token("#B4C7C2", "#2F4A47"),
	"--dsw-alias-scrollbar-bg-l2": token("#A6BBB5", "#3A5854"),
	"--dsw-alias-scrollbar-hover-l1": token("#8FA8A1", "#456864"),
	"--dsw-alias-scrollbar-hover-l2": token("#7F9A93", "#527A74"),
	"--dsw-alias-state-business-primary": token("#1F8F78", "#35C4A6"),
	"--dsw-alias-state-business-tertiary": token("#D8EBE5", "#1B3A35"),
	"--dsw-alias-state-success-primary": token("#2C8A5F", "#5FD3A0"),
	"--dsw-alias-state-success-secondary": token("#4CA37B", "#4CB98B"),
	"--dsw-alias-state-success-tertiary": token("#DCEFE6", "#17352A"),
	"--dsw-alias-state-warn-label": token("#8A6520", "#DCC27E"),
	"--dsw-alias-state-warn-primary": token("#9C7526", "#C9A961"),
	"--dsw-alias-state-warn-secondary": token("#B78E36", "#B49556"),
	"--dsw-alias-state-warn-tertiary": token("#F3E9CE", "#3A3122"),
	"--dsw-alias-state-error-primary": token("#B7443A", "#F0A79C"),
	"--dsw-alias-state-error-secondary": token("#C96257", "#D98A7D"),
	"--dsw-alias-toast-bg": token("#1D3A34", "#2A4B45"),
	"--dsw-alias-tooltip-bg": token("#17302C", "#2F4E49"),
	"--dsw-specific-bubble": token("#E3EEE9", "#14302B"),
	"--dsw-specific-bubble-highlight": token("#CBE7DD", "#1F4A41"),
	"--dsw-specific-input-major": token("#FCFEFD", "#0F2422"),
	"--dsw-specific-login-input": token("#EDF4F2", "#0B1B1A"),
	"--dsw-specific-menu": token("#E6EFEC", "#17322E"),
	"--dsw-specific-selector": token("#E7F0ED", "#193430"),
	"--dsw-specific-sidebar-fill": token("#E4EEEC", "#08100F"),
	"--dsw-specific-sidebar-nav-item-active-accent": token("#2FA98D", "#3BB79C"),
	"--dsw-specific-sidebar-nav-item-active": token("#D5E7E2", "#12302C"),
	"--dsw-specific-sidebar-nav-item-hover": token("#DEEBE8", "#0E2422"),
	"--dsw-specific-tip": token("#E7F0EC", "#153029")
});

export const XIAO_THEME_TOKENS = AZURE_TOKENS;
export const XIAO_THEME_SOURCE = "dsh-xiao-theme";

const BACKGROUND_SURFACE_ALPHA = Object.freeze({
	"--dsw-alias-bg-base": { from: [0.52, 0.45], to: [0.20, 0.16] },
	"--dsw-alias-bg-layer-1": { from: [0.94, 0.92], to: [0.50, 0.44] },
	"--dsw-alias-bg-layer-2": { from: [0.96, 0.94], to: [0.56, 0.50] },
	"--dsw-alias-bg-layer-3": { from: [0.97, 0.96], to: [0.62, 0.56] },
	"--dsw-alias-bg-overlay": { from: [0.98, 0.97], to: [0.68, 0.62] },
	"--dsw-alias-bg-module-platform": { from: [0.95, 0.93], to: [0.56, 0.50] },
	"--dsw-alias-bg-multi-select": { from: [0.94, 0.92], to: [0.52, 0.46] },
	"--dsw-specific-sidebar-fill": { from: [0.88, 0.85], to: [0.45, 0.40] },
	"--dsw-specific-bubble": { from: [0.96, 0.94], to: [0.60, 0.54] },
	"--dsw-specific-bubble-highlight": { from: [0.94, 0.92], to: [0.56, 0.50] },
	"--dsw-specific-menu": { from: [0.96, 0.93], to: [0.66, 0.60] },
	"--dsw-specific-selector": { from: [0.95, 0.92], to: [0.58, 0.52] }
});

function rgba(value, alpha) {
	const hex = /^#([\da-f]{6})$/i.exec(value);
	if (hex) {
		const color = hex[1];
		const red = Number.parseInt(color.slice(0, 2), 16);
		const green = Number.parseInt(color.slice(2, 4), 16);
		const blue = Number.parseInt(color.slice(4, 6), 16);
		return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
	}
	const existing = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(value);
	if (!existing) return value;
	const oldAlpha = existing[4] === undefined ? 1 : Number(existing[4]);
	return `rgba(${existing[1]}, ${existing[2]}, ${existing[3]}, ${alpha * oldAlpha})`;
}

function withSurfaceAlpha(value, alpha) {
	return token(rgba(value.light, alpha[0]), rgba(value.dark, alpha[1]));
}

function surfaceAlpha(pair, visibility) {
	const amount = Math.min(100, Math.max(0, visibility)) / 100;
	return pair.from.map((value, index) => Number((value + (pair.to[index] - value) * amount).toFixed(3)));
}

/** Derive only Xiao's primary accent while keeping semantic status colors intact. */
export function getXiaoThemeTokens(accentHex = "", customBackground = false, backgroundVisibility = 75) {
	if (!accentHex && !customBackground) return XIAO_THEME_TOKENS;
	const result = { ...XIAO_THEME_TOKENS };
	if (customBackground) {
		const safeVisibility = typeof backgroundVisibility === "number" && Number.isFinite(backgroundVisibility)
			? backgroundVisibility : 75;
		for (const [key, alpha] of Object.entries(BACKGROUND_SURFACE_ALPHA)) {
			if (result[key]) result[key] = withSurfaceAlpha(result[key], surfaceAlpha(alpha, safeVisibility));
		}
	}
	if (accentHex) {
		const base = XIAO_THEME_TOKENS["--dsw-alias-bg-layer-1"];
		const palette = deriveXiaoAccentPalette(accentHex, base.light, base.dark);
		if (palette) {
			result["--dsw-alias-brand-primary"] = token(palette.light, palette.dark);
			result["--dsw-alias-brand-primary-invert"] = token(palette.foregroundLight, palette.foregroundDark);
			result["--dsw-alias-brand-text"] = token(palette.strongLight, palette.strongDark);
			result["--dsw-alias-button-primary-fill"] = token(palette.light, palette.dark);
			result["--dsw-alias-button-primary-hover"] = token(palette.strongLight, palette.strongDark);
			result["--dsw-alias-button-primary-dimmed"] = token(rgba(palette.light, 0.22), rgba(palette.dark, 0.24));
			result["--dsw-specific-sidebar-nav-item-active-accent"] = token(palette.light, palette.dark);
			result["--dsw-alias-state-business-primary"] = token(palette.light, palette.dark);
		}
	}
	return Object.freeze(result);
}
