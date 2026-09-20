"""Analyse a third-party frame mesh (STL) against a kit: mesh health, dimensions, hole patterns → motor and stack
positions, kit-fit checks, mass by material, manufacturability, and FEA with the kit's motor loads."""
from __future__ import annotations

import math
from collections import defaultdict

from .printcheck import _stl_tris

STACK_PATTERNS = {"16": 16.0, "20": 20.0, "25.5": 25.5, "30.5": 30.5}
MOTOR_PATTERNS = {"9": 9.0, "12": 12.0, "16": 16.0, "19": 19.0, "Ø9 bolt circle (diamond)": 9.0 / math.sqrt(2), "Ø12 bolt circle (diamond)": 12.0 / math.sqrt(2)}
KNOWN_HOLES = {"M2": (1.9, 2.6), "M3": (2.9, 3.5), "M2 heat-set/nut": (3.5, 4.5)}


def load(path):
    tris = list(_stl_tris(path))
    return tris


def stats(tris):
    xs = [c[0] for t in tris for c in t]
    ys = [c[1] for t in tris for c in t]
    zs = [c[2] for t in tris for c in t]
    vol = area = 0.0
    edges = defaultdict(int)
    for a, b, c in tris:
        vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        cx, cy, cz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        area += math.sqrt(cx * cx + cy * cy + cz * cz) / 2
        for p0, p1 in ((a, b), (b, c), (c, a)):
            edges[tuple(sorted((p0, p1)))] += 1
    bad = sum(1 for v in edges.values() if v != 2)
    parent = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b, c in tris:
        parent[find(a)] = find(b)
        parent[find(b)] = find(c)
    shells = defaultdict(int)
    for a, _, _ in tris:
        shells[find(a)] += 1
    zc = defaultdict(float)  # horizontal face area per z level
    for a, b, c in tris:
        if abs(a[2] - b[2]) < 1e-3 and abs(a[2] - c[2]) < 1e-3:
            zc[round(a[2], 1)] += abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
    plateaus = sorted([z for z, ar in zc.items() if ar > 0.01 * area])
    base_top = max(zc.items(), key=lambda kv: kv[1])[0] if zc else min(zs)
    return {"triangles": len(tris), "bbox_min": [min(xs), min(ys), min(zs)], "bbox_max": [max(xs), max(ys), max(zs)],
            "size_mm": [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)], "volume_mm3": abs(vol), "area_mm2": area,
            "watertight": bad == 0, "non_manifold_edges": bad, "shells": len(shells), "z_plateaus": plateaus,
            "plateau_area_mm2": {str(z): round(ar) for z, ar in sorted(zc.items()) if ar > 0.01 * area}, "base_plate_top_z": base_top}


def slice_loops(tris, z):
    """Closed loops (lists of xy points) of the mesh section at height z."""
    segs = []
    for tri in tris:
        pts = []
        for i in range(3):
            a, b = tri[i], tri[(i + 1) % 3]
            if (a[2] - z) * (b[2] - z) < 0:
                f = (z - a[2]) / (b[2] - a[2])
                pts.append((round(a[0] + f * (b[0] - a[0]), 4), round(a[1] + f * (b[1] - a[1]), 4)))
        if len(pts) == 2 and pts[0] != pts[1]:
            segs.append(tuple(pts))
    nxt = defaultdict(list)
    for s in segs:
        nxt[s[0]].append(s[1])
        nxt[s[1]].append(s[0])
    seen, loops = set(), []
    for s in segs:
        if s in seen:
            continue
        loop = [s[0], s[1]]
        seen.add(s)
        seen.add((s[1], s[0]))
        while True:
            cur, prev = loop[-1], loop[-2]
            cands = [q for q in nxt[cur] if q != prev and (cur, q) not in seen]
            if not cands:
                break
            q = cands[0]
            seen.add((cur, q))
            seen.add((q, cur))
            if q == loop[0]:
                break
            loop.append(q)
            if len(loop) > 20000:
                break
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def circles(loops, max_d=6.0):
    """Loops that are near-circular and small → holes: (cx, cy, diameter)."""
    out = []
    for lp in loops:
        n = len(lp)
        A = 0.0
        per = 0.0
        for i in range(n):
            x0, y0 = lp[i]
            x1, y1 = lp[(i + 1) % n]
            A += x0 * y1 - x1 * y0
            per += math.hypot(x1 - x0, y1 - y0)
        A = abs(A) / 2
        if A < 0.3 or per <= 0:
            continue
        d = 2 * math.sqrt(A / math.pi)
        if d > max_d:
            continue
        if 4 * math.pi * A / per ** 2 < 0.8:
            continue
        cx = sum(p[0] for p in lp) / n
        cy = sum(p[1] for p in lp) / n
        out.append((round(cx, 2), round(cy, 2), round(d, 2)))
    return out


