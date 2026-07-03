#!/usr/bin/env python3
"""Compose branded hero images for school outreach articles."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "news" / "images"
PUBLIC_DIR = ROOT / "drone" / "public" / "images" / "articles"
ICON_SVG = ROOT / "assets" / "visuals" / "Logo" / "SVG" / "Icon" / "IconWhite.svg"
LOGO_SVG = ROOT / "assets" / "visuals" / "Logo" / "SVG" / "Logo" / "LogoWhite.svg"
ICON_PNG = OUT_DIR / "icon-white.png"
LOGO_PNG = OUT_DIR / "logo-white.png"
FONTS = ROOT / "drone" / "node_modules" / "@fontsource"

W, H = 1536, 1024
FOOTER_H = 148
FOOTER_BG = (13, 13, 13)
TITLE_COLOR = (255, 255, 255)
SUBTITLE_COLOR = (201, 201, 201)

CARDS = [
    (
        "school-01-part-107-cte-classroom-hero.png",
        "school-01-photo-base.png",
        "PART 107 IN CTE",
        "Classroom & Teacher Visibility",
    ),
    (
        "school-02-funding-drone-programs-hero.png",
        "school-02-photo-base.png",
        "FUNDING DRONE PROGRAMS",
        "Language That Helps",
    ),
]


def render_logos() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for svg, dest in ((ICON_SVG, ICON_PNG), (LOGO_SVG, LOGO_PNG)):
        subprocess.run(
            ["npx", "--yes", "@resvg/resvg-js-cli", str(svg), str(dest)],
            cwd=ROOT / "drone",
            check=True,
            capture_output=True,
        )


def load_font(name: str, size: int):
    weight = {"chakra-petch": "600", "ibm-plex-sans": "400"}.get(name, "400")
    candidates = sorted((FONTS / name / "files").glob(f"{name}-latin-{weight}-normal.woff2"))
    if not candidates:
        candidates = sorted((FONTS / name / "files").glob(f"{name}-latin-*-normal.woff2"))
    return ImageFont.truetype(str(candidates[0]), size) if candidates else ImageFont.load_default()


def fit_rgba(img: Image.Image, max_w: int | None = None, max_h: int | None = None) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    scale = 1.0
    if max_h:
        scale = min(scale, max_h / h)
    if max_w:
        scale = min(scale, max_w / w)
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    return img


def compose(photo_path: Path, title: str, subtitle: str) -> Image.Image:
    photo = Image.open(photo_path).convert("RGB")
    photo_h = H - FOOTER_H
    pw, ph = photo.size
    scale = max(W / pw, photo_h / ph)
    nw, nh = int(pw * scale), int(ph * scale)
    photo = photo.resize((nw, nh), Image.Resampling.LANCZOS)
    if nh > photo_h:
        crop_top = (nh - photo_h) // 2
        photo = photo.crop((0, crop_top, nw, crop_top + photo_h))
        nh = photo_h
    if nw > W:
        crop_left = (nw - W) // 2
        photo = photo.crop((crop_left, 0, crop_left + W, nh))

    canvas = Image.new("RGB", (W, H), FOOTER_BG)
    canvas.paste(photo, ((W - photo.size[0]) // 2, 0))

    draw = ImageDraw.Draw(canvas)
    title_font = load_font("chakra-petch", 52)
    sub_font = load_font("ibm-plex-sans", 26)
    pad = 40
    footer_top = photo_h

    icon = fit_rgba(Image.open(ICON_PNG), max_h=48)
    icon_y = footer_top + (FOOTER_H - icon.size[1]) // 2
    canvas.paste(icon, (pad, icon_y), icon)

    tx = pad + icon.size[0] + 16
    ty = footer_top + 24
    draw.text((tx, ty), title, font=title_font, fill=TITLE_COLOR)
    bbox = draw.textbbox((tx, ty), title, font=title_font)
    draw.text((tx, bbox[3] + 4), subtitle, font=sub_font, fill=SUBTITLE_COLOR)

    if LOGO_PNG.exists():
        logo = fit_rgba(Image.open(LOGO_PNG), max_h=32, max_w=300)
        logo_y = footer_top + (FOOTER_H - logo.size[1]) // 2
        canvas.paste(logo, (W - pad - logo.size[0], logo_y), logo)

    return canvas


def main() -> None:
    if len(sys.argv) > 1:
        for src_arg in sys.argv[1:]:
            src = Path(src_arg)
            dest = OUT_DIR / src.name
            shutil.copy2(src, dest)
            print(f"copied {src} -> {dest}")

    render_logos()
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for out_name, photo_name, title, subtitle in CARDS:
        src = OUT_DIR / photo_name
        if not src.exists():
            print(f"missing {src}")
            sys.exit(1)
        out = compose(src, title, subtitle)
        dest = OUT_DIR / out_name
        out.save(dest, "PNG", optimize=True)
        out.save(PUBLIC_DIR / out_name, "PNG", optimize=True)
        print(f"ok {out_name}")


if __name__ == "__main__":
    main()
