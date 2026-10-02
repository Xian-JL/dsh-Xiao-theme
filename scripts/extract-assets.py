"""Reproducible asset pipeline for dsh-xiao-theme.

Four untouched source images live next to this project; this script derives the
transparent, size-budgeted assets that the client bundle inlines. The originals
are never modified: they are copied into assets/source/ for archival first.

Run:  python scripts/extract-assets.py
"""

from __future__ import annotations

import shutil
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "assets" / "source"
ASSETS = ROOT / "assets"

ORIGINALS = [
    "Standing_illustration.jpg",
    "Xiao_bird.jpg",
    "Nuo_mask.png",
    "Birthday_celebration.jpg",
]


def log(message: str) -> None:
    print(f"[assets] {message}")


def archive_originals() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    for name in ORIGINALS:
        source = ROOT / name
        if not source.exists():
            raise SystemExit(f"missing source image: {source}")
        target = SOURCE_DIR / name
        if not target.exists() or target.stat().st_size != source.stat().st_size:
            shutil.copy2(source, target)
    log(f"originals archived in {SOURCE_DIR.relative_to(ROOT)}")


def remove_white_background(img: Image.Image, tolerance: int = 18, min_value: int = 196,
                            max_saturation: int = 26, erode: int = 1, feather: float = 0.9) -> Image.Image:
    """Flood-fill the border-connected near-white region so enclosed white
    clothing stays opaque, then feather the resulting mask."""
    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    height, width = rgb.shape[:2]
    minimum = rgb.min(axis=2)
    maximum = rgb.max(axis=2)
    distance = 255 - minimum
    candidate = (distance <= tolerance) & (minimum >= min_value) & ((maximum - minimum) <= max_saturation)

    background = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        for y in (0, height - 1):
            if candidate[y, x] and not background[y, x]:
                background[y, x] = True
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if candidate[y, x] and not background[y, x]:
                background[y, x] = True
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and candidate[ny, nx] and not background[ny, nx]:
                background[ny, nx] = True
                queue.append((nx, ny))

    alpha = np.where(background, 0, 255).astype(np.uint8)
    mask = Image.fromarray(alpha, mode="L")
    # A one pixel erosion removes the white rim left by anti-aliased edges.
    if erode > 0:
        mask = mask.filter(ImageFilter.MinFilter(3 if erode == 1 else 5))
    if feather > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def trim_to_alpha(img: Image.Image, pad: int = 4) -> Image.Image:
    alpha = np.asarray(img.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return img
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(img.width, int(xs.max()) + 1 + pad)
    bottom = min(img.height, int(ys.max()) + 1 + pad)
    return img.crop((left, top, right, bottom))


def supersample(img: Image.Image, factor: float, target_width: int) -> Image.Image:
    """Light super-resolution: upscale with Lanczos, then downsample to the
    shipping width and re-sharpen. Never presented as original resolution."""
    big = img.resize((max(1, round(img.width * factor)), max(1, round(img.height * factor))), Image.LANCZOS)
    if big.width > target_width:
        height = max(1, round(big.height * target_width / big.width))
        big = big.resize((target_width, height), Image.LANCZOS)
    return big.filter(ImageFilter.UnsharpMask(radius=1.1, percent=78, threshold=3))


def save_webp(img: Image.Image, relative: str, quality: int, method: int = 6) -> None:
    path = ASSETS / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="WEBP", quality=quality, method=method)
    alpha = np.asarray(img.convert("RGBA").getchannel("A"))
    transparent = float((alpha < 8).mean() * 100)
    log(f"{relative}: {img.width}x{img.height} {path.stat().st_size / 1024:.0f} KB "
        f"transparent={transparent:.1f}%")


