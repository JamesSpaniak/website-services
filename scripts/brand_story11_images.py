#!/usr/bin/env python3
"""Apply Drone Edge logo + brand fonts to story-11 article images."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "news" / "images"
PUBLIC_DIR = ROOT / "drone" / "public" / "images" / "articles"
ICON_SVG = ROOT / "assets" / "Logo" / "SVG" / "Icon" / "IconWhite.svg"
LOGO_SVG = ROOT / "assets" / "Logo" / "SVG" / "Logo" / "LogoWhite.svg"
ICON_PNG = OUT_DIR / "icon-white.png"
LOGO_PNG = OUT_DIR / "logo-white.png"
FONTS = ROOT / "drone" / "node_modules" / "@fontsource"

W, H = 1536, 1024
FOOTER_H = 148
PHOTO_H = H - FOOTER_H
FOOTER_BG = (13, 13, 13)
TITLE_COLOR = (255, 255, 255)
SUBTITLE_COLOR = (201, 201, 201)

# (output, source, title, subtitle, wordmark, spectral, footer_h)
CARDS = [
    ("story-11-hero-careers-deliverables.png", "_photo-hero.png", "DRONE CAREERS", "Beyond the Hobby", True, False, 148),
    ("story-11-ag-multispectral.png", "_photo-ag.png", "PRECISION AG", "Data Not Just Flights", False, True, 188),
    ("story-11-fire-thermal-ops.png", "_photo-fire.png", "FIRE & FORESTRY", "Thermal & Patrol Roles", False, False, 148),
    ("story-11-delivery-logistics.png", "_photo-delivery.png", "DELIVERY OPS", "Compliance & Routes", False, False, 188),
    (
        "story-11-infrastructure-inspection.png",
        "_photo-infrastructure.png",
        "INSPECTION & ENERGY",
        "Higher-Pay Niches",
        False,
        False,
        148,
    ),
]


def render_logos() -> None:
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
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    return img


def _row_is_footer(pixels, w: int, y: int) -> bool:
    """Dark bar or white title text typical of composited footer."""
    step = max(1, w // 40)
    samples = [pixels[x, y][:3] for x in range(0, w, step)]
    avg = sum(sum(p) for p in samples) / (3 * len(samples))
    if avg < 40:
        return True
    bright = sum(1 for p in samples if sum(p) > 520)
    return bright >= max(2, len(samples) // 12)


def prepare_photo(img: Image.Image) -> Image.Image:
    """Remove any prior composited footer (black + white text), keep photo only."""
    w, h = img.size
    pixels = img.load()
    footer_top = h
    for y in range(h - 1, int(h * 0.45), -1):
        if _row_is_footer(pixels, w, y):
            footer_top = y
        elif footer_top < h:
            break
    if footer_top < h * 0.88:
        img = img.crop((0, 0, w, footer_top))
    return img.convert("RGB")


def apply_spectral_overlay(img: Image.Image) -> Image.Image:
    """NDVI-style false-color overlay for precision ag."""
    base = img.convert("RGB")
    r, g, b = base.split()
    vigor = ImageChops.subtract(
        ImageChops.multiply(g, Image.new("L", base.size, 140)),
        ImageChops.multiply(r, Image.new("L", base.size, 55)),
    )
    vigor = ImageOps.autocontrast(vigor, cutoff=1)
    overlay = ImageOps.colorize(
        vigor,
        black=(120, 20, 50),
        mid=(210, 160, 35),
        white=(35, 210, 95),
    )
    overlay = ImageEnhance.Color(overlay).enhance(1.4)
    return Image.blend(base, overlay.convert("RGB"), 0.58)


def compose(
    photo_path: Path,
    title: str,
    subtitle: str,
    show_wordmark: bool,
    spectral: bool,
    footer_h: int = FOOTER_H,
) -> Image.Image:
    photo = prepare_photo(Image.open(photo_path))
    if spectral:
        photo = apply_spectral_overlay(photo)

    photo_h = H - footer_h
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
        nw = W

    canvas = Image.new("RGB", (W, H), FOOTER_BG)
    canvas.paste(photo, ((W - nw) // 2, 0))

    draw = ImageDraw.Draw(canvas)
    title_font = load_font("chakra-petch", 58)
    sub_font = load_font("ibm-plex-sans", 28)
    pad = 40
    footer_top = photo_h

    icon = fit_rgba(Image.open(ICON_PNG), max_h=48)
    icon_y = footer_top + (footer_h - icon.size[1]) // 2
    canvas.paste(icon, (pad, icon_y), icon)

    tx = pad + icon.size[0] + 16
    ty = footer_top + 22
    draw.text((tx, ty), title, font=title_font, fill=TITLE_COLOR)
    bbox = draw.textbbox((tx, ty), title, font=title_font)
    draw.text((tx, bbox[3] + 4), subtitle, font=sub_font, fill=SUBTITLE_COLOR)

    if show_wordmark and LOGO_PNG.exists():
        logo = fit_rgba(Image.open(LOGO_PNG), max_h=32, max_w=300)
        logo_y = footer_top + (footer_h - logo.size[1]) // 2
        canvas.paste(logo, (W - pad - logo.size[0], logo_y), logo)

    return canvas


def main() -> None:
    render_logos()
    for out_name, photo_name, title, subtitle, wordmark, spectral, footer_h in CARDS:
        src = OUT_DIR / photo_name
        dest = OUT_DIR / out_name
        if not src.exists():
            print(f"missing {src}")
            continue
        out = compose(src, title, subtitle, wordmark, spectral, footer_h)
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest, "PNG", optimize=True)
        PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
        out.save(PUBLIC_DIR / out_name, "PNG", optimize=True)
        print(f"ok {out_name}" + (" +spectral" if spectral else ""))


if __name__ == "__main__":
    main()
