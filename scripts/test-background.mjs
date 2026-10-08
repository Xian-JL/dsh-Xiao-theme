import assert from "node:assert/strict";
import {
	deriveXiaoAccentPalette,
	contrastRatio,
	extractDominantXiaoAccent
} from "../src/client/background/palette.js";
import {
	xiaoBackgroundDimensions,
	MAX_BACKGROUND_OUTPUT_HEIGHT,
	MAX_BACKGROUND_OUTPUT_WIDTH,
	MAX_BACKGROUND_SOURCE_BYTES,
	MAX_BACKGROUND_SOURCE_PIXELS,
	validateXiaoBackgroundFile
} from "../src/client/background/image.js";
import { DEFAULT_XIAO_SETTINGS, MAX_BACKGROUND_DATA_URL_LENGTH } from "../src/shared/settings.js";
import { getXiaoThemeTokens } from "../src/client/theme/tokens.js";

function solidPixels(color, count = 64) {
	return Uint8ClampedArray.from(Array.from({ length: count }, () => color).flat());
}

assert.match(extractDominantXiaoAccent(solidPixels([39, 170, 145, 255])), /^#[0-9a-f]{6}$/i);
assert.equal(extractDominantXiaoAccent(solidPixels([128, 128, 128, 255])), null,
	"grayscale images do not force an accent color");
assert.equal(extractDominantXiaoAccent(solidPixels([39, 170, 145, 0])), null,
	"transparent pixels do not influence the accent");
assert.equal(extractDominantXiaoAccent(new Uint8ClampedArray([1, 2, 3])), null,
	"malformed pixel buffers fail closed");

for (const sourceAccent of ["#e94256", "#238dd1", "#69aa32", "#9b5cd1", "#e8a225"]) {
	const palette = deriveXiaoAccentPalette(sourceAccent, "#FAFCFB", "#0E1B1E");
	assert.ok(palette, `${sourceAccent} should derive a light/dark accent pair`);
	assert.ok(contrastRatio(palette.light, "#FAFCFB") >= 3, `${sourceAccent} light accent contrast`);
	assert.ok(contrastRatio(palette.dark, "#0E1B1E") >= 3, `${sourceAccent} dark accent contrast`);
	assert.ok(contrastRatio(palette.foregroundLight, palette.light) >= 4.5, `${sourceAccent} light button text contrast`);
	assert.ok(contrastRatio(palette.foregroundDark, palette.dark) >= 4.5, `${sourceAccent} dark button text contrast`);
}
assert.equal(deriveXiaoAccentPalette("not-a-color"), null);

assert.equal(validateXiaoBackgroundFile({ type: "image/png", size: 100 }), true);
assert.equal(validateXiaoBackgroundFile({ type: "image/jpeg", size: 100 }), true);
assert.equal(validateXiaoBackgroundFile({ type: "image/webp", size: 100 }), true);
for (const file of [
	{ type: "image/gif", size: 100 },
	{ type: "image/png", size: 0 },
	{ type: "image/png", size: MAX_BACKGROUND_SOURCE_BYTES + 1 }
]) assert.throws(() => validateXiaoBackgroundFile(file));
assert.throws(() => xiaoBackgroundDimensions(8000, 6000), /too-many-pixels/);
assert.deepEqual(xiaoBackgroundDimensions(4000, 2000), { width: 1920, height: 960 });
assert.equal(MAX_BACKGROUND_SOURCE_PIXELS, 40_000_000);
assert.equal(MAX_BACKGROUND_OUTPUT_WIDTH, 1920);
assert.equal(MAX_BACKGROUND_OUTPUT_HEIGHT, 1080);
assert.ok(MAX_BACKGROUND_DATA_URL_LENGTH > 400_000 && MAX_BACKGROUND_DATA_URL_LENGTH < 600_000);

assert.equal(DEFAULT_XIAO_SETTINGS.customBackgroundImage, "");
assert.equal(DEFAULT_XIAO_SETTINGS.customBackgroundAccent, "");
assert.equal(DEFAULT_XIAO_SETTINGS.backgroundAutoPalette, true);
assert.equal(DEFAULT_XIAO_SETTINGS.backgroundVisibility, 75);
const lowVisibility = getXiaoThemeTokens("", true, 0);
const defaultVisibility = getXiaoThemeTokens("", true, 75);
const highVisibility = getXiaoThemeTokens("", true, 100);
assert.equal(lowVisibility["--dsw-alias-bg-layer-1"].light, "rgba(250, 252, 251, 0.94)");
assert.equal(lowVisibility["--dsw-alias-bg-layer-1"].dark, "rgba(14, 27, 30, 0.92)");
assert.equal(defaultVisibility["--dsw-alias-bg-layer-1"].light, "rgba(250, 252, 251, 0.61)");
assert.equal(defaultVisibility["--dsw-alias-bg-layer-1"].dark, "rgba(14, 27, 30, 0.56)");
assert.equal(highVisibility["--dsw-alias-bg-layer-1"].light, "rgba(250, 252, 251, 0.5)");
assert.equal(highVisibility["--dsw-alias-bg-layer-1"].dark, "rgba(14, 27, 30, 0.44)");

console.log("Xiao custom background, palette, and visibility tests passed.");