def elliptical_vignette(img: Image.Image, fade: float = 0.16) -> Image.Image:
    """Soft elliptical alpha falloff so a rectangular source crop reads as an
    intentional decoration rather than a cut-out rectangle."""
    width, height = img.size
    ys, xs = np.mgrid[0:height, 0:width]
    cx, cy = (width - 1) / 2, (height - 1) / 2
    rx, ry = width / 2, height / 2
    radius = np.sqrt(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2)
    alpha = np.clip((1.0 - radius) / fade, 0.0, 1.0)
    alpha = np.clip(alpha * 255 * 0.92, 0, 255).astype(np.uint8)
    out = img.convert("RGBA")
    existing = np.asarray(out.getchannel("A")).astype(np.float32)
    out.putalpha(Image.fromarray(np.clip(existing * alpha / 255.0, 0, 255).astype(np.uint8), mode="L"))
    return out


def bottom_fade(img: Image.Image, pixels: int) -> Image.Image:
    """Fade the bottom edge to transparent where the source crop cut the subject."""
    width, height = img.size
    alpha = np.asarray(img.getchannel("A")).astype(np.float32)
    ramp = np.linspace(1.0, 0.0, pixels, dtype=np.float32)
    alpha[height - pixels:height, :] *= ramp[:, None]
    out = img.copy()
    out.putalpha(Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), mode="L"))
    return out


def build_standing() -> None:
    img = Image.open(SOURCE_DIR / "Standing_illustration.jpg")
    cut = remove_white_background(img, tolerance=16, min_value=200, max_saturation=24)
    cut = trim_to_alpha(cut, pad=6)
    prepared = supersample(cut, factor=2.0, target_width=1080)
    save_webp(prepared, "character/xiao-standing.webp", quality=82)


def build_companion() -> None:
    img = Image.open(SOURCE_DIR / "Xiao_bird.jpg").convert("RGB")
    # The source carries a community watermark in its bottom-right corner. The
    # surrounding pixels are plain background, so the strip is cleared before the
    # flood fill instead of being carried into the shipped asset. The author of
    # that watermark is deliberately not inferred from the mark itself.
    cleared = img.copy()
    cleared.paste((255, 255, 255), (466, 630, cleared.width, cleared.height))
    cut = remove_white_background(cleared, tolerance=20, min_value=198, max_saturation=28)
    cut = trim_to_alpha(cut, pad=4)
    cut = bottom_fade(cut, 14)
    prepared = supersample(cut, factor=2.0, target_width=640)
    save_webp(prepared, "companion/xiao-companion.webp", quality=86)

    # A square around the face, expressed as ratios so a future source swap keeps
    # the framing meaningful.
    side = round(cut.width * 0.56)
    centre_x = round(cut.width * 0.47)
    centre_y = round(cut.height * 0.46)
    left = max(0, min(cut.width - side, centre_x - side // 2))
    top = max(0, min(cut.height - side, centre_y - side // 2))
    head = cut.crop((left, top, left + side, top + side))
    head = supersample(head, factor=2.0, target_width=224)
    save_webp(head, "companion/xiao-companion-mark.webp", quality=88)


def build_nuo_mask() -> None:
    img = Image.open(SOURCE_DIR / "Nuo_mask.png").convert("RGB")
    # The only complete mask in the source sits in the right third of the banner.
    crop = img.crop((430, 0, 790, 400))
    crop = crop.resize((round(crop.width * 1.5), round(crop.height * 1.5)), Image.LANCZOS)
    crop = ImageEnhance.Contrast(crop).enhance(1.24)
    crop = ImageEnhance.Color(crop).enhance(1.12)
    crop = crop.filter(ImageFilter.UnsharpMask(radius=1.8, percent=155, threshold=2))
    crop = elliptical_vignette(crop, fade=0.14)
    padded = Image.new("RGBA", (crop.width, crop.height + 60), (0, 0, 0, 0))
    padded.paste(crop, (0, 0))
    faded = bottom_fade(padded, 120)
    save_webp(faded, "ornaments/nuo-mask-mark.webp", quality=90)


def build_celebration() -> None:
    img = Image.open(SOURCE_DIR / "Birthday_celebration.jpg")
    card = img.resize((540, 540), Image.LANCZOS)
    save_webp(card, "showcase/celebration-card.webp", quality=82)


def main() -> int:
    archive_originals()
    build_standing()
    build_companion()
    build_nuo_mask()
    build_celebration()
    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
