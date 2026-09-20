"""Component solids.

Tiers: A — envelope from bom.json dims; B — detail stand-in (holes, pads, sockets, connector bodies, shaft);
C — vendor STEP from <kit>/parts/<component>/part.step (used automatically when present).
Every generator returns a list of (solid, kind, mass_g or None) so a component can contribute several
labelled bodies (board + pads + connectors). Keep-outs are returned as kind "keepout" with zero mass.
"""
from __future__ import annotations


from build123d import Axis, Color, Cylinder, Pos, Rot, import_step

from .geom import box, cyl, safe_fillet


def _label(solid, label, color):
    solid.label = label
    solid.color = Color(color) if isinstance(color, str) else color
    return solid


def from_step(kit, component, x, y, z, label, color, mass_g, rot=0.0):
    """Tier C: place a vendor STEP with its part.json origin offset (dx, dy, dz) applied."""
    path, meta = kit.step_for(component)
    if not path:
        return None
    shape = import_step(path)
    d = meta.get("origin_offset_mm", [0, 0, 0])
    solid = Pos(x, y, z) * Rot(0, 0, rot) * Pos(-d[0], -d[1], -d[2]) * shape
    return [(_label(solid, f"{label} [vendor STEP]", color), "electronics", mass_g)]


def board(dims, hole_pattern, hole_d, color, label, z, pads=None, pad_color="#ffd400", sockets=None, connectors=None):
    """PCB with corner holes on a square pattern, optional solder pads, sockets and connector bodies (Tier B)."""
    l, w, h = dims
    b = box(l, w, h, 0, 0, z)
    b = safe_fillet(b, b.edges().filter_by(Axis.Z), 2)
    s = hole_pattern / 2
    for hx in (-s, s):
        for hy in (-s, s):
            b -= cyl(hole_d / 2, h + 2, hx, hy, z - 1)
    out = [(_label(b, label, color), "electronics", None)]
    for name, (px, py) in (pads or {}).items():
        out.append((_label(box(2.4, 2.4, 0.4, px, py, z + h), f"{label} pad {name}", pad_color), "electronics", 0.0))
    for name, (px, py) in (sockets or {}).items():
        out.append((_label(box(5, 3, 2, px, py, z + h), f"{label} socket {name}", "#f5f5f5"), "electronics", 0.0))
    for name, (px, py, cl, cw, ch) in (connectors or {}).items():
        out.append((_label(box(cl, cw, ch, px, py, z + h), f"{label} connector {name}", "#e8e8e8"), "electronics", 0.0))
    return out


def motor(spec, x, y, z, label):
    d, _, h = spec["dims"]
    bell = cyl(d / 2, h, x, y, z)
    bell = safe_fillet(bell, bell.edges().group_by(Axis.Z)[-1], 1.5)
    base = cyl(d / 2 + 1, 2, x, y, z)
    shaft = cyl(1.0, 6, x, y, z + h)  # T-mount stub
    m = bell + base + shaft
    return [(_label(m, label, spec["color"]), "electronics", spec["mass_g"])]


def prop(spec, x, y, z, label, spin):
    from build123d import Ellipse, extrude
    r = spec["diameter_mm"] / 2
    hub = cyl(5, spec["hub_h_mm"], x, y, z - 2) - cyl(1.3, spec["hub_h_mm"] + 2, x, y, z - 3)
    blades = None
    for k in range(3):
        blade = extrude(Ellipse(r / 2 - 3, 5), 1.2)
        blade = Pos(x, y, z) * Rot(0, 0, 120 * k + (30 if spin == "CW" else -30)) * Pos(r / 2 + 2, 0, 0) * blade
        blades = blade if blades is None else blades + blade
    return [(_label(hub + blades, label, spec["color"]), "prop", spec["mass_g"])]


def block(spec, x0, y0, z0, label, fillet_r=0.0, color=None, kind="electronics", mass=None):
    """Tier A box from its min corner."""
    l, w, h = spec["dims"]
    b = box(l, w, h, x0 + l / 2, y0 + w / 2, z0)
    if fillet_r:
        b = safe_fillet(b, b.edges(), fillet_r)
    return [(_label(b, label, color or spec["color"]), kind, spec["mass_g"] if mass is None else mass)]


def keepout_cylinder(r, h, x, y, z, label):
    k = cyl(r, h, x, y, z)
    return [(_label(k, f"KEEP-OUT {label}", Color(1.0, 0.3, 0.3, 0.25)), "keepout", 0.0)]


def keepout_cone(r_top, h, x, y, z, label):
    """Upward-opening cone (sky view) — e.g. GPS antenna."""
    from build123d import Cone
    from build123d import Align
    k = Pos(x, y, z) * Cone(0.5, r_top, h, align=(Align.CENTER, Align.CENTER, Align.MIN))
    return [(_label(k, f"KEEP-OUT {label}", Color(1.0, 0.3, 0.3, 0.25)), "keepout", 0.0)]


def antenna_t(x, y, z, d, label, coax_len=30, tip_len=30):
    """ELRS T antenna: coax stub along ±x (d = ±1) ending in a transverse dipole."""
    coax = Pos(x + d * coax_len / 2, y, z) * Rot(0, 90, 0) * Cylinder(0.6, coax_len)
    tip = Pos(x + d * coax_len, y, z) * Rot(90, 0, 0) * Cylinder(0.8, tip_len)
    body = coax + tip
    return [(_label(body, label, "#222222"), "electronics", 0.0)]
