#!/usr/bin/env python3
"""Build Drone Edge merch print files (SVG, vector-only) + flat tee mockups.

Usage (macOS, needs Google Chrome for PNG rendering):
    python3 -m venv /tmp/merchvenv && /tmp/merchvenv/bin/pip install fonttools
    MERCH_FONT_DIR=/tmp/merchfonts /tmp/merchvenv/bin/python scripts/build_merch_art.py

Outputs to assets/visuals/Assets/Merch/{print,mockups}. All text is converted to
outlines, so the SVGs need no fonts installed at the print shop.

Units: design SVGs use a viewBox where 100 units = 1 inch and carry physical
width/height in inches, so shops receive true-size vector art.
"""
import os
import re
import subprocess
import sys

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ICON_SVG = f"{REPO}/assets/visuals/Logo/SVG/Icon/IconWhite.svg"
LOGO_SVG = f"{REPO}/assets/visuals/Logo/SVG/Logo/LogoWhite.svg"
# Brand fonts (Google Fonts, OFL). Download the TTFs into this folder first:
#   ChakraPetch-SemiBold.ttf, SpaceMono-Regular.ttf
#   https://github.com/google/fonts/tree/main/ofl/chakrapetch  ·  .../ofl/spacemono
FONT_DIR = os.environ.get("MERCH_FONT_DIR", "/tmp/merchfonts")
OUT = f"{REPO}/assets/visuals/Assets/Merch"
PRINT_DIR = f"{OUT}/print"
MOCK_DIR = f"{OUT}/mockups"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DPI = 300
U = 100.0  # svg units per inch

os.makedirs(PRINT_DIR, exist_ok=True)
os.makedirs(MOCK_DIR, exist_ok=True)


# ---------------------------------------------------------------- source art
def read_paths(path):
    src = open(path, encoding="utf-8").read()
    vb = re.search(r'viewBox="([^"]+)"', src).group(1).split()
    w, h = float(vb[2]), float(vb[3])
    ds = re.findall(r'<path[^>]*\bd="([^"]+)"', src)
    return w, h, ds


ICON_W, ICON_H, ICON_PATHS = read_paths(ICON_SVG)
LOGO_W, LOGO_H, LOGO_PATHS = read_paths(LOGO_SVG)
# In LogoWhite.svg the first path is the icon; the rest are the letterforms.
WORD_PATHS = LOGO_PATHS[1:]
# Measure wordmark text extent inside the logo viewBox (x of first glyph → right edge).
_xs = [float(x) for x in re.findall(r"M([0-9.]+),", " ".join(WORD_PATHS))]
WORD_X0 = min(_xs)  # ~121 in logo units
WORD_W = LOGO_W - WORD_X0
WORD_H = LOGO_H


def group(paths, transform, fill="#fff"):
    inner = "\n".join(f'    <path fill="{fill}" d="{d}"/>' for d in paths)
    return f'  <g transform="{transform}">\n{inner}\n  </g>'


def icon(x, y, size_in):
    """Icon with top-left at (x,y) inches, size_in inches square."""
    s = size_in * U / ICON_W
    return group(ICON_PATHS, f"translate({x*U:.3f},{y*U:.3f}) scale({s:.6f})")


def icon_dims(size_in):
    return size_in, size_in * ICON_H / ICON_W


def lockup(x, y, width_in):
    """Full horizontal logo (icon + wordmark) with top-left at (x,y), width in inches."""
    s = width_in * U / LOGO_W
    return group(LOGO_PATHS, f"translate({x*U:.3f},{y*U:.3f}) scale({s:.6f})")


def lockup_dims(width_in):
    return width_in, width_in * LOGO_H / LOGO_W


def wordmark(x, y, width_in):
    """Letterforms only, top-left at (x,y), width in inches."""
    s = width_in * U / WORD_W
    return group(WORD_PATHS, f"translate({x*U:.3f},{y*U:.3f}) scale({s:.6f}) translate({-WORD_X0:.3f},0)")


