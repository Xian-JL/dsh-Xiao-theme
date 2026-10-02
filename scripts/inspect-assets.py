import sys
from PIL import Image
import numpy as np

for path in sys.argv[1:]:
    im = Image.open(path)
    print("=" * 70)
    print(path, im.format, im.mode, im.size)
    arr = np.asarray(im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB"))
    if arr.ndim == 2:
        arr = np.stack([arr] * 3, axis=-1)
    h, w = arr.shape[:2]
    corners = {
        "TL": arr[0, 0][:3], "TR": arr[0, w - 1][:3],
        "BL": arr[h - 1, 0][:3], "BR": arr[h - 1, w - 1][:3],
    }
    print("corners:", {k: tuple(int(v) for v in val) for k, val in corners.items()})
    rgb = arr[..., :3].astype(np.int16)
    mn = rgb.min(axis=2); mx = rgb.max(axis=2)
    white = (mn > 200) & ((mx - mn) < 26)
    print(f"near-white coverage: {white.mean() * 100:.1f}%")
    if im.mode in ("RGBA", "LA", "P") and arr.shape[-1] == 4:
        alpha = arr[..., 3]
        print(f"alpha: min={alpha.min()} max={alpha.max()} transparent={ (alpha < 8).mean()*100:.1f}%")
        ys, xs = np.where(alpha > 8)
        if len(xs):
            print(f"alpha bbox: x {xs.min()}..{xs.max()}  y {ys.min()}..{ys.max()}")
    # saturation / colourfulness
    print(f"mean rgb: {rgb.reshape(-1, 3).mean(axis=0).round(1)}")
