import { check, close, equal, finish } from "./test-helpers.mjs";
import {
	XIAO_COMPANION_DOCK,
	XIAO_COMPANION_PX,
	clampCompanionPercent,
	companionPixelSize,
	computeDragPosition,
	displayCompanionPosition,
	isDragGesture,
	nudgeCompanionPosition,
	presentedCompanionFlip,
	presentedCompanionPosition
} from "../src/client/companion/position.js";

const overlay = { height: 900, width: 1440 };
const companion = { height: 72, width: 72 };

// --- pixel sizes ------------------------------------------------------------
equal(companionPixelSize("sm"), XIAO_COMPANION_PX.sm, "the small size is resolved");
equal(companionPixelSize("lg"), XIAO_COMPANION_PX.lg, "the large size is resolved");
equal(companionPixelSize("unknown"), XIAO_COMPANION_PX.md, "an unknown size falls back to medium");

// --- stored positions -------------------------------------------------------
equal(displayCompanionPosition({ x: 40, y: 60 }), { x: 40, y: 60 }, "a stored position is preserved");
equal(displayCompanionPosition({ x: -20, y: 400 }), { x: 0, y: 100 }, "an out-of-range stored position is clamped");
equal(displayCompanionPosition(undefined), { x: XIAO_COMPANION_DOCK.x, y: XIAO_COMPANION_DOCK.y },
	"a missing position falls back to the dock");

// --- safe-area clamping -----------------------------------------------------
const clamped = clampCompanionPercent({ x: 100, y: 100 }, overlay, 72);
check(clamped.x < 100 && clamped.y < 100, "the companion is kept inside the safe area");
const clampedLow = clampCompanionPercent({ x: 0, y: 0 }, overlay, 72);
check(clampedLow.x > 0 && clampedLow.y > 0, "the companion never hugs the very corner");
equal(clampCompanionPercent({ x: 50, y: 50 }, undefined, 72), { x: 50, y: 50 },
	"a missing rect leaves the position untouched");
equal(clampCompanionPercent({ x: 50, y: 50 }, { height: 0, width: 0 }, 72), { x: 50, y: 50 },
	"a degenerate rect leaves the position untouched");

// --- dragging ---------------------------------------------------------------
const drag = {
	halfHeight: 36,
	halfWidth: 36,
	offsetX: 0,
	offsetY: 0,
	overlayRect: { height: 900, left: 0, top: 0, width: 1440 }
};
const dragged = computeDragPosition(720, 450, drag);
equal(dragged, { x: 50, y: 50 }, "a drag maps to overlay percentages");
const draggedOut = computeDragPosition(-500, 5000, drag);
check(draggedOut.x >= 0 && draggedOut.y <= 100, "a drag beyond the edge is clamped");
const draggedEdge = computeDragPosition(0, 0, drag);
close(draggedEdge.x, 2.5, 0.01, "the drag clamp reserves half the companion width");

// --- keyboard ---------------------------------------------------------------
const nudgedRight = nudgeCompanionPosition({ x: 50, y: 50 }, "ArrowRight", overlay, companion, false);
close(nudgedRight.x, 50 + 8 / 1440 * 100, 0.01, "an arrow key moves eight pixels");
const nudgedFast = nudgeCompanionPosition({ x: 50, y: 50 }, "ArrowRight", overlay, companion, true);
close(nudgedFast.x, 50 + 32 / 1440 * 100, 0.01, "shift moves thirty-two pixels");
const nudgedUp = nudgeCompanionPosition({ x: 50, y: 50 }, "ArrowUp", overlay, companion, false);
close(nudgedUp.y, 50 - 8 / 900 * 100, 0.01, "vertical movement uses the overlay height");
equal(nudgeCompanionPosition({ x: 50, y: 50 }, "PageDown", overlay, companion, false), null,
	"keys the control does not own are ignored");
equal(nudgeCompanionPosition({ x: 50, y: 50 }, "ArrowRight", undefined, companion, false), null,
	"keyboard movement needs a measurable overlay");
const cornered = nudgeCompanionPosition({ x: 0, y: 0 }, "ArrowLeft", overlay, companion, false);
close(cornered.x, 36 / 1440 * 100, 0.01, "keyboard movement also respects the clamp");

// --- gesture discrimination -------------------------------------------------
check(isDragGesture({ clientX: 0, clientY: 0 }, { clientX: 10, clientY: 0 }), "movement beyond the threshold is a drag");
check(!isDragGesture({ clientX: 0, clientY: 0 }, { clientX: 2, clientY: 0 }), "a tiny movement stays a click");
check(!isDragGesture(null, { clientX: 10, clientY: 0 }), "a missing origin is not a drag");

// --- welcome docking --------------------------------------------------------
const presented = presentedCompanionPosition({ docked: true, dragging: false, override: false, position: { x: 10, y: 20 } });
equal(presented, { x: XIAO_COMPANION_DOCK.x, y: XIAO_COMPANION_DOCK.y }, "the welcome page docks the companion");
const restored = presentedCompanionPosition({ docked: false, dragging: false, override: false, position: { x: 10, y: 20 } });
equal(restored, { x: 10, y: 20 }, "leaving the welcome page restores the saved position");
const draggedOnHero = presentedCompanionPosition({ docked: true, dragging: true, override: false, position: { x: 30, y: 40 } });
equal(draggedOnHero, { x: 30, y: 40 }, "dragging on the welcome page keeps the live position");
check(!presentedCompanionFlip({ docked: true, override: false, flipped: true }), "the docked companion faces its default direction");
check(presentedCompanionFlip({ docked: false, override: false, flipped: true }), "the saved flip returns in conversation");

finish("companion geometry");