def wordmark_dims(width_in):
    return width_in, width_in * WORD_H / WORD_W


# ---------------------------------------------------------------- text → paths
_fonts = {}


def font(name):
    if name not in _fonts:
        _fonts[name] = TTFont(f"{FONT_DIR}/{name}.ttf")
    return _fonts[name]


def text_paths(txt, fontname, cap_in, tracking=0.0):
    """Return (paths, width_in, height_in) for txt rendered at cap height cap_in.

    tracking is extra letter spacing as a fraction of em.
    Height reported is cap height (ascender of caps), y=0 at cap top.
    """
    f = font(fontname)
    upm = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    os2 = f["OS/2"]
    cap = getattr(os2, "sCapHeight", 0) or upm * 0.7
    scale = cap_in * U / cap  # svg units per font unit
    x = 0.0
    paths = []
    for ch in txt:
        gname = cmap.get(ord(ch))
        if gname is None:
            gname = cmap.get(ord("?"))
        adv = hmtx[gname][0]
        if ch != " ":
            pen = SVGPathPen(gs)
            # font units: y up. Map to svg: x*scale + x, y -> cap*scale - y*scale
            tpen = TransformPen(pen, (scale, 0, 0, -scale, x, cap * scale))
            gs[gname].draw(tpen)
            d = pen.getCommands()
            if d:
                paths.append(d)
        x += adv * scale + tracking * upm * scale
    width_in = (x - tracking * upm * scale) / U
    return paths, width_in, cap_in


def text(x, y, txt, fontname, cap_in, tracking=0.0, align="left"):
    paths, w, h = text_paths(txt, fontname, cap_in, tracking)
    if align == "center":
        x = x - w / 2
    elif align == "right":
        x = x - w
    return group(paths, f"translate({x*U:.3f},{y*U:.3f})"), w, h


# ---------------------------------------------------------------- svg writer
def write_svg(name, w_in, h_in, body, note):
    svg = (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<!-- Drone Edge merch art: {note}. White ink on dark garments. -->\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w_in:.3f}in" height="{h_in:.3f}in" '
        f'viewBox="0 0 {w_in*U:.3f} {h_in*U:.3f}">\n{body}\n</svg>\n'
    )
    path = f"{PRINT_DIR}/{name}.svg"
    open(path, "w").write(svg)
    return path, svg


def svg_to_png(svg_text, w_in, h_in, png_path, dpi=DPI):
    """Render via Chrome headless to a transparent PNG at dpi."""
    wpx, hpx = round(w_in * dpi), round(h_in * dpi)
    px_svg = re.sub(r'width="[^"]+in" height="[^"]+in"', f'width="{wpx}" height="{hpx}"', svg_text, count=1)
    html = (
        "<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}"
        "svg{display:block}</style></head><body>" + px_svg + "</body></html>"
    )
    os.makedirs("/tmp/merch", exist_ok=True)
    tmp = "/tmp/merch/_render.html"
    open(tmp, "w").write(html)
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--default-background-color=00000000", f"--window-size={wpx},{hpx}",
         f"--screenshot={png_path}", f"file://{tmp}"],
        check=True, capture_output=True,
    )
    subprocess.run(["sips", "-s", "dpiWidth", str(dpi), "-s", "dpiHeight", str(dpi), png_path], check=True, capture_output=True)


# ---------------------------------------------------------------- designs
PAD = 0.15  # inch margin around art in print files
files = []


def emit(name, w, h, body, note, png=True):
    W, H = w + 2 * PAD, h + 2 * PAD
    path, svg = write_svg(name, W, H, body, note)
    files.append((name, W, H, note))
    if png:
        svg_to_png(svg, W, H, f"{PRINT_DIR}/{name}.png")
    return svg