def squares(holes, side, tol=0.5):
    """Sets of 4 holes forming a square of the given side → centres."""
    found = []
    pts = [(h[0], h[1]) for h in holes]
    n = len(pts)
    for i in range(n):
        for j in range(i + 1, n):
            d = math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])
            if abs(d - side * math.sqrt(2)) > tol:
                continue
            cx, cy = (pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2
            others = [k for k in range(n) if k not in (i, j) and abs(math.hypot(pts[k][0] - cx, pts[k][1] - cy) - side / math.sqrt(2)) < tol]
            if len(others) >= 2:
                c = (round(cx, 1), round(cy, 1))
                if all(math.hypot(c[0] - f[0], c[1] - f[1]) > 3 for f in found):
                    found.append(c)
    return found


def detect(tris, st):
    """Holes, stack / motor mount patterns and the four motor centres of a frame mesh (mesh coordinates)."""
    res = {}
    # holes: slice just under each plateau (plate tops) and just above the floor
    zmin = st["bbox_min"][2]
    levels = sorted(set([zmin + 0.5] + [z - 0.4 for z in st["z_plateaus"] if z - 0.4 > zmin + 0.2]))
    holes = {}
    for z in levels:
        for h in circles(slice_loops(tris, z)):
            key = (round(h[0]), round(h[1]))
            holes.setdefault(key, h)  # dedupe across levels
    holes = list(holes.values())
    res["holes"] = {"count": len(holes), "diameters": sorted(set(h[2] for h in holes))}
    res["stack_patterns"] = {name: squares(holes, side) for name, side in STACK_PATTERNS.items()}
    res["motor_patterns"] = {name: squares(holes, side, tol=0.6) for name, side in MOTOR_PATTERNS.items()}
    motors = []
    for name, cs in res["motor_patterns"].items():
        if len(cs) >= 4:
            motors = cs[:4]
            res["motor_pattern_found"] = name
            break
    if not motors:  # fall back: the four extreme holes clusters (arm tips)
        cx = (st["bbox_min"][0] + st["bbox_max"][0]) / 2
        cy = (st["bbox_min"][1] + st["bbox_max"][1]) / 2
        far = sorted(holes, key=lambda h: -math.hypot(h[0] - cx, h[1] - cy))
        for h in far:
            if all(math.hypot(h[0] - m[0], h[1] - m[1]) > 25 for m in motors):
                motors.append((h[0], h[1]))
            if len(motors) == 4:
                break
        res["motor_pattern_found"] = None
    res["motors_xy"] = motors
    res["hole_list"] = holes
    return res


def analyse(path, kit, material="PETG"):
    tris = load(path)
    st = stats(tris)
    C = kit.bom["components"]
    mat = kit.bom["materials"][material]
    res = {"file": path, "stats": st, "material": material, "mass_g_solid": st["volume_mm3"] / 1000 * mat["density"],
           "mass_g_printed": st["volume_mm3"] / 1000 * mat["density"] * mat["print_solidity"]}
    res.update({k: v for k, v in detect(tris, st).items() if k != "hole_list"})
    motors = res["motors_xy"]
    checks = []

    def check(name, ok, detail):
        checks.append({"check": name, "pass": None if ok is None else bool(ok), "detail": detail})
    def pattern_of(comp):
        return str(comp.get("mount", {}).get("pattern", "20x20")).lower().split("x")[0]
    kit_stack, kit_motor = pattern_of(C["stack_fc"]), pattern_of(C["motor"])
    found_stack = [n for n, cs in res["stack_patterns"].items() if cs]
    check(f"stack mount {kit_stack}×{kit_stack} present", kit_stack in found_stack, f"found: {', '.join(found_stack) or 'none'}")
    check(f"motor mount {kit_motor}×{kit_motor} present", res.get("motor_pattern_found") == kit_motor,
          f"found: {res.get('motor_pattern_found') or 'no 4× square pattern; used arm-tip holes'}")
    if len(motors) == 4:
        ds = sorted(math.hypot(motors[i][0] - motors[j][0], motors[i][1] - motors[j][1]) for i in range(4) for j in range(i + 1, 4))
        wheelbase = ds[-1]
        res["wheelbase_mm"] = wheelbase
        res["motor_spacing_mm"] = ds[:4]
        check("wheelbase 145–168 mm (parts list §4 target 150–160)", 145 <= wheelbase <= 168, f"{wheelbase:.1f} mm")
        prop_d = C["prop"]["diameter_mm"]
        gap = min(ds[:4]) - prop_d
        check(f"prop tip gap ≥ 8 mm with {prop_d:.0f} mm props", gap >= 8, f"{gap:.1f} mm")
        guard_r = prop_d / 2 + kit.variants["defaults"].get("guard_gap", 1.5) + kit.variants["defaults"].get("guard_ring", 2)
        check("room for the kit's prop guards", min(ds[:4]) - 2 * guard_r >= 2, f"{min(ds[:4]) - 2 * guard_r:.1f} mm between rings")
    pl = st["z_plateaus"]
    zmax = st["bbox_max"][2]
    base = st["base_plate_top_z"]
    top_under = [z for z in pl if base + 8 < z <= zmax - 1.5]
    if top_under:
        clear = max(top_under) - base
        res["stack_clear_mm"] = clear
        need = C["stack_fc"]["assembled_stack_height_mm"]
        check("stack clear height ≥ 16 mm", clear >= max(16, need), f"{clear:.1f} mm from bottom-plate top (z {base}) to top-plate underside (z {max(top_under)})")
    budget = 65
    check(f"frame mass ≤ {budget} g in {material}", res["mass_g_printed"] <= budget, f"{res['mass_g_printed']:.0f} g printed ({res['mass_g_solid']:.0f} g solid)")
    check("watertight mesh (printable)", st["watertight"], f"{st['shells']} shells, {st['non_manifold_edges']} bad edges")
    bee = C["beeid"]["dims"]
    check("BeeID footprint on a top surface", None, f"needs a {bee[0]}×{bee[1]} mm clear top area with sky view — verify manually")
    res["checks"] = checks
    return res, tris
