import { createElement as h, useEffect, useRef, useState } from "react";
import {
	DEFAULT_XIAO_SETTINGS,
	VISUAL_INTENSITIES,
	CHARACTER_OPACITIES,
	CHARACTER_POSITIONS,
	CHARACTER_VARIANTS,
	COMPANION_SIZES,
	XIAO_VISUAL_PRESETS
} from "../../shared/settings.js";
import { XIAO_CELEBRATION_DATA_URI, XIAO_STANDING_DATA_URI } from "../assets.generated.js";
import { PLUGIN_VERSION } from "../version.generated.js";
import { useXiaoSettings } from "../hooks/use-xiao-settings.js";
import { writeXiaoSettings } from "./write.js";
import { ActionButton, ChoiceGroup, SectionHeader, Toggle } from "./controls.js";

/** A miniature of the real surface. It never moves the live companion. */
function ThemePreview({ t, value }) {
	return h("div", {
		className: "xiao-live-preview",
		"data-character": String(value.showHero),
		"data-intensity": value.intensity,
		"data-ornament": String(value.showOrnament),
		"data-position": value.characterPosition,
		"data-opacity": value.characterOpacity,
		"data-variant": value.characterVariant
	}, [
		h("div", { key: "copy", className: "xiao-live-preview__copy" }, [
			h("span", { key: "eyebrow", className: "xiao-live-preview__eyebrow" }, t("preview.eyebrow")),
			h("strong", { key: "title" }, t("title")),
			h("span", { key: "variant" }, t(`hero.variant.${value.characterVariant}`)),
			h("span", { key: "tagline" }, t(`intensity.preset.${value.intensity}`))
		]),
		h("div", { key: "stage", className: "xiao-live-preview__stage" }, [
			h("span", { key: "glow", className: "xiao-live-preview__glow" }),
			h("span", { key: "wind", className: "xiao-live-preview__wind" }),
			h("img", {
				alt: "",
				className: "xiao-live-preview__hero",
				key: "hero",
				src: value.characterVariant === "celebration" ? XIAO_CELEBRATION_DATA_URI : XIAO_STANDING_DATA_URI
			})
		])
	]);
}

function SettingSection({ children, className = "", description, eyebrow, title }) {
	return h("section", { className: ["xiao-settings__section", className].filter(Boolean).join(" ") }, [
		h(SectionHeader, { description, eyebrow, key: "header", title }),
		h("div", { className: "xiao-settings__section-body", key: "body" }, children)
	]);
}

function MoreControls({ children, label }) {
	return h("details", { className: "xiao-settings__details" }, [
		h("summary", { key: "summary" }, label),
		h("div", { className: "xiao-settings__details-body", key: "body" }, children)
	]);
}

const INTENSITY_LABEL_KEY = {
	minimal: "intensity.minimal",
	balanced: "intensity.balanced",
	immersive: "intensity.immersive"
};

const OPACITY_LABEL_KEY = {
	low: "hero.opacity.low",
	medium: "hero.opacity.medium",
	high: "hero.opacity.high"
};

const SIZE_LABEL_KEY = {
	sm: "companion.size.sm",
	md: "companion.size.md",
	lg: "companion.size.lg"
};

/**
 * Settings section rendered inside Settings → General.
 *
 * Reads and writes go through the DSH settings scope only; the preview above is
 * a static miniature, so adjusting a switch never sends a message, queries the
 * real balance, or teleports the live companion.
 */