# 1. Icon — sleeve (2.5") and left chest (3")
for size, tag, where in [(2.5, "sleeve", "left sleeve"), (3.0, "leftchest", "left chest")]:
    w, h = icon_dims(size)
    emit(f"DE_icon_{tag}_{size:g}in", w, h, icon(PAD, PAD, size), f"icon {size}in for {where}")

# 2. Horizontal lockup — left chest 4", center chest 10", back 12"
for width, tag in [(4.0, "leftchest"), (10.0, "chest"), (12.0, "back")]:
    w, h = lockup_dims(width)
    emit(f"DE_lockup_horizontal_{tag}_{width:g}in", w, h, lockup(PAD, PAD, width), f"horizontal logo {width}in wide, {tag}")

# 3. Stacked lockup — icon over wordmark, center chest (~5.5" wide)
def stacked(icon_in, word_in, gap_in):
    iw, ih = icon_dims(icon_in)
    ww, wh = wordmark_dims(word_in)
    W = max(iw, ww)
    body = icon(PAD + (W - iw) / 2, PAD, icon_in)
    body += "\n" + wordmark(PAD + (W - ww) / 2, PAD + ih + gap_in, word_in)
    return body, W, ih + gap_in + wh


body, w, h = stacked(2.6, 5.5, 0.45)
emit("DE_lockup_stacked_chest_5.5in", w, h, body, "stacked icon over wordmark, center chest")

# 4. Stacked lockup + tagline (site title) in Chakra Petch
_, lw_, lh_ = stacked(2.6, 5.5, 0.45)
_, tw, th = text_paths("FAA CERTIFICATION & DRONE EDUCATION", "ChakraPetch-SemiBold", 0.22, 0.08)
W = max(lw_, tw)
iw_, ih_ = icon_dims(2.6)
ww_, wh_ = wordmark_dims(5.5)
body = icon(PAD + (W - iw_) / 2, PAD, 2.6)
body += "\n" + wordmark(PAD + (W - ww_) / 2, PAD + ih_ + 0.45, 5.5)
tag_g, _, _ = text(PAD + W / 2, PAD + lh_ + 0.35, "FAA CERTIFICATION & DRONE EDUCATION", "ChakraPetch-SemiBold", 0.22, tracking=0.08, align="center")
emit("DE_lockup_stacked_tagline_chest_6in", W, lh_ + 0.35 + th, body + "\n" + tag_g, "stacked lockup with site tagline, center chest")

# 5. Back: wordmark 12" + URL in Space Mono
ww, wh = wordmark_dims(12.0)
body = wordmark(PAD, PAD, 12.0)
url_g, uw, uh = text(PAD + ww / 2, PAD + wh + 0.5, "THEDRONEEDGE.COM", "SpaceMono-Regular", 0.32, tracking=0.12, align="center")
emit("DE_back_wordmark_url_12in", ww, wh + 0.5 + uh, body + "\n" + url_g, "upper back: wordmark 12in with URL")

# 6. Sleeve URL text hit (3.5" wide)
url_g, uw, uh = text(PAD, PAD, "THEDRONEEDGE.COM", "SpaceMono-Regular", 0.20, tracking=0.12)
emit("DE_text_url_sleeve_3.5in", uw, uh, url_g, "sleeve text: URL in Space Mono")

# 7. Back-neck icon 1.5"
w, h = icon_dims(1.5)
emit("DE_icon_backneck_1.5in", w, h, icon(PAD, PAD, 1.5), "small icon below back collar")

# 8. Icon + URL vertical sleeve strip: icon 1.6" over URL
iw, ih = icon_dims(1.6)
_, uw, uh = text_paths("THEDRONEEDGE.COM", "SpaceMono-Regular", 0.20, 0.12)
W = max(iw, uw)
url_g, _, _ = text(PAD + W / 2, PAD + ih + 0.3, "THEDRONEEDGE.COM", "SpaceMono-Regular", 0.20, tracking=0.12, align="center")
emit("DE_icon_url_sleeve_3.3in", W, ih + 0.3 + uh, icon(PAD + (W - iw) / 2, PAD, 1.6) + "\n" + url_g, "sleeve: icon over URL")


