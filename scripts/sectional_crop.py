#!/usr/bin/env python3
"""Crop lat/long windows out of an FAA VFR chart GeoTIFF and add red callouts.

Used for retaking blurry course figures from authoritative FAA raster charts
(see assets/courses/faa-107/images/unit-2-3-image-quality-review.md § Retake plan
and docs/tech/sectional-chart-experience-plan.md Phase 1).

Requires rasterio + pillow (not in the system python):
    python3 -m venv /tmp/geotools-venv && /tmp/geotools-venv/bin/pip install rasterio pillow

Example (the three Jacksonville retakes shipped Sep 14 2026):
    /tmp/geotools-venv/bin/python scripts/sectional_crop.py \
      --tif "assets/courses/faa-107/reference/sectionals/jacksonville/Jacksonville SEC.tif" \
      --bbox 28.95 29.55 -81.75 -80.85 \
      --ellipse 29.418 -81.468 29.368 -81.352 \
      --out alert-area-a-293-jacksonville-sec.png

Marks take two lat/lon corners (top-left, bottom-right). Repeatable. Iterate by
rendering, viewing the PNG, and nudging coordinates until the callout is clean.
"""
import argparse

import numpy as np
import rasterio
from rasterio.warp import transform as rio_transform
from rasterio.windows import Window
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
RED = (220, 20, 20)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tif", required=True, help="FAA chart GeoTIFF (palette or RGB)")
    ap.add_argument("--bbox", nargs=4, type=float, required=True,
                    metavar=("LAT_MIN", "LAT_MAX", "LON_MIN", "LON_MAX"))
    ap.add_argument("--ellipse", nargs=4, type=float, action="append", default=[],
                    metavar=("LAT0", "LON0", "LAT1", "LON1"), help="red ellipse callout (repeatable)")
    ap.add_argument("--rect", nargs=4, type=float, action="append", default=[],
                    metavar=("LAT0", "LON0", "LAT1", "LON1"), help="red rectangle callout (repeatable)")
    ap.add_argument("--out", required=True, help="output PNG path")
    ap.add_argument("--max-px", type=int, default=1600, help="long-edge limit (default 1600)")
    ap.add_argument("--stroke", type=int, default=14, help="callout stroke width in native px")
    args = ap.parse_args()

    src = rasterio.open(args.tif)
    lat_min, lat_max, lon_min, lon_max = args.bbox
    xs, ys = rio_transform("EPSG:4326", src.crs, [lon_min, lon_max], [lat_min, lat_max])
    (r1, c0) = src.index(xs[0], ys[0])
    (r0, c1) = src.index(xs[1], ys[1])
    r0, r1 = sorted((r0, r1))
    c0, c1 = sorted((c0, c1))
    r0, c0 = max(0, r0), max(0, c0)
    r1, c1 = min(src.height, r1), min(src.width, c1)

    data = src.read(window=Window(c0, r0, c1 - c0, r1 - r0))
    if src.count == 1 and src.colormap(1):
        lut = np.zeros((256, 3), dtype=np.uint8)
        for k, v in src.colormap(1).items():
            lut[k] = v[:3]
        img = Image.fromarray(lut[data[0]])
    else:
        img = Image.fromarray(np.transpose(data[:3], (1, 2, 0)))
    img = img.convert("RGB")

    draw = ImageDraw.Draw(img)

    def px(lat: float, lon: float) -> tuple[int, int]:
        x, y = rio_transform("EPSG:4326", src.crs, [lon], [lat])
        rr, cc = src.index(x[0], y[0])
        return cc - c0, rr - r0

    for kind, marks in (("ellipse", args.ellipse), ("rect", args.rect)):
        for la0, lo0, la1, lo1 in marks:
            x0, y0 = px(la0, lo0)
            x1, y1 = px(la1, lo1)
            box = (min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
            (draw.ellipse if kind == "ellipse" else draw.rectangle)(box, outline=RED, width=args.stroke)

    if max(img.size) > args.max_px:
        s = args.max_px / max(img.size)
        img = img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS)
    img.save(args.out)
    print(f"{args.out}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
