import { readFile } from "node:fs/promises";
import { check, equal, finish } from "./test-helpers.mjs";
import { clearWindRipple, playWindRipple } from "../src/client/motion/click-ripple.js";

function pooledNode() {
	const animations = [];
	const element = (dataset = {}) => ({
		dataset,
		animate() {
			const animation = { cancelled: false, cancel() { this.cancelled = true; } };
			animations.push(animation);
			return animation;
		}
	});
	const parts = new Map([
		[".xiao-wind-ripple__core", element()],
		[".xiao-wind-ripple__ring", element()],
		[".xiao-wind-ripple__arc--one", element()],
		[".xiao-wind-ripple__arc--two", element()]
	]);
	const fragments = Array.from({ length: 8 }, (_, index) => element({ angle: index * 45, distance: 60, delay: index % 4 * 8 }));
	return {
		hidden: true, dataset: {}, style: {}, animations,
		querySelector: selector => parts.get(selector),
		querySelectorAll: () => fragments,
		getAnimations: () => animations.filter(animation => !animation.cancelled)
	};
}

const node = pooledNode();
check(playWindRipple(node, { x: 120, y: 80 }, 1), "a valid burst starts");
equal(node.hidden, false, "an active burst is visible");
const previousFinish = node.animations.at(-1).onfinish;
clearWindRipple(node);
equal(node.hidden, true, "cancellation hides the entire burst");
equal(node.dataset.generation, undefined, "cancellation invalidates completion callbacks");
check(node.animations.every(animation => animation.cancelled), "cancellation releases every child animation");
check(playWindRipple(node, { x: 140, y: 90 }, 2), "a cancelled slot can be reused");
previousFinish();
equal(node.hidden, false, "a stale finish cannot hide a reused slot");
node.animations.at(-1).onfinish();
equal(node.hidden, true, "normal completion hides the slot");
clearWindRipple(node);
clearWindRipple(node);
equal(node.getAnimations().length, 0, "repeated clearing is safe");
equal(playWindRipple(node, { x: NaN, y: 1 }, 3), false, "invalid points never expose a slot");

const css = await readFile(new URL("../src/client/styles.css", import.meta.url), "utf8");
check(/\.xiao-wind-ripple\[hidden\]\s*\{\s*display:\s*none\s*!important;/.test(css), "author CSS explicitly preserves the hidden state");
check(/\.xiao-wind-ripple\s*>\s*i\s*\{[^}]*opacity:\s*0;/.test(css), "cancelled animation fills cannot reveal idle shapes");
finish("ripple lifecycle");