# ---------------------------------------------------------------- mockups
# Flat tee in inches: body 20" wide (size M), 29" long, set-in sleeves.
def tee_svg(front_art, back_art=None, label="", sleeve_art=None):
    """Return an SVG with front (and optional back) flat tee, art placed at true scale."""
    shirt = "#141414"
    seam = "#2a2a2a"
    bg = "#3a3a3a"
    canvas_w = 34 if back_art is None else 62
    canvas_h = 36

    def body_at(ox, oy):
        # simple tee outline: shoulders 19" across, chest 20", sleeves 8.5" long
        p = (
            f"M{(ox+7)*U},{(oy+2)*U} "
            f"Q{(ox+10)*U},{(oy+0.6)*U} {(ox+13)*U},{(oy+2)*U} "  # back neck (collar)
            f"L{(ox+18.5)*U},{(oy+3.6)*U} "
            f"L{(ox+23.2)*U},{(oy+10.2)*U} L{(ox+19)*U},{(oy+12)*U} L{(ox+17.5)*U},{(oy+9.6)*U} "
            f"L{(ox+17.5)*U},{(oy+31)*U} L{(ox+2.5)*U},{(oy+31)*U} L{(ox+2.5)*U},{(oy+9.6)*U} "
            f"L{(ox+1)*U},{(oy+12)*U} L{(ox-3.2)*U},{(oy+10.2)*U} L{(ox+1.5)*U},{(oy+3.6)*U} Z"
        )
        collar = (
            f"M{(ox+7)*U},{(oy+2)*U} Q{(ox+10)*U},{(oy+5.2)*U} {(ox+13)*U},{(oy+2)*U}"
        )
        seams = (
            f'<path d="M{(ox+2.5)*U},{(oy+9.6)*U} L{(ox+1.5)*U},{(oy+3.6)*U}" stroke="{seam}" stroke-width="6" fill="none"/>'
            f'<path d="M{(ox+17.5)*U},{(oy+9.6)*U} L{(ox+18.5)*U},{(oy+3.6)*U}" stroke="{seam}" stroke-width="6" fill="none"/>'
        )
        return (
            f'<path d="{p}" fill="{shirt}"/>'
            f'<path d="{collar}" fill="{shirt}" stroke="{seam}" stroke-width="6"/>'
            + seams
        )

    parts = [f'<rect width="{canvas_w*U}" height="{canvas_h*U}" fill="{bg}"/>']
    # front
    fx, fy = 7, 2.5
    parts.append(body_at(fx, fy))
    parts.append(f'<text x="{(fx+10)*U}" y="{(fy+33.3)*U}" fill="#9a9a9a" font-family="Helvetica,Arial" font-size="70" text-anchor="middle">FRONT</text>')
    for art in front_art:
        parts.append(art(fx, fy))
    if sleeve_art:
        parts.append(sleeve_art(fx, fy))
    if back_art is not None:
        bx, by = 35, 2.5
        parts.append(body_at(bx, by))
        parts.append(f'<text x="{(bx+10)*U}" y="{(by+33.3)*U}" fill="#9a9a9a" font-family="Helvetica,Arial" font-size="70" text-anchor="middle">BACK</text>')
        for art in back_art:
            parts.append(art(bx, by))
    parts.append(f'<text x="{0.6*U}" y="{1.4*U}" fill="#e5e5e5" font-family="Helvetica,Arial" font-size="80" font-weight="bold">{label}</text>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_w*U}" height="{canvas_h*U}" '
        f'viewBox="0 0 {canvas_w*U} {canvas_h*U}">' + "\n".join(parts) + "</svg>"
    ), canvas_w, canvas_h


