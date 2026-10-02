import { check, close, equal, finish } from "./test-helpers.mjs";
import {
	XIAO_PARTICLE_MAX,
	xiaoParticleCount,
	xiaoParticleIndices,
	xiaoParticleStyle
} from "../src/client/motion/particles.js";
import {
	XIAO_RIPPLE_DURATION_MS,
	XIAO_RIPPLE_FRAGMENT_COUNT,
	XIAO_RIPPLE_POOL_SIZE,
	rippleFragmentMotion,
	ripplePoolSlot,
	toOverlayPoint
} from "../src/client/motion/click-ripple.js";
import { XIAO_PARALLAX_MAX_PX, xiaoParallaxOffset } from "../src/client/motion/parallax-model.js";
import {
	XIAO_REDUCED_TRANSITION_MS,
	XIAO_TRANSITION_MS,
	detectXiaoHero,
	isXiaoHeroSettled,
	isXiaoHeroTarget,
	stableXiaoPagePhase,
	transitionXiaoPagePhase
} from "../src/client/scene/phase-model.js";

// --- particles --------------------------------------------------------------
equal(xiaoParticleCount("minimal", true, false), 6, "the minimal preset keeps a handful of motes");
equal(xiaoParticleCount("balanced", true, false), 18, "the balanced preset uses eighteen motes");
equal(xiaoParticleCount("immersive", true, false), 28, "the immersive preset uses twenty-eight motes");
equal(xiaoParticleCount("immersive", false, false), 0, "disabling ambience removes every mote");
equal(xiaoParticleCount("immersive", true, true), 14, "converging halves the layer instead of deleting it");
equal(xiaoParticleCount("unknown", true, false), 18, "an unknown intensity falls back to balanced");
check(xiaoParticleCount("immersive", true, false) <= XIAO_PARTICLE_MAX.immersive, "the particle cap is respected");
equal(xiaoParticleIndices("balanced", true, false).length, 18, "index generation matches the count");
equal(xiaoParticleIndices("balanced", false, false), [], "no ambience yields no indices");

const style = xiaoParticleStyle(3, 18);
const repeat = xiaoParticleStyle(3, 18);
equal(style, repeat, "particle presentation is deterministic");
const left = Number.parseFloat(style["--xiao-mote-left"]);
const top = Number.parseFloat(style["--xiao-mote-top"]);
check(left >= 0 && left <= 100, "a mote stays horizontally inside the viewport");
check(top >= 0 && top <= 100, "a mote stays vertically inside the viewport");
check(Number.parseFloat(style["--xiao-mote-opacity"]) <= 0.58, "motes stay visually restrained");
const durations = new Set(xiaoParticleIndices("immersive", true, false).map(index => xiaoParticleStyle(index, 28)["--xiao-mote-duration"]));
check(durations.size > 4, "mote periods are not synchronised");

// --- wind traces ------------------------------------------------------------
equal(XIAO_RIPPLE_POOL_SIZE, 6, "the wind-trace pool is fixed at six nodes");
equal(XIAO_RIPPLE_FRAGMENT_COUNT, 8, "a wind trace uses eight fragments");
equal(XIAO_RIPPLE_DURATION_MS, 260, "the wind trace stays in the 220-280 ms band");
equal(ripplePoolSlot(0), 0, "the first burst uses the first slot");
equal(ripplePoolSlot(6), 0, "the pool wraps around");
equal(ripplePoolSlot(7), 1, "the pool advances one slot per burst");
equal(ripplePoolSlot(-1), 5, "a negative sequence wraps safely");
const fragment = rippleFragmentMotion(2);
equal(fragment, rippleFragmentMotion(2), "fragment motion is deterministic");
check(fragment.distance >= 60 && fragment.distance <= 96, "tripled fragments stay inside the expanded bounded radius");
check(rippleFragmentMotion(7).angle > rippleFragmentMotion(0).angle, "fragments are distributed around the burst");

// --- overlay points ---------------------------------------------------------
const rect = { height: 800, left: 10, top: 20, width: 1200 };
equal(toOverlayPoint(110, 220, rect), { x: 100, y: 200 }, "a client point is translated into the overlay");
equal(toOverlayPoint(-50, 10, rect), null, "points outside the overlay are rejected");
equal(toOverlayPoint(Number.NaN, 10, rect), null, "non-finite points are rejected");
equal(toOverlayPoint(10, 10, null), null, "a missing rect is rejected");

// --- parallax ---------------------------------------------------------------
equal(XIAO_PARALLAX_MAX_PX, 10.5, "parallax is capped at three times the original 3.5 px");
const centre = xiaoParallaxOffset(610, 420, rect);
close(centre.x, 0, 0.001, "the viewport centre is neutral");
const corner = xiaoParallaxOffset(1210, 820, rect);
check(Math.abs(corner.x) <= XIAO_PARALLAX_MAX_PX && Math.abs(corner.y) <= XIAO_PARALLAX_MAX_PX,
	"parallax never exceeds its cap");
check(Math.abs(corner.x - XIAO_PARALLAX_MAX_PX) < 0.01, "the far edge reaches the cap but no further");
const small = xiaoParallaxOffset(300, 300, { height: 600, left: 0, top: 0, width: 700 });
equal(small, { x: 0, y: 0 }, "narrow viewports disable parallax entirely");
check(xiaoParallaxOffset(0, 0, rect).x < 0, "the left edge offsets in the opposite direction");

// --- phase model ------------------------------------------------------------
equal(XIAO_TRANSITION_MS, 700, "the character transition is 700 ms");
equal(XIAO_REDUCED_TRANSITION_MS, 80, "reduced motion collapses the transition");
check(detectXiaoHero({ querySelector: selector => selector === "[data-phase='hero']" }), "the hero phase is detected from DSH's marker");
check(!detectXiaoHero({ querySelector: () => null }), "a conversation page is not a hero page");
equal(stableXiaoPagePhase(true), "hero", "a settled hero page is the hero phase");
equal(stableXiaoPagePhase(false), "conversation", "a settled conversation page is conversation");
equal(transitionXiaoPagePhase(true), "entering-hero", "entering the hero page is a transition");
equal(transitionXiaoPagePhase(false), "leaving-hero", "leaving the hero page is a reverse transition");
check(isXiaoHeroTarget("entering-hero") && isXiaoHeroTarget("hero"), "both hero phases show the composition");
check(!isXiaoHeroSettled("entering-hero"), "parallax waits for the settled hero phase");
check(isXiaoHeroSettled("hero"), "the settled hero phase allows parallax");

finish("motion");
