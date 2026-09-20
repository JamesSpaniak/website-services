"""Small build123d helpers shared by the part and frame generators. Units mm; x forward, y left, z up."""
from __future__ import annotations

import math

from build123d import Align, Axis, Box, Circle, Cylinder, Plane, Pos, Rot, Spline, Vector, Wire, fillet, sweep

BOTTOM = (Align.CENTER, Align.CENTER, Align.MIN)


def cyl(r, h, x=0.0, y=0.0, z=0.0):
    """Vertical cylinder, base at z."""
    return Pos(x, y, z) * Cylinder(r, h, align=BOTTOM)


def box(l, w, h, x=0.0, y=0.0, z=0.0, rot=0.0):
    """Box centred in x/y at (x, y), base at z, rotated about z by rot degrees."""
    return Pos(x, y, z) * Rot(0, 0, rot) * Box(l, w, h, align=BOTTOM)


def bar(p0, p1, width, h, z):
    """Horizontal bar of `width` × `h` from p0 to p1 (xy), base at z."""
    (x0, y0), (x1, y1) = p0, p1
    L = math.hypot(x1 - x0, y1 - y0)
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    return box(L, width, h, (x0 + x1) / 2, (y0 + y1) / 2, z, ang)


def strut(a, b, w, t):
    """Straight strut of section w × t between two 3-D points (any orientation)."""
    a, b = Vector(*a), Vector(*b)
    d = b - a
    L = d.length
    if L < 1e-6:
        return None
    mid = (a + b) / 2
    # rotation taking +x to d
    yaw = math.degrees(math.atan2(d.Y, d.X))
    pitch = -math.degrees(math.atan2(d.Z, math.hypot(d.X, d.Y)))
    return Pos(mid.X, mid.Y, mid.Z) * Rot(0, 0, yaw) * Rot(0, pitch, 0) * Box(L, w, t)


def safe_fillet(part, edges, r):
    try:
        edges = list(edges)
        if not edges or r <= 0:
            return part
        return fillet(edges, r)
    except Exception:
        return part


def z_edges_near(part, pts, tol):
    """Vertical edges of `part` whose centre is within tol (xy) of any of pts."""
    out = []
    for e in part.edges().filter_by(Axis.Z):
        c = e.center()
        if any(math.hypot(c.X - px, c.Y - py) <= tol for px, py in pts):
            out.append(e)
    return out


def wire_sweep(points, r):
    """A round wire of radius r swept along a spline through 3-D points. Returns (solid, length_mm)."""
    pts = [Vector(*p) for p in points]
    path = Spline(*pts)
    tangent = path.tangent_at(0)
    section = Plane(origin=pts[0], z_dir=tangent) * Circle(r)
    solid = sweep(section, path=Wire([path]), is_frenet=True)
    return solid, path.length