# placement helpers (offsets relative to tee origin ox,oy; wearer's left = viewer's right)
def at_left_chest(fn, w, h):
    # center ~4" right of center, 8" below HPS (shoulder point)
    return lambda ox, oy: fn(ox + 10 + 4.0 - w / 2, oy + 2 + 6.2 - h / 2)


def at_center_chest(fn, w, h, drop=7.0):
    return lambda ox, oy: fn(ox + 10 - w / 2, oy + 2 + drop)


def at_left_sleeve(fn, w, h):
    # wearer's left sleeve = viewer's right; centered on sleeve, ~1.5" above hem
    return lambda ox, oy: fn(ox + 20.6 - w / 2, oy + 7.2 - h / 2)


def at_upper_back(fn, w, h, drop=5.0):
    return lambda ox, oy: fn(ox + 10 - w / 2, oy + 2 + drop)


def at_back_neck(fn, w, h):
    return lambda ox, oy: fn(ox + 10 - w / 2, oy + 3.2)


def rotated_sleeve(fn, w, h):
    """Sleeve art rotated -25deg to follow sleeve angle."""
    def place(ox, oy):
        cx, cy = (ox + 20.6) * U, (oy + 7.2) * U
        return f'<g transform="rotate(-25 {cx:.1f} {cy:.1f})">' + fn(ox + 20.6 - w / 2, oy + 7.2 - h / 2) + "</g>"
    return place


concepts = []

# Concept 1 — Minimal: sleeve icon only
w, h = icon_dims(2.5)
concepts.append(("01_minimal_sleeve_icon", "1 · Minimal — icon on left sleeve (2.5in)",
                 [], None, at_left_sleeve(lambda x, y: icon(x, y, 2.5), w, h)))

# Concept 2 — Left chest icon + sleeve URL
w, h = icon_dims(3.0)
uw, uh = text_paths("THEDRONEEDGE.COM", "SpaceMono-Regular", 0.20, 0.12)[1:]
concepts.append(("02_leftchest_icon_sleeve_url", "2 · Left chest icon (3in) + URL on sleeve",
                 [at_left_chest(lambda x, y: icon(x, y, 3.0), w, h)], None,
                 rotated_sleeve(lambda x, y: text(x, y, "THEDRONEEDGE.COM", "SpaceMono-Regular", 0.20, 0.12)[0], uw, uh)))

# Concept 3 — Horizontal lockup left chest + sleeve icon
lw, lh = lockup_dims(4.0)
iw, ih = icon_dims(2.5)
concepts.append(("03_leftchest_lockup_sleeve_icon", "3 · Horizontal logo left chest (4in) + sleeve icon",
                 [at_left_chest(lambda x, y: lockup(x, y, 4.0), lw, lh)], None,
                 at_left_sleeve(lambda x, y: icon(x, y, 2.5), iw, ih)))

# Concept 4 — Center chest stacked lockup + tagline
def stacked_art(x, y):
    b, w_, h_ = stacked(2.6, 5.5, 0.45)
    b = b.replace(f"translate({PAD*U:.3f}", f"translate({x*U:.3f}", 1)
    # rebuild directly for correct offsets
    iw_, ih_ = icon_dims(2.6)
    ww_, wh_ = wordmark_dims(5.5)
    W_ = max(iw_, ww_)
    out = icon(x + (W_ - iw_) / 2, y, 2.6) + wordmark(x + (W_ - ww_) / 2, y + ih_ + 0.45, 5.5)
    out += text(x + W_ / 2, y + ih_ + 0.45 + wh_ + 0.35, "FAA CERTIFICATION & DRONE EDUCATION", "ChakraPetch-SemiBold", 0.22, 0.08, "center")[0]
    return out

