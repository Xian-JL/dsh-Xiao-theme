/**
 * Companion geometry.
 *
 * Positions are stored as percentages of the overlay so they survive window
 * resizes, sidebar changes and display scaling. Every function here is pure:
 * clamping, dragging and keyboard nudging are all testable without a DOM.
 */
export const XIAO_COMPANION_PX = Object.freeze({ sm: 56, md: 72, lg: 92 });
export const XIAO_COMPANION_DOCK = Object.freeze({ x: 95, y: 90 });
export const XIAO_COMPANION_MARGIN_PX = 8;
export const XIAO_NUDGE_PX = 8;
export const XIAO_NUDGE_FAST_PX = 32;
export const XIAO_DRAG_THRESHOLD_PX = 4;

const DIRECTIONS = Object.freeze({
	ArrowDown: [0, 1],
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1]
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function companionPixelSize(size) {
	return XIAO_COMPANION_PX[size] ?? XIAO_COMPANION_PX.md;
}

/** Choose a status-panel side and vertical direction that fit the companion's current safe area. */
export function resolveCompanionPanelPlacement(position, rect, companionSizePx, panel = { width: 260, height: 320, gap: 14, margin: 12 }) {
	if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
		return { horizontal: "center", vertical: "up" };
	}
	const safe = displayCompanionPosition(position);
	const centerX = safe.x / 100 * rect.width;
	const centerY = safe.y / 100 * rect.height;
	const halfCompanion = Math.max(0, Number.isFinite(companionSizePx) ? companionSizePx : 0) / 2;
	const panelWidth = Math.min(panel.width, Math.max(0, rect.width - panel.margin * 2));
	const panelHeight = Math.min(panel.height, Math.max(0, rect.height * 0.72));
	const roomRight = rect.width - centerX - halfCompanion - panel.gap - panel.margin;
	const roomLeft = centerX - halfCompanion - panel.gap - panel.margin;
	const roomDown = rect.height - centerY - halfCompanion - panel.gap - panel.margin;
	const roomUp = centerY - halfCompanion - panel.gap - panel.margin;
	const horizontal = roomRight >= panelWidth ? "right"
		: roomLeft >= panelWidth ? "left" : "center";
	const vertical = roomDown >= panelHeight ? "down"
		: roomUp >= panelHeight ? "up"
			: roomDown >= roomUp ? "down" : "up";
	return { horizontal, vertical };
}

/** Guard against a stored position from a much larger or smaller window. */
export function displayCompanionPosition(position) {
	const x = Number.isFinite(position?.x) ? clamp(position.x, 0, 100) : XIAO_COMPANION_DOCK.x;
	const y = Number.isFinite(position?.y) ? clamp(position.y, 0, 100) : XIAO_COMPANION_DOCK.y;
	return { x, y };
}

/**
 * Keep the whole companion inside the overlay minus a small margin, expressed
 * in percent of the overlay box.
 */
export function clampCompanionPercent(position, rect, sizePx) {
	const safe = displayCompanionPosition(position);
	if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
		rect.width <= 0 || rect.height <= 0) return safe;
	const half = sizePx / 2 + XIAO_COMPANION_MARGIN_PX;
	const minX = Math.min(50, half / rect.width * 100);
	const minY = Math.min(50, half / rect.height * 100);
	return {
		x: Number(clamp(safe.x, minX, 100 - minX).toFixed(3)),
		y: Number(clamp(safe.y, minY, 100 - minY).toFixed(3))
	};
}

/** Convert a pointer position into a clamped overlay percentage. */
export function computeDragPosition(clientX, clientY, drag) {
	const { overlayRect, offsetX, offsetY, halfWidth, halfHeight } = drag;
	const localX = clamp(clientX - overlayRect.left - offsetX, halfWidth, overlayRect.width - halfWidth);
	const localY = clamp(clientY - overlayRect.top - offsetY, halfHeight, overlayRect.height - halfHeight);
	return {
		x: Number((localX / overlayRect.width * 100).toFixed(3)),
		y: Number((localY / overlayRect.height * 100).toFixed(3))
	};
}

/** Arrow-key movement. Returns null for keys this control does not own. */
export function nudgeCompanionPosition(position, key, overlayRect, companionRect, fast = false) {
	const direction = DIRECTIONS[key];
	if (!direction || !overlayRect?.width || !overlayRect?.height || !companionRect) return null;
	const distance = fast ? XIAO_NUDGE_FAST_PX : XIAO_NUDGE_PX;
	const current = displayCompanionPosition(position);
	const halfX = companionRect.width / 2 / overlayRect.width * 100;
	const halfY = companionRect.height / 2 / overlayRect.height * 100;
	const minX = Math.min(50, halfX);
	const minY = Math.min(50, halfY);
	return {
		x: Number(clamp(current.x + direction[0] * distance / overlayRect.width * 100, minX, 100 - minX).toFixed(3)),
		y: Number(clamp(current.y + direction[1] * distance / overlayRect.height * 100, minY, 100 - minY).toFixed(3))
	};
}

/** Should a completed pointer gesture count as a drag rather than a click? */
export function isDragGesture(origin, current, threshold = XIAO_DRAG_THRESHOLD_PX) {
	if (!origin || !current) return false;
	return Math.hypot(current.clientX - origin.clientX, current.clientY - origin.clientY) > threshold;
}

/**
 * Position actually rendered: the welcome page temporarily docks the companion
 * without ever overwriting the user's saved free position.
 */
export function presentedCompanionPosition({ docked, dragging, override, position }) {
	if (docked && !dragging && !override) return { ...XIAO_COMPANION_DOCK };
	return displayCompanionPosition(position);
}

export function presentedCompanionFlip({ docked, override, flipped }) {
	if (docked && !override) return false;
	return Boolean(flipped);
}
