import { createElement as h } from "react";

/** Small, dependency-free control primitives for the Xiao settings section. */

export function Toggle({ checked, description, disabled, label, onChange, stateLabel }) {
	return h("button", {
		"aria-checked": checked,
		"aria-label": `${label}：${stateLabel}`,
		className: "xiao-toggle",
		disabled,
		onClick: onChange,
		role: "switch",
		type: "button"
	}, [
		h("span", { key: "copy", className: "xiao-toggle__copy" }, [
			h("span", { key: "label", className: "xiao-toggle__label" }, label),
			description ? h("span", { key: "desc", className: "xiao-toggle__description" }, description) : null
		]),
		h("span", { key: "track", "aria-hidden": "true", className: "xiao-toggle__track" })
	]);
}

export function ChoiceGroup({ disabled, label, onChange, options, value }) {
	return h("div", { className: "xiao-choice" }, [
		h("div", { key: "label", className: "xiao-choice__label" }, label),
		h("div", {
			key: "options",
			"aria-label": label,
			className: "xiao-choice__options",
			role: "group"
		}, options.map(option => h("button", {
			"aria-pressed": option.value === value,
			className: "xiao-choice__button",
			disabled,
			key: option.value,
			onClick: () => onChange(option.value),
			type: "button"
		}, option.label)))
	]);
}

export function SectionHeader({ eyebrow, title, description }) {
	return h("div", { className: "xiao-section-heading" }, [
		eyebrow ? h("span", { key: "eyebrow", className: "xiao-section-heading__eyebrow" }, eyebrow) : null,
		h("h3", { key: "title", className: "xiao-section-heading__title" }, title),
		description ? h("span", { key: "desc", className: "xiao-section-heading__description" }, description) : null
	]);
}

export function ActionButton({ disabled, label, onClick, tone = "neutral" }) {
	return h("button", {
		className: "xiao-action",
		"data-tone": tone,
		disabled,
		onClick,
		type: "button"
	}, label);
}