sw = max(icon_dims(2.6)[0], wordmark_dims(5.5)[0])
sw = max(sw, text_paths("FAA CERTIFICATION & DRONE EDUCATION", "ChakraPetch-SemiBold", 0.22, 0.08)[1])
sh = icon_dims(2.6)[1] + 0.45 + wordmark_dims(5.5)[1] + 0.35 + 0.22
concepts.append(("04_center_stacked_tagline", "4 · Center chest stacked logo + tagline",
                 [at_center_chest(stacked_art, sw, sh, drop=6.0)], None, None))

# Concept 5 — Left chest icon front, big wordmark + URL back, back-neck icon
def back_art(x, y):
    ww_, wh_ = wordmark_dims(12.0)
    out = wordmark(x, y, 12.0)
    out += text(x + ww_ / 2, y + wh_ + 0.5, "THEDRONEEDGE.COM", "SpaceMono-Regular", 0.32, 0.12, "center")[0]
    return out

bw, bh = wordmark_dims(12.0)
bh += 0.5 + 0.32
iw, ih = icon_dims(3.0)
concepts.append(("05_front_icon_back_wordmark", "5 · Left chest icon front · wordmark + URL upper back",
                 [at_left_chest(lambda x, y: icon(x, y, 3.0), iw, ih)],
                 [at_upper_back(back_art, bw, bh, drop=5.5)], None))

# Concept 6 — Classic: horizontal lockup across chest 10" + back-neck icon
lw, lh = lockup_dims(10.0)
nw, nh = icon_dims(1.5)
concepts.append(("06_center_horizontal_lockup", "6 · Horizontal logo across chest (10in) + back-neck icon",
                 [at_center_chest(lambda x, y: lockup(x, y, 10.0), lw, lh, drop=7.5)],
                 [at_back_neck(lambda x, y: icon(x, y, 1.5), nw, nh)], None))

for name, label, front, back, sleeve in concepts:
    svg, cw, ch = tee_svg(front, back, label, sleeve)
    open(f"/tmp/merch/{name}.svg", "w").write(svg)
    # render at 60 px/in
    svg_to_png(svg.replace(f'width="{cw*U}" height="{ch*U}"', f'width="{cw*U}in" height="{ch*U}in"', 1), cw, ch, f"{MOCK_DIR}/{name}.png", dpi=60)

# ---------------------------------------------------------------- contact sheet
cells = []
for name, W, H, note in files:
    cells.append(
        f'<div class="c"><div class="art"><img src="{PRINT_DIR}/{name}.png"></div>'
        f'<div class="cap"><b>{name}</b><br>{W:.2f} x {H:.2f} in · {note}</div></div>')
sheet = ("<!doctype html><html><head><style>body{margin:0;background:#2b2b2b;font-family:Helvetica,Arial;color:#ddd;padding:24px}"
         "h1{font-size:22px;margin:0 0 16px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}"
         ".c{background:#151515;border:1px solid #333;border-radius:8px;padding:14px}"
         ".art{height:230px;display:flex;align-items:center;justify-content:center}.art img{max-width:100%;max-height:100%}"
         ".cap{font-size:12px;line-height:1.4;margin-top:10px;color:#bbb}b{color:#fff}</style></head><body>"
         "<h1>Drone Edge merch print files — white art on transparent (shown on dark)</h1><div class=\"g\">" + "".join(cells) + "</div></body></html>")
open("/tmp/merch/_sheet.html", "w").write(sheet)
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1500,1500",
                f"--screenshot={OUT}/print-files-preview.png", "file:///tmp/merch/_sheet.html"], check=True, capture_output=True)

# ---------------------------------------------------------------- manifest
lines = ["| File | Size (in, incl. 0.15in margin) | Placement / use |", "|---|---|---|"]
for name, W, H, note in files:
    lines.append(f"| `{name}.svg` / `.png` | {W:.2f} × {H:.2f} | {note} |")
print("\n".join(lines))
print("\nmockups:", sorted(os.listdir(MOCK_DIR)))