export function XiaoSettingsRow({ settings, t }) {
	const snapshot = useXiaoSettings(settings);
	const value = snapshot.value ?? DEFAULT_XIAO_SETTINGS;
	const [pending, setPending] = useState(null);
	const [failed, setFailed] = useState(null);
	const [resetArmed, setResetArmed] = useState(false);
	const [notice, setNotice] = useState(null);
	const resetTimer = useRef(null);
	const noticeTimer = useRef(null);
	const writable = snapshot.writable !== false;
	const showNotice = message => {
		setNotice(message);
		if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
		noticeTimer.current = setTimeout(() => {
			setNotice(null);
			noticeTimer.current = null;
		}, 2600);
	};

	useEffect(() => () => {
		if (resetTimer.current !== null) clearTimeout(resetTimer.current);
		if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
	}, []);

	const updateMany = async (label, patch) => {
		if (!writable) return false;
		setPending(label);
		setFailed(null);
		try {
			await writeXiaoSettings(settings, patch, snapshot.value ?? DEFAULT_XIAO_SETTINGS);
			return true;
		} catch (error) {
			// Keep the exact user-requested patch so Retry repeats the write instead
			// of merely dismissing the error or guessing from the current snapshot.
			setFailed({ label, patch: { ...patch }, partial: error?.partial === true });
			return false;
		} finally {
			setPending(null);
		}
	};
	const update = (field, next) => updateMany(field, { [field]: next });
	const applyPreset = intensity => updateMany("intensity", { ...XIAO_VISUAL_PRESETS[intensity] });
	const resetAll = () => {
		if (!resetArmed) {
			setResetArmed(true);
			if (resetTimer.current !== null) clearTimeout(resetTimer.current);
			resetTimer.current = setTimeout(() => { setResetArmed(false); resetTimer.current = null; }, 4000);
			return;
		}
		setResetArmed(false);
		if (resetTimer.current !== null) { clearTimeout(resetTimer.current); resetTimer.current = null; }
		void updateMany("resetAll", { ...DEFAULT_XIAO_SETTINGS }).then(succeeded => {
			if (succeeded) showNotice(t("actions.resetAll.done"));
		});
	};

	const disabled = !writable || pending !== null;
	const stateLabel = active => t(active ? "state.on" : "state.off");
	const busyLabel = pending === null ? null : `${t("state.saving")}${pending}`;

	return h("div", {
		className: "xiao-settings",
		"data-enabled": String(value.enabled),
		"data-pending": String(pending !== null)
	}, [
		h("header", { className: "xiao-settings__header", key: "header" }, [
			h("img", { alt: "", "aria-hidden": "true", className: "xiao-settings__banner", key: "banner", src: XIAO_CELEBRATION_DATA_URI }),
			h("span", { className: "xiao-settings__kicker", key: "kicker" }, "XIAO · 青霄守夜"),
			h("h2", { className: "xiao-settings__title", key: "title" }, t("title")),
			h("p", { className: "xiao-settings__description", key: "desc" }, t("description")),
			h("span", { className: "xiao-settings__version", key: "version" }, `v${PLUGIN_VERSION}`)
		]),

		h(ThemePreview, { key: "preview", t, value }),

		!writable && h("p", { className: "xiao-settings__notice", key: "readonly", role: "status" }, t("state.unavailable")),
		failed && h("p", { className: "xiao-settings__error", key: "error", role: "alert" }, [
			h("span", { key: "text" }, failed.partial
				? t("state.error.partial")
				: `${t("state.error.before")}${failed.label}${t("state.error.after")}`),
			h(ActionButton, {
				key: "retry",
				disabled,
				label: t("state.retry"),
				onClick: async () => {
					if (!failed) return;
					const retry = failed;
					const succeeded = await updateMany(retry.label, retry.patch);
					if (succeeded && retry.label === "resetAll") showNotice(t("actions.resetAll.done"));
				},
				tone: "quiet"
			})
		]),
		notice && h("p", { className: "xiao-settings__notice", key: "notice", role: "status" }, notice),
		busyLabel && writable && h("p", { "aria-live": "polite", className: "xiao-settings__notice", key: "busy", role: "status" }, busyLabel),

		h(SettingSection, { key: "theme", title: t("theme.section"), description: t("description") }, [
			h(Toggle, {
				checked: value.enabled,
				description: t("theme.enable.description"),
				disabled,
				key: "enabled",
				label: t("theme.enable"),
				onChange: () => update("enabled", !value.enabled),
				stateLabel: stateLabel(value.enabled)
			}),
			h("p", { className: "xiao-settings__hint", key: "permission" }, [
				h("strong", { key: "title" }, `${t("theme.permission")}：`),
				t("theme.permission.description")
			])
		]),

		h(SettingSection, { key: "intensity", title: t("intensity.section"), description: t("intensity.description") }, [
			h(ChoiceGroup, {
				disabled,
				key: "intensity",
				label: t("intensity.label"),
				onChange: applyPreset,
				options: VISUAL_INTENSITIES.map(item => ({
					label: t(INTENSITY_LABEL_KEY[item]),
					value: item
				})),
				value: value.intensity
			}),
			h(ChoiceGroup, {
				disabled,
				key: "variant",
				label: t("hero.variant"),
				onChange: next => update("characterVariant", next),
				options: CHARACTER_VARIANTS.map(item => ({
					label: t(`hero.variant.${item}`),
					value: item
				})),
				value: value.characterVariant
			}),
			h(ChoiceGroup, {
				disabled,
				key: "opacity",
				label: t("hero.opacity"),
				onChange: next => update("characterOpacity", next),
				options: CHARACTER_OPACITIES.map(item => ({
					label: t(OPACITY_LABEL_KEY[item]),
					value: item
				})),
				value: value.characterOpacity
			}),
			h(ChoiceGroup, {
				disabled,
				key: "position",
				label: t("hero.position"),
				onChange: next => update("characterPosition", next),
				options: CHARACTER_POSITIONS.map(item => ({
					label: t(`hero.position.${item}`),
					value: item
				})),
				value: value.characterPosition
			}),
			h(Toggle, {
				checked: value.showHero,
				description: t("hero.show.description"),
				disabled,
				key: "showHero",
				label: t("hero.show"),
				onChange: () => update("showHero", !value.showHero),
				stateLabel: stateLabel(value.showHero)
			}),
			h(MoreControls, { key: "heroMore", label: t("details.label") }, [
				h(Toggle, {
					checked: value.animateCharacter,
					description: t("hero.animate.description"),
					disabled,
					key: "animateCharacter",
					label: t("hero.animate"),
					onChange: () => update("animateCharacter", !value.animateCharacter),
					stateLabel: stateLabel(value.animateCharacter)
				}),
				h(Toggle, {
					checked: value.heroParallax,
					description: t("hero.parallax.description"),
					disabled,
					key: "heroParallax",
					label: t("hero.parallax"),
					onChange: () => update("heroParallax", !value.heroParallax),
					stateLabel: stateLabel(value.heroParallax)
				})
			])
		]),

		h(SettingSection, { key: "companion", title: t("companion.section"), description: t("companion.section.description") }, [
			h(Toggle, {
				checked: value.showCompanion,
				description: t("companion.show.description"),
				disabled,
				key: "showCompanion",
				label: t("companion.show"),
				onChange: () => update("showCompanion", !value.showCompanion),
				stateLabel: stateLabel(value.showCompanion)
			}),
			h(ChoiceGroup, {
				disabled,
				key: "companionSize",
				label: t("companion.size"),
				onChange: next => update("companionSize", next),
				options: COMPANION_SIZES.map(item => ({
					label: t(SIZE_LABEL_KEY[item]),
					value: item
				})),
				value: value.companionSize
			}),
			h(ChoiceGroup, {
				disabled,
				key: "companionFlip",
				label: t("companion.flip"),
				onChange: next => update("companionFlipped", next === "flipped"),
				options: [
					{ label: t("companion.flip.normal"), value: "normal" },
					{ label: t("companion.flip.flipped"), value: "flipped" }
				],
				value: value.companionFlipped ? "flipped" : "normal"
			}),
			h(Toggle, {
				checked: value.animatedCompanion,
				description: t("companion.animate.description"),
				disabled,
				key: "animatedCompanion",
				label: t("companion.animate"),
				onChange: () => update("animatedCompanion", !value.animatedCompanion),
				stateLabel: stateLabel(value.animatedCompanion)
			}),
			h("p", { className: "xiao-settings__hint", key: "interaction" }, t("companion.interaction")),
			h("p", { className: "xiao-settings__hint", key: "keyboard" }, t("companion.keyboard")),
			h("div", { className: "xiao-settings__actions", key: "actions" }, [
				h(ActionButton, {
					disabled,
					key: "resetCompanion",
					label: t("companion.reset"),
					onClick: () => updateMany("companionPosition", { companionPosition: { ...DEFAULT_XIAO_SETTINGS.companionPosition } })
				}),
				h(ActionButton, {
					disabled,
					key: "resetAll",
					label: resetArmed ? t("actions.resetAll.confirm") : t("actions.resetAll"),
					onClick: resetAll,
					tone: resetArmed ? "danger" : "neutral"
				})
			])
		]),

		h(SettingSection, { key: "state", title: t("state.section"), description: t("state.converge.description") }, [
			h(Toggle, {
				checked: value.convergeWhileRunning,
				description: t("state.converge.description"),
				disabled,
				key: "convergeWhileRunning",
				label: t("state.converge"),
				onChange: () => update("convergeWhileRunning", !value.convergeWhileRunning),
				stateLabel: stateLabel(value.convergeWhileRunning)
			}),
			h("p", { className: "xiao-settings__hint", key: "statuses" }, [
				t("status.idle"), " · ", t("status.sending"), " · ", t("status.running"), " · ",
				t("status.completed"), " · ", t("status.ended"), " · ", t("status.failed"), " · ", t("status.stopped")
			])
		]),

		h(SettingSection, { key: "environment", title: t("environment.section"), description: t("environment.description") }, [
			h(Toggle, {
				checked: value.showOrnament,
				description: t("ornament.description"),
				disabled,
				key: "showOrnament",
				label: t("ornament.label"),
				onChange: () => update("showOrnament", !value.showOrnament),
				stateLabel: stateLabel(value.showOrnament)
			}),
			h(Toggle, {
				checked: value.ambientMotion,
				description: t("ambient.description"),
				disabled,
				key: "ambientMotion",
				label: t("ambient.label"),
				onChange: () => update("ambientMotion", !value.ambientMotion),
				stateLabel: stateLabel(value.ambientMotion)
			}),
			h(Toggle, {
				checked: value.clickRipple,
				description: t("ripple.description"),
				disabled,
				key: "clickRipple",
				label: t("ripple.label"),
				onChange: () => update("clickRipple", !value.clickRipple),
				stateLabel: stateLabel(value.clickRipple)
			})
		]),

		h(SettingSection, { key: "balance", title: t("balance.section"), description: t("balance.section.description") }, [
			h(Toggle, {
				checked: value.balanceEnabled,
				description: t("balance.enable.description"),
				disabled,
				key: "balanceEnabled",
				label: t("balance.enable"),
				onChange: () => update("balanceEnabled", !value.balanceEnabled),
				stateLabel: stateLabel(value.balanceEnabled)
			}),
			h("p", { className: "xiao-settings__hint", key: "threshold" }, `${t("balance.provider")} · ${t("balance.low")}`)
		]),

		h(SettingSection, { className: "xiao-settings__section--last", description: t("actions.section.description"), key: "actions", title: t("actions.section") }, [
			h("div", { className: "xiao-settings__actions" }, [
				h(ActionButton, {
					disabled,
					key: "resetPosition",
					label: t("actions.resetCompanion"),
					onClick: () => updateMany("companionPosition", { companionPosition: { ...DEFAULT_XIAO_SETTINGS.companionPosition } })
				})
			])
		])
	]);
}
