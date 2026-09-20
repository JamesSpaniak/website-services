#!/usr/bin/env python3
"""Build 3-D layout models + physics for the drone-building kit from the parts list.

Pure Python 3 standard library — no numpy, no CAD program. The lowest common
denominator unit is a 1 mm voxel: every part from
assets/courses/drone-building/cad/bom.json is rasterised onto a 1 mm grid, the
frame variants in cad/variants.json are generated around them, and the grid is
then used for everything else — meshes, 2-D sketches, mass properties, and a
rigid-body hover simulation.

Usage:
    python3 scripts/build_drone_model.py                 # all variants
    python3 scripts/build_drone_model.py --variant base-x
    python3 scripts/build_drone_model.py --png           # also render SVGs → PNG (needs Google Chrome)
    python3 scripts/build_drone_model.py --list

Outputs to assets/courses/drone-building/cad/generated/<variant>/:
    assembly.stl / assembly.obj (+.mtl)  full model, one OBJ group per component
    frame.stl                            frame + guards only (printable stand-in)
    top.svg  side.svg  front.svg         orthographic sketches on a 10 mm grid with marks
    slices.txt                           ASCII z-slices of the voxel grid (2 mm/char)
    marks.json                           holes, pads, sockets, keep-outs, CG, wire routes, checks
    physics.json / report.md             mass, CG, inertia, thrust, hover, flight time, beam check, sim
    sim-hover.csv                        6-DOF hover + roll-step simulation log
and cad/generated/comparison.md across variants.

Axes: x forward (nose), y left, z up. Betaflight motor order 1 RR, 2 FR, 3 RL, 4 FL.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import struct
import subprocess
import sys
from collections import defaultdict

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CAD = os.path.join(REPO, "assets", "courses", "drone-building", "cad")
BOM_PATH = os.path.join(CAD, "bom.json")
VARIANTS_PATH = os.path.join(CAD, "variants.json")
OUT_ROOT = os.path.join(CAD, "generated")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

G = 9.81
IN_TO_MM = 25.4

# Betaflight default (props-in): motor index -> (x sign, y sign, spin)
# 1 rear-right CW, 2 front-right CCW, 3 rear-left CCW, 4 front-left CW
MOTOR_LAYOUT = {
    1: ("rear", -1, "CW"),
    2: ("front", -1, "CCW"),
    3: ("rear", 1, "CCW"),
    4: ("front", 1, "CW"),
}


# --------------------------------------------------------------------------- grid


class Component:
    def __init__(self, cid, name, kind, color, code, mass_g=None, material=None):
        self.cid = cid
        self.name = name
        self.kind = kind  # frame | guard | electronics | prop | battery | hardware
        self.color = color
        self.code = code
        self.mass_g = mass_g  # None → computed from voxels × density
        self.material = material
        self.prims = []  # primitives for the 2-D sketch
        self.voxels = 0


class Grid:
    """Sparse 1 mm voxel grid. cells[(x, y, z)] = component id."""

    def __init__(self):
        self.cells = {}
        self.comps = []
        self.overlaps = defaultdict(int)

    def add_component(self, name, kind, color, code, mass_g=None, material=None):
        c = Component(len(self.comps), name, kind, color, code, mass_g, material)
        self.comps.append(c)
        return c

    def _put(self, key, comp):
        old = self.cells.get(key)
        if old is None:
            self.cells[key] = comp.cid
            comp.voxels += 1
        elif old != comp.cid:
            self.overlaps[(old, comp.cid)] += 1

    def box(self, comp, x0, y0, z0, x1, y1, z1, record=True):
        x0, x1 = sorted((int(round(x0)), int(round(x1))))
        y0, y1 = sorted((int(round(y0)), int(round(y1))))
        z0, z1 = sorted((int(round(z0)), int(round(z1))))
        for x in range(x0, x1):
            for y in range(y0, y1):
                for z in range(z0, z1):
                    self._put((x, y, z), comp)
        if record:
            comp.prims.append({"kind": "box", "x0": x0, "y0": y0, "z0": z0, "x1": x1, "y1": y1, "z1": z1})

    def cylinder(self, comp, cx, cy, z0, z1, r, r_in=0.0, record=True):
        z0, z1 = sorted((int(round(z0)), int(round(z1))))
        r2, ri2 = r * r, r_in * r_in
        for x in range(int(math.floor(cx - r)), int(math.ceil(cx + r)) + 1):
            for y in range(int(math.floor(cy - r)), int(math.ceil(cy + r)) + 1):
                d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2
                if ri2 <= d2 <= r2:
                    for z in range(z0, z1):
                        self._put((x, y, z), comp)
        if record:
            comp.prims.append({"kind": "cyl", "cx": cx, "cy": cy, "z0": z0, "z1": z1, "r": r, "r_in": r_in})

    def bar(self, comp, p0, p1, width, z0, z1, record=True):
        """Rectangular bar in the xy plane from p0 to p1 (centreline), `width` wide."""
        (x0, y0), (x1, y1) = p0, p1
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy)
        if L == 0:
            return
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        hw = width / 2.0
        z0, z1 = sorted((int(round(z0)), int(round(z1))))
        xs = [x0 + nx * hw, x0 - nx * hw, x1 + nx * hw, x1 - nx * hw]
        ys = [y0 + ny * hw, y0 - ny * hw, y1 + ny * hw, y1 - ny * hw]
        for x in range(int(math.floor(min(xs))), int(math.ceil(max(xs))) + 1):
            for y in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
                px, py = x + 0.5 - x0, y + 0.5 - y0
                t = px * ux + py * uy
                s = px * nx + py * ny
                if 0 <= t <= L and -hw <= s <= hw:
                    for z in range(z0, z1):
                        self._put((x, y, z), comp)
        if record:
            pts = [(x0 + nx * hw, y0 + ny * hw), (x1 + nx * hw, y1 + ny * hw),
                   (x1 - nx * hw, y1 - ny * hw), (x0 - nx * hw, y0 - ny * hw)]
            comp.prims.append({"kind": "poly", "pts": pts, "z0": z0, "z1": z1})

    def drill(self, cx, cy, r, z0, z1, only=None):
        """Remove voxels inside a vertical circle between z0 and z1 (a bolt hole). `only` = component id filter."""
        removed = 0
        r2 = r * r
        for x in range(int(math.floor(cx - r)), int(math.ceil(cx + r)) + 1):
            for y in range(int(math.floor(cy - r)), int(math.ceil(cy + r)) + 1):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > r2:
                    continue
                for z in range(int(z0), int(z1)):
                    key = (x, y, z)
                    cid = self.cells.get(key)
                    if cid is not None and (only is None or cid in only):
                        del self.cells[key]
                        self.comps[cid].voxels -= 1
                        removed += 1
        return removed

    def bounds(self):
        xs = [k[0] for k in self.cells]
        ys = [k[1] for k in self.cells]
        zs = [k[2] for k in self.cells]
        return (min(xs), min(ys), min(zs), max(xs) + 1, max(ys) + 1, max(zs) + 1)

    def by_comp(self):
        d = defaultdict(list)
        for k, cid in self.cells.items():
            d[cid].append(k)
        return d

    def column_above(self, x0, y0, x1, y1, z):
        """Any voxel above z inside the footprint? (sky-view check)"""
        hits = set()
        for (x, y, zz), cid in self.cells.items():
            if zz >= z and x0 <= x < x1 and y0 <= y < y1:
                hits.add(cid)
        return hits


# --------------------------------------------------------------------------- spec


def load_specs():
    with open(BOM_PATH) as f:
        bom = json.load(f)
    with open(VARIANTS_PATH) as f:
        var = json.load(f)
    return bom, var


def variant_params(var, name):
    p = dict(var["defaults"])
    p.update(var["variants"][name])
    p["name"] = name
    return p


def motor_positions(p):
    fx, fy = p["front"]
    rx, ry = p["rear"]
    pos = {}
    for m, (fr, ysign, spin) in MOTOR_LAYOUT.items():
        x, y = (fx, fy) if fr == "front" else (rx, ry)
        pos[m] = (float(x), float(ysign * abs(y)), spin)
    return pos


# --------------------------------------------------------------------------- build


class Build:
    def __init__(self, bom, p):
        self.bom = bom
        self.p = p
        self.g = Grid()
        self.marks = []
        self.checks = []
        self.motors = motor_positions(p)
        self.notes = []

    def mark(self, kind, label, xyz, **extra):
        d = {"kind": kind, "label": label, "xyz": [round(v, 2) for v in xyz]}
        d.update(extra)
        self.marks.append(d)

    def check(self, name, ok, detail):
        self.checks.append({"check": name, "pass": bool(ok), "detail": detail})

    # ---- frame
    def build(self):
        p, g, C = self.p, self.g, self.bom["components"]
        mat = self.bom["materials"][p["material"]]
        t = p["plate_thickness"]
        at = p["arm_thickness"]
        cp = p["center_plate"]
        half = cp / 2
        hole_r = (2.0 + 2 * p["hole_clearance"]) / 2  # M2 clearance

        z_bot0, z_bot1 = 0, t
        z_top0 = t + p["standoff_h"]
        z_top1 = z_top0 + t
        self.z = {"bottom": (z_bot0, z_bot1), "top": (z_top0, z_top1)}

        frame = g.add_component(f"Frame ({p['material']} printed)" if p["material"] != "CF" else "Frame (carbon fibre stand-in)",
                                "frame", "#5b6470" if p["material"] != "CF" else "#1f2328", "F", material=p["material"])
        self.frame = frame

        # bottom plate
        g.box(frame, -half, -half, z_bot0, half, half, z_bot1)

        # arms
        arm_root = {}
        if p["style"] == "x":
            for m, (mx, my, _) in self.motors.items():
                L = math.hypot(mx, my)
                ux, uy = mx / L, my / L
                root = (ux * (half - 6), uy * (half - 6))
                arm_root[m] = root
                g.bar(frame, root, (mx, my), p["arm_width"], 0, at)
                g.cylinder(frame, mx, my, 0, at, p["motor_pad_r"])
        else:  # H: two rails along x, plus a cross bar at the plate
            for side in (-1, 1):
                ys = side * abs(self.motors[2][1])
                xf = self.motors[2][0]
                xr = self.motors[1][0]
                g.bar(frame, (xr, ys), (xf, ys), p["arm_width"], 0, at)
                g.cylinder(frame, xf, ys, 0, at, p["motor_pad_r"])
                g.cylinder(frame, xr, ys, 0, at, p["motor_pad_r"])
                # cross spars from rail to plate
                g.bar(frame, (0, side * half), (0, ys), p["arm_width"], 0, at)
            for m, (mx, my, _) in self.motors.items():
                arm_root[m] = (0, my)  # rail is supported at the cross spar
        self.arm_root = arm_root

        # top plate: stretched aft for the BeeID pocket, sized for the battery if top-mounted
        bat = C["battery"]["dims"]
        top_len_f = half
        top_len_r = half + 22 + 4  # BeeID pocket behind the plate
        top_w = half
        if p["battery_mount"] == "top":
            top_len_f = max(half, bat[0] / 2 + 4)
            top_len_r = max(top_len_r, bat[0] / 2 + 4 + 22 + 4)
            top_w = max(half, bat[1] / 2 + 3)
        g.box(frame, -top_len_r, -top_w, z_top0, top_len_f, top_w, z_top1)

        # BeeID pocket walls (1 mm) at the rear of the top plate, open to the sky
        bee = C["beeid"]["dims"]
        bee_x1 = -top_len_r + 2 + bee[0]
        bee_x0 = -top_len_r + 2
        bee_y0, bee_y1 = -bee[1] / 2, bee[1] / 2
        wall_h = 4
        g.box(frame, bee_x0 - 1, bee_y0 - 1, z_top1, bee_x1 + 1, bee_y0, z_top1 + wall_h)
        g.box(frame, bee_x0 - 1, bee_y1, z_top1, bee_x1 + 1, bee_y1 + 1, z_top1 + wall_h)
        g.box(frame, bee_x0 - 1, bee_y0 - 1, z_top1, bee_x0, bee_y1 + 1, z_top1 + wall_h)
        self.bee_pocket = (bee_x0, bee_y0, bee_x1, bee_y1, z_top1)
        self.mark("keepout", "BeeID pocket 22×16×8, sky view", (bee_x0, bee_y0, z_top1), size=[bee[0], bee[1], bee[2]])

        # camera plates (video kit) at the nose of the bottom plate
        if p["camera"]:
            cam = C["o4_camera"]["dims"]
            cx0 = half - 2
            for side in (-1, 1):
                yc = side * (cam[1] / 2 + 1)
                g.box(frame, cx0, yc - 1 if side > 0 else yc, z_bot1, cx0 + 14, yc if side > 0 else yc + 1, z_bot1 + 22)
            self.cam_pos = (cx0 + 6, 0, z_bot1 + 10)

        # holes: stack 20×20, motor 12×12
        stack_holes = [(sx, sy) for sx in (-10, 10) for sy in (-10, 10)]
        for (hx, hy) in stack_holes:
            g.drill(hx, hy, hole_r, 0, z_top1, only={frame.cid})
            self.mark("hole", "stack M2 (20×20)", (hx, hy, 0), d=round(hole_r * 2, 2))
        for m, (mx, my, _) in self.motors.items():
            for dx in (-6, 6):
                for dy in (-6, 6):
                    g.drill(mx + dx, my + dy, hole_r, 0, at, only={frame.cid})
                    self.mark("hole", f"motor {m} M2 (12×12)", (mx + dx, my + dy, 0), d=round(hole_r * 2, 2))

        # ---- electronics
        stack_z = z_bot1
        esc = g.add_component("ESC 45A 4-in-1 (stack bottom)", "electronics", C["stack_esc"]["color"], "S", C["stack_esc"]["mass_g"])
        d = C["stack_esc"]["dims"]
        g.box(esc, -d[0] / 2, -d[1] / 2, stack_z + 3, d[0] / 2, d[1] / 2, stack_z + 3 + d[2])
        for name, (px, py) in C["stack_esc"]["pads"].items():
            self.mark("pad", f"ESC {name}", (px, py, stack_z + 3 + d[2]), solder=True)
        fc_z0 = stack_z + 3 + d[2] + 4
        fc = g.add_component("FC F722 (stack top)", "electronics", C["stack_fc"]["color"], "F", C["stack_fc"]["mass_g"])
        d2 = C["stack_fc"]["dims"]
        g.box(fc, -d2[0] / 2, -d2[1] / 2, fc_z0, d2[0] / 2, d2[1] / 2, fc_z0 + d2[2])
        for name, (px, py) in C["stack_fc"]["sockets"].items():
            self.mark("socket", f"FC {name}", (px, py, fc_z0 + d2[2]))
        stack_top = fc_z0 + d2[2]
        for (hx, hy) in stack_holes:
            g.drill(hx, hy, hole_r, stack_z, stack_top, only={esc.cid, fc.cid})

        if p["camera"]:
            o4 = g.add_component("DJI O4 Air Unit board", "electronics", C["o4_air_unit"]["color"], "O", C["o4_air_unit"]["mass_g"])
            d3 = C["o4_air_unit"]["dims"]
            o4_z0 = stack_top + 3
            g.box(o4, -d3[0] / 2, -d3[1] / 2, o4_z0, d3[0] / 2, d3[1] / 2, o4_z0 + d3[2])
            stack_top = o4_z0 + d3[2]
            cam = g.add_component("DJI O4 camera", "electronics", C["o4_camera"]["color"], "C", C["o4_camera"]["mass_g"])
            cd = C["o4_camera"]["dims"]
            cx, cy, cz = self.cam_pos
            g.box(cam, cx - cd[0] / 2, cy - cd[1] / 2, cz - cd[2] / 2, cx + cd[0] / 2, cy + cd[1] / 2, cz + cd[2] / 2)
            self.mark("camera", f"O4 camera, tilt {C['o4_camera']['tilt_deg']}°", (cx, cy, cz), tilt_deg=C["o4_camera"]["tilt_deg"], fov_deg=155)
        self.stack_top = stack_top
        clear = z_top0 - z_bot1
        need = C["stack_fc"]["assembled_stack_height_mm"] + (C["o4_air_unit"]["dims"][2] + 3 if p["camera"] else 0)
        self.check("stack clear height ≥ 16 mm (+O4 if video)", clear >= max(16, need),
                   f"clear {clear} mm between plates; stack needs {need:.1f} mm; modelled stack top at z={stack_top}")

        # standoffs through the stack holes
        hw = g.add_component("Standoffs + bolts (M2 nylon)", "hardware", C["hardware"]["color"], "T", C["hardware"]["mass_g"])
        for (hx, hy) in stack_holes:
            g.cylinder(hw, hx, hy, z_bot1, z_top0, C["hardware"]["standoff_d_mm"] / 2)

        # motors + props
        mot = C["motor"]
        prop = C["prop"]
        prop_r = prop["diameter_mm"] / 2
        self.prop_r = prop_r
        self.prop_z = at + math.ceil(mot["dims"][2]) + 3  # integer mm so the disc sits on one voxel layer
        for m, (mx, my, spin) in self.motors.items():
            mc = g.add_component(f"Motor {m} XILO 1404 ({spin})", "electronics", mot["color"], "M", mot["mass_g"])
            g.cylinder(mc, mx, my, at, at + mot["dims"][2], mot["dims"][0] / 2)
            pc = g.add_component(f"Prop {m} Gemfan 3525 ({spin})", "prop", prop["color"], "P", prop["mass_g"])
            g.cylinder(pc, mx, my, self.prop_z, self.prop_z + 1, prop_r, record=False)
            pc.prims.append({"kind": "cyl", "cx": mx, "cy": my, "z0": self.prop_z, "z1": self.prop_z + 1, "r": prop_r, "r_in": 0, "dashed": True})
            g.cylinder(pc, mx, my, self.prop_z - 2, self.prop_z + prop["hub_h_mm"] - 2, 5, record=False)
            self.mark("motor", f"M{m} {spin}", (mx, my, at), spin=spin, order=m)

        # guards
        if p["guards"]:
            gm = self.bom["materials"][p["guard_material"]]
            guard = g.add_component(f"Prop guards ({p['guard_material']} printed)", "guard", "#7a8a99", "G", material=p["guard_material"])
            self.guard = guard
            r_in = prop_r + p["guard_gap"]
            r_out = r_in + p["guard_ring"]
            self.guard_r_out = r_out
            gz0 = self.prop_z - p["guard_h"] // 2
            for m, (mx, my, _) in self.motors.items():
                g.cylinder(guard, mx, my, gz0, gz0 + p["guard_h"], r_out, r_in=r_in)
                # two spokes from the motor pad out to the ring, kept *below* the prop plane;
                # only the ring spans the blade-tip height
                L = math.hypot(mx, my)
                ux, uy = mx / L, my / L
                for ang in (math.radians(35), math.radians(-35)):
                    ca, sa = math.cos(ang), math.sin(ang)
                    vx, vy = ux * ca - uy * sa, ux * sa + uy * ca
                    g.bar(guard, (mx + vx * (p["motor_pad_r"] - 1), my + vy * (p["motor_pad_r"] - 1)),
                          (mx + vx * (r_in + 1), my + vy * (r_in + 1)), 3, at, max(gz0, at + 1))
        else:
            self.guard = None
            self.guard_r_out = prop_r

        # battery
        bd = C["battery"]["dims"]
        batc = g.add_component(f"Battery {C['battery']['part'].split(',')[0]} (assumed {bd[0]}×{bd[1]}×{bd[2]})", "battery", C["battery"]["color"], "B", C["battery"]["mass_g"])
        if p["battery_mount"] == "top":
            bz0 = z_top1
        else:
            bz0 = z_bot0 - bd[2] - 1
        # centre the pack over the geometric centre, clear of the BeeID pocket
        bx0 = -bd[0] / 2
        if p["battery_mount"] == "top" and bx0 < bee_x1 + 3:
            bx0 = bee_x1 + 3
        g.box(batc, bx0, -bd[1] / 2, bz0, bx0 + bd[0], bd[1] / 2, bz0 + bd[2])
        self.battery_box = (bx0, -bd[1] / 2, bz0, bx0 + bd[0], bd[1] / 2, bz0 + bd[2])
        strap = g.add_component("Battery strap", "hardware", C["strap"]["color"], "K", C["strap"]["mass_g"])
        sx = bx0 + bd[0] / 2
        by0, by1 = -bd[1] / 2, bd[1] / 2
        # strap = 1 mm shell over the top and down both sides (through slots in the plate)
        outer_z = bz0 + bd[2] if p["battery_mount"] == "top" else bz0 - 1
        g.box(strap, sx - 6, by0 - 1, outer_z, sx + 6, by1 + 1, outer_z + 1, record=False)
        for yy in (by0 - 1, by1):
            g.box(strap, sx - 6, yy, min(bz0, outer_z), sx + 6, yy + 1, max(bz0 + bd[2], outer_z + 1), record=False)
        strap.prims.append({"kind": "box", "x0": sx - 6, "y0": by0 - 1, "z0": min(bz0, outer_z), "x1": sx + 6, "y1": by1 + 1, "z1": max(bz0 + bd[2], outer_z + 1)})
        self.mark("keepout", "Battery envelope (XT60 3S, dims assumed)", (bx0, -bd[1] / 2, bz0), size=bd)

        # BeeID in its pocket
        beec = g.add_component("BeeID GPS + Remote ID", "electronics", C["beeid"]["color"], "I", C["beeid"]["mass_g"])
        g.box(beec, bee_x0, bee_y0, z_top1, bee_x1, bee_y1, z_top1 + bee[2])
        above = g.column_above(int(bee_x0), int(bee_y0), int(bee_x1), int(bee_y1), int(z_top1 + bee[2])) - {beec.cid}
        self.check("BeeID sky view (nothing above the pocket)", not above,
                   "clear" if not above else "blocked by: " + ", ".join(g.comps[c].name for c in above))

        # RX under the bottom plate at the rear, antenna out the back
        rx = C["rx"]
        rxc = g.add_component("ELRS Nano RX + T antenna", "electronics", rx["color"], "R", rx["mass_g"])
        rx_x0 = -half + 2
        g.box(rxc, rx_x0, -rx["dims"][1] / 2, -rx["dims"][2] - 1, rx_x0 + rx["dims"][0], rx["dims"][1] / 2, -1)
        g.box(rxc, -half - 30, -1, -3, -half, 1, -1, record=False)  # coax stub
        g.box(rxc, -half - 31, -15, -3, -half - 29, 15, -1, record=False)  # T
        rxc.prims.append({"kind": "box", "x0": -half - 31, "y0": -15, "z0": -3, "x1": -half, "y1": 15, "z1": -1})
        self.mark("antenna", "RX T-antenna (keep clear of carbon)", (-half - 30, 0, -2))

        # wiring: capacitor + XT60 near the ESC rear edge; leads routed along the arms
        w = C["wiring"]
        wc = g.add_component("Wiring: XT60 pigtail + capacitor", "hardware", w["color"], "W", w["mass_g"])
        g.cylinder(wc, -half + 4, 0, z_bot1, z_bot1 + w["capacitor"]["dims"][2], w["capacitor"]["dims"][0] / 2)
        xt = (w.get("xt30") or w.get("xt60") or {"dims": [12, 8, 12]})["dims"]
        xz0 = z_bot1 + 2  # pigtail hangs off the rear of the bottom plate, between the plates
        g.box(wc, -half - xt[0], -xt[1] / 2, xz0, -half, xt[1] / 2, xz0 + xt[2])
        self.wire_routes()

        # clearances
        self.clearance_checks()
        self.prop_disc_analysis()

    def prop_disc_analysis(self):
        """Strike = voxel overlap with a prop disc. Blockage = share of each disc shadowed above/below by other parts."""
        g = self.g
        top_z, bot_z = {}, {}
        for (x, y, z), cid in g.cells.items():
            if g.comps[cid].kind == "prop":
                continue
            k = (x, y)
            if z > top_z.get(k, -999):
                top_z[k] = z
            if z < bot_z.get(k, 999):
                bot_z[k] = z
        prop_ids = {c.cid for c in g.comps if c.kind == "prop"}
        strike = sum(n for (a, b), n in g.overlaps.items() if a in prop_ids or b in prop_ids)
        self.check("no prop strike (voxel overlap)", strike == 0, f"{strike} mm³ of overlap with prop discs")
        r2 = self.prop_r ** 2
        above_tot = below_tot = n_tot = 0
        per = []
        for m, (mx, my, _) in self.motors.items():
            n = above = below = 0
            for x in range(int(mx - self.prop_r) - 1, int(mx + self.prop_r) + 2):
                for y in range(int(my - self.prop_r) - 1, int(my + self.prop_r) + 2):
                    if (x + 0.5 - mx) ** 2 + (y + 0.5 - my) ** 2 > r2:
                        continue
                    n += 1
                    tz = top_z.get((x, y))
                    if tz is not None and tz > self.prop_z + 1:
                        above += 1
                    bz = bot_z.get((x, y))
                    if bz is not None and bz < self.prop_z:
                        below += 1
            per.append((m, above / n * 100, below / n * 100))
            above_tot += above
            below_tot += below
            n_tot += n
        self.disc_blockage = {"inflow_above_pct": above_tot / n_tot * 100, "outflow_below_pct": below_tot / n_tot * 100,
                              "per_motor": [{"motor": m, "above_pct": a, "below_pct": b} for m, a, b in per]}
        self.check("prop inflow blockage ≤ 10 % of disc area", self.disc_blockage["inflow_above_pct"] <= 10,
                   f"{self.disc_blockage['inflow_above_pct']:.1f} % of disc area has parts above the prop plane; {self.disc_blockage['outflow_below_pct']:.1f} % below (arms, motors, pack)")

    def wire_routes(self):
        C = self.bom["components"]
        pads = C["stack_esc"]["pads"]
        z_pad = self.z["bottom"][1] + 3 + C["stack_esc"]["dims"][2]
        need = []
        for m, (mx, my, _) in self.motors.items():
            px, py = pads[f"M{m}"]
            L = math.hypot(mx - px, my - py) + abs(self.p["arm_thickness"] + 8 - z_pad) + 12  # along arm + up + service loop
            need.append(L)
            self.mark("wire", f"motor {m} leads → ESC M{m}", (mx, my, self.p["arm_thickness"]),
                      route=[[mx, my, self.p["arm_thickness"] + 8], [px, py, z_pad]], length_mm=round(L, 1),
                      available_mm=C["motor"]["lead_length_mm"])
        self.check("motor leads ≤ 150 mm", max(need) <= C["motor"]["lead_length_mm"],
                   f"longest routed lead ≈ {max(need):.0f} mm of {C['motor']['lead_length_mm']} mm")
        bx0, by0, bz0, bx1, by1, bz1 = self.battery_box
        self.mark("wire", "XT60 pigtail → ESC BAT", (bx0, 0, bz0), route=[[bx0, 0, (bz0 + bz1) / 2], [-self.p['center_plate'] / 2 - 8, 0, (bz0 + bz1) / 2], pads_xyz(pads, "BAT+", z_pad)])
        joints = 0
        for c in self.bom["wiring"]["connections"]:
            if c["kit"] == "video" and self.p["kit"] != "video":
                continue
            joints += c["joints"] if c["type"] in ("solder", "solder_or_plug") else 0
        self.solder_joints = joints

    def clearance_checks(self):
        p = self.p
        pos = [(m, x, y) for m, (x, y, _) in self.motors.items()]
        min_gap_prop, min_gap_guard = 1e9, 1e9
        for i in range(len(pos)):
            for j in range(i + 1, len(pos)):
                d = math.hypot(pos[i][1] - pos[j][1], pos[i][2] - pos[j][2])
                min_gap_prop = min(min_gap_prop, d - 2 * self.prop_r)
                min_gap_guard = min(min_gap_guard, d - 2 * self.guard_r_out)
        self.check("prop tip-to-tip gap ≥ 8 mm", min_gap_prop >= 8, f"min {min_gap_prop:.1f} mm")
        if p["guards"]:
            self.check("guard-to-guard gap ≥ 2 mm", min_gap_guard >= 2, f"min {min_gap_guard:.1f} mm")
        wheelbase = math.hypot(self.motors[2][0] - self.motors[3][0], self.motors[2][1] - self.motors[3][1])
        self.wheelbase = wheelbase
        self.check("wheelbase 150–160 mm (parts list §4)", 145 <= wheelbase <= 168, f"{wheelbase:.1f} mm")
        if p["camera"]:
            # smallest off-axis angle from the camera axis (tilted up) to any point on a front prop disc
            cx, cy, cz = self.cam_pos
            tilt = math.radians(self.bom["components"]["o4_camera"]["tilt_deg"])
            axis = (math.cos(tilt), 0.0, math.sin(tilt))
            best = 180.0
            for m, (mx, my, _) in self.motors.items():
                if mx < 0:
                    continue
                for k in range(72):
                    a = 2 * math.pi * k / 72
                    for f in (1.0, 0.5):
                        px, py, pz = mx + f * self.prop_r * math.cos(a) - cx, my + f * self.prop_r * math.sin(a) - cy, self.prop_z - cz
                        L = math.sqrt(px * px + py * py + pz * pz)
                        ang = math.degrees(math.acos(max(-1, min(1, (px * axis[0] + py * axis[1] + pz * axis[2]) / L))))
                        best = min(best, ang)
            self.cam_min_angle = best
            self.check("front props outside the O4 155° FOV cone", best >= 77.5,
                       f"nearest prop point {best:.0f}° off the camera axis (in view below 77.5°; larger is better, camera tilt {math.degrees(tilt):.0f}°)")

    def overlaps(self):
        expected = {("frame", "guard"), ("frame", "hardware"), ("electronics", "hardware"), ("battery", "hardware")}
        out = []
        for (a, b), n in sorted(self.g.overlaps.items(), key=lambda kv: -kv[1]):
            ka, kb = self.g.comps[a].kind, self.g.comps[b].kind
            out.append({"a": self.g.comps[a].name, "b": self.g.comps[b].name, "mm3": n,
                        "expected": (ka, kb) in expected or (kb, ka) in expected})
        return out


def pads_xyz(pads, name, z):
    return [pads[name][0], pads[name][1], z]


# --------------------------------------------------------------------------- physics


def mass_properties(build):
    g, bom = build.g, build.bom
    mats = bom["materials"]
    per_voxel = {}
    table = []
    total = 0.0
    for c in g.comps:
        if c.voxels == 0:
            continue
        if c.mass_g is None:
            m = mats[c.material]
            mass = c.voxels / 1000.0 * m["density"] * m["print_solidity"]
            src = f"{c.voxels} mm³ × {m['density']} g/cm³ × {m['print_solidity']} solidity"
        else:
            mass = c.mass_g
            src = "BOM"
        per_voxel[c.cid] = mass / c.voxels
        total += mass
        table.append({"component": c.name, "kind": c.kind, "mass_g": round(mass, 1), "voxels_mm3": c.voxels, "source": src})
    # CG
    sx = sy = sz = 0.0
    for (x, y, z), cid in g.cells.items():
        m = per_voxel[cid]
        sx += m * (x + 0.5)
        sy += m * (y + 0.5)
        sz += m * (z + 0.5)
    cg = (sx / total, sy / total, sz / total)
    # inertia about CG (g·mm² → kg·m²)
    ixx = iyy = izz = ixy = ixz = iyz = 0.0
    cx, cy, cz = cg
    for (x, y, z), cid in g.cells.items():
        m = per_voxel[cid]
        dx, dy, dz = x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz
        ixx += m * (dy * dy + dz * dz)
        iyy += m * (dx * dx + dz * dz)
        izz += m * (dx * dx + dy * dy)
        ixy -= m * dx * dy
        ixz -= m * dx * dz
        iyz -= m * dy * dz
    k = 1e-9  # g·mm² → kg·m²
    inertia = {"Ixx": ixx * k, "Iyy": iyy * k, "Izz": izz * k, "Ixy": ixy * k, "Ixz": ixz * k, "Iyz": iyz * k}
    frame_mass = sum(r["mass_g"] for r in table if r["kind"] in ("frame", "guard"))
    return {"total_g": total, "cg_mm": cg, "inertia_kgm2": inertia, "table": table, "frame_and_guards_g": frame_mass}


def propulsion(build, auw_g):
    P = build.bom["propulsion"]
    V = P["cells"] * P["v_cell_nominal"]
    D = P["prop_diameter_in"] * IN_TO_MM / 1000.0
    rho = P["air_density"]
    n_max = P["kv"] * V * P["rpm_load_factor"] / 60.0  # rev/s
    T_max = P["ct"] * rho * n_max ** 2 * D ** 4  # N
    P_aero = P["cp"] * rho * n_max ** 3 * D ** 5
    P_elec = P_aero / P["drive_efficiency"]
    I_max = P_elec / V
    if P.get("max_thrust_g_per_motor_override"):
        T_max = P["max_thrust_g_per_motor_override"] / 1000 * G
    if P.get("max_current_a_per_motor_override"):
        I_max = P["max_current_a_per_motor_override"]
        P_elec = I_max * V
    W = auw_g / 1000 * G
    T_hover = W / 4
    ratio = min(T_hover / T_max, 1.0)
    n_ratio = math.sqrt(ratio)
    I_hover_motor = I_max * n_ratio ** 3
    idle = P["idle_w_video"] if build.p["kit"] == "video" else P["idle_w_base"]
    I_total = 4 * I_hover_motor + idle / V
    cap_ah = build.bom["components"]["battery"]["capacity_mah"] / 1000.0
    t_min = cap_ah * P["usable_capacity"] / I_total * 60
    t_min_850 = 0.85 * P["usable_capacity"] / I_total * 60
    disc_area_dm2 = 4 * math.pi * (D / 2 * 10) ** 2  # dm²
    k_q = (P["cp"] / (2 * math.pi)) * D / P["ct"]  # torque per thrust, m
    return {
        "pack_v_nominal": V,
        "rpm_max_loaded": n_max * 60,
        "max_thrust_g_per_motor": T_max / G * 1000,
        "max_thrust_N_per_motor": T_max,
        "max_current_a_per_motor": I_max,
        "max_electrical_w_per_motor": P_elec,
        "motor_power_limit_w": P["motor_max_power_w"],
        "within_motor_power_limit": P_elec <= P["motor_max_power_w"],
        "esc_headroom": f"{4 * I_max:.0f} A total at WOT vs {P['esc_continuous_a']} A/motor ESC",
        "thrust_to_weight": 4 * T_max / W,
        "hover_thrust_g_per_motor": T_hover / G * 1000,
        "hover_throttle_est": n_ratio,
        "hover_current_a_total": I_total,
        "hover_power_w": I_total * V,
        "flight_time_min_1000mah": t_min,
        "flight_time_min_850mah": t_min_850,
        "disc_loading_g_per_dm2": auw_g / disc_area_dm2,
        "torque_per_thrust_m": k_q,
        "sibling_3s_current_a": P["sibling_3s_current_a"],
        "note": "Ct/Cp model; swap in thrust-stand numbers via the override fields in bom.json",
    }


def beam_check(build, prop, mp):
    """Arm as a cantilever from the plate edge to the motor centre."""
    p, bom = build.p, build.bom
    mat = bom["materials"][p["material"]]
    m = max(build.motors.items(), key=lambda kv: math.hypot(*kv[1][:2]))
    mx, my, _ = m[1]
    rx, ry = build.arm_root[m[0]]
    L = math.hypot(mx - rx, my - ry) / 1000.0
    w = p["arm_width"] / 1000.0
    t = p["arm_thickness"] / 1000.0
    I = w * t ** 3 / 12
    E = mat["E_gpa"] * 1e9
    sig_y = mat["strength_mpa"] * 1e6
    auw = mp["total_g"] / 1000.0
    tip_mass = (bom["components"]["motor"]["mass_g"] + bom["components"]["prop"]["mass_g"]) / 1000.0
    arm_mass = w * t * L * mat["density"] * 1000 * mat["print_solidity"]  # kg

    def stress(F):
        return 6 * F * L / (w * t * t)

    F_thrust = prop["max_thrust_N_per_motor"]
    rows = []
    for label, F in [("max thrust", F_thrust), ("crash 5 g on the arm tip", 5 * auw * G),
                     ("crash 10 g", 10 * auw * G), ("crash 20 g", 20 * auw * G)]:
        s = stress(F)
        rows.append({"load": label, "force_N": F, "stress_MPa": s / 1e6,
                     "SF_flat_print": sig_y / s, "SF_standing_print": sig_y * mat["layer_factor"] / s})
    delta = F_thrust * L ** 3 / (3 * E * I)
    k = 3 * E * I / L ** 3
    f1 = 1 / (2 * math.pi) * math.sqrt(k / (tip_mass + 0.24 * arm_mass))
    return {
        "material": p["material"], "arm_length_mm": L * 1000, "arm_section_mm": [p["arm_width"], p["arm_thickness"]],
        "second_moment_m4": I, "loads": rows, "tip_deflection_mm_at_max_thrust": delta * 1000,
        "first_bending_mode_hz": f1,
        "prop_rev_hz_hover": prop["rpm_max_loaded"] / 60 * prop["hover_throttle_est"],
        "prop_rev_hz_max": prop["rpm_max_loaded"] / 60,
        "tg_c": mat["tg_c"],
        "note": "Euler-Bernoulli cantilever, rectangular section; SF < 1 means the arm yields. 'standing print' = layers across the arm (weak direction).",
    }


def crash_energy(mp):
    m = mp["total_g"] / 1000
    return {"KE_J_at_5_m_s": 0.5 * m * 25, "KE_J_at_10_m_s": 0.5 * m * 100, "KE_J_2_m_drop": m * G * 2,
            "impact_speed_2_m_drop_m_s": math.sqrt(2 * G * 2)}


# --------------------------------------------------------------------------- simulation


def solve4(A, b):
    n = 4
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        if abs(M[c][c]) < 1e-12:
            raise ValueError("singular mixer")
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


def q_mul(a, b):
    w1, x1, y1, z1 = a
    w2, x2, y2, z2 = b
    return (w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
            w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
            w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
            w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2)


def q_rotate(q, v):
    w, x, y, z = q
    vx, vy, vz = v
    # v' = q v q*
    t = q_mul(q_mul(q, (0, vx, vy, vz)), (w, -x, -y, -z))
    return t[1:]


def q_to_euler(q):
    w, x, y, z = q
    roll = math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))
    pitch = math.asin(max(-1, min(1, 2 * (w * y - z * x))))
    yaw = math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
    return roll, pitch, yaw


def simulate(build, mp, prop, out_csv, T=8.0, dt=0.001):
    m = mp["total_g"] / 1000
    I = mp["inertia_kgm2"]
    Ixx, Iyy, Izz = I["Ixx"], I["Iyy"], I["Izz"]
    cg = mp["cg_mm"]
    T_max = prop["max_thrust_N_per_motor"]
    k_q = prop["torque_per_thrust_m"]
    # motor positions relative to CG (m); torque from thrust at (x,y): (y·T, −x·T, 0)
    mot = []
    for i in (1, 2, 3, 4):
        x, y, spin = build.motors[i]
        rx, ry = (x - cg[0]) / 1000, (y - cg[1]) / 1000
        s = 1 if spin == "CW" else -1  # CW prop → CCW (+z) reaction torque on the body
        mot.append((rx, ry, s))
    A = [[1, 1, 1, 1], [r[1] for r in mot], [-r[0] for r in mot], [r[2] * k_q for r in mot]]
    hover_dist = solve4(A, [m * G, 0, 0, 0])

    # state
    pos = [0.0, 0.0, 0.0]
    vel = [0.0, 0.0, 0.0]
    q = (1.0, 0.0, 0.0, 0.0)
    omega = [0.0, 0.0, 0.0]
    T_act = [m * G / 4] * 4
    tau_m = 0.02
    CdA = 0.02 * 0.6  # frontal area × Cd (rough)
    rho = build.bom["propulsion"]["air_density"]
    kp_z, kd_z = 6.0, 4.0
    # One fixed "PID profile" flown on every variant: gains in N·m per rad, sized for a ~4e-4 kg·m² frame,
    # so heavier or asymmetric frames show up as slower / less damped responses.
    I_REF_RP, I_REF_Y = 4e-4, 8e-4
    kp_a, kd_a = 60.0, 12.0
    kd_yaw = 8.0
    log = []
    sat_steps = 0
    energy_J = 0.0
    V = prop["pack_v_nominal"]
    I_max = prop["max_current_a_per_motor"]
    steps = int(T / dt)
    roll_ref_deg = lambda t: 15.0 if 3.0 <= t < 4.5 else 0.0
    z_ref = 1.0
    roll_settled_t = None
    for k in range(steps):
        t = k * dt
        roll, pitch, yaw = q_to_euler(q)
        # altitude loop → collective thrust (world z)
        az = kp_z * (z_ref - pos[2]) + kd_z * (0 - vel[2]) + G
        tilt = max(math.cos(roll) * math.cos(pitch), 0.5)
        T_tot = max(0.0, min(m * az / tilt, 4 * T_max))
        # attitude loop
        rr = math.radians(roll_ref_deg(t))
        tau_x = I_REF_RP * (kp_a * (rr - roll) - kd_a * omega[0])
        tau_y = I_REF_RP * (kp_a * (0 - pitch) - kd_a * omega[1])
        tau_z = I_REF_Y * (-kd_yaw * omega[2])
        try:
            T_cmd = solve4(A, [T_tot, tau_x, tau_y, tau_z])
        except ValueError:
            T_cmd = [T_tot / 4] * 4
        sat = False
        for i in range(4):
            c = T_cmd[i]
            if c < 0 or c > T_max:
                sat = True
            c = max(0.0, min(T_max, c))
            T_act[i] += (c - T_act[i]) * dt / tau_m
        sat_steps += sat
        # forces
        Tsum = sum(T_act)
        thrust_world = q_rotate(q, (0, 0, Tsum))
        speed = math.sqrt(sum(v * v for v in vel))
        drag = [-0.5 * rho * CdA * speed * v for v in vel]
        acc = [(thrust_world[i] + drag[i]) / m - (G if i == 2 else 0) for i in range(3)]
        for i in range(3):
            vel[i] += acc[i] * dt
            pos[i] += vel[i] * dt
        if pos[2] < 0:
            pos[2] = 0.0
            vel[2] = max(vel[2], 0.0)
        # torques (body)
        tx = sum(mot[i][1] * T_act[i] for i in range(4))
        ty = sum(-mot[i][0] * T_act[i] for i in range(4))
        tz = sum(mot[i][2] * k_q * T_act[i] for i in range(4))
        wx, wy, wz = omega
        # Euler's equations with diagonal inertia
        dwx = (tx - (Izz - Iyy) * wy * wz) / Ixx
        dwy = (ty - (Ixx - Izz) * wz * wx) / Iyy
        dwz = (tz - (Iyy - Ixx) * wx * wy) / Izz
        omega = [wx + dwx * dt, wy + dwy * dt, wz + dwz * dt]
        dq = q_mul(q, (0, omega[0] * 0.5 * dt, omega[1] * 0.5 * dt, omega[2] * 0.5 * dt))
        q = tuple(q[i] + dq[i] for i in range(4))
        n = math.sqrt(sum(c * c for c in q))
        q = tuple(c / n for c in q)
        # power (cubic in rpm ~ T^1.5)
        P_el = sum(I_max * V * (max(Ti, 0) / T_max) ** 1.5 for Ti in T_act)
        energy_J += P_el * dt
        if 4.5 <= t and roll_settled_t is None and abs(math.degrees(roll)) < 1.0 and abs(omega[0]) < 0.2:
            roll_settled_t = t - 4.5
        if k % 10 == 0:
            log.append((t, pos[2], vel[2], math.degrees(roll), math.degrees(pitch), math.degrees(yaw),
                        roll_ref_deg(t), *[Ti / T_max for Ti in T_act], P_el))
    with open(out_csv, "w") as f:
        f.write("t_s,z_m,vz_m_s,roll_deg,pitch_deg,yaw_deg,roll_ref_deg,m1_throttle,m2_throttle,m3_throttle,m4_throttle,power_w\n")
        for row in log:
            f.write(",".join(f"{v:.4f}" for v in row) + "\n")
    zs = [r[1] for r in log]
    max_z = max(zs)
    rise_t = next((r[0] for r in log if r[1] >= 0.9 * z_ref), None)
    last = [r for r in log if r[0] >= T - 1.0]
    hover_thr = sum(sum(r[7:11]) / 4 for r in last) / len(last)
    max_roll = max(r[3] for r in log)
    # control authority
    roll_auth = T_max * sum(abs(r[1]) for r in mot if r[1] > 0) / Ixx
    pitch_auth = T_max * sum(abs(r[0]) for r in mot if r[0] > 0) / Iyy
    yaw_auth = 2 * k_q * T_max / Izz
    return {
        "hover_thrust_distribution_g": [x / G * 1000 for x in hover_dist],
        "hover_throttle_sim": hover_thr,
        "altitude_overshoot_pct": (max_z - z_ref) / z_ref * 100,
        "rise_time_90pct_s": rise_t,
        "roll_step_peak_deg": max_roll,
        "roll_return_settle_s": roll_settled_t,
        "motor_saturation_pct_of_time": sat_steps / steps * 100,
        "energy_used_Wh": energy_J / 3600,
        "avg_power_w": energy_J / T,
        "roll_authority_rad_s2": roll_auth,
        "pitch_authority_rad_s2": pitch_auth,
        "yaw_authority_rad_s2": yaw_auth,
        "note": "Rigid body, diagonal inertia from the voxel model, motor lag 20 ms, quadratic drag, cascaded PD controller with one fixed gain set for all variants (like flying one Betaflight profile on every frame); takeoff to 1 m then a 15° roll step at t=3–4.5 s.",
    }


# --------------------------------------------------------------------------- export: mesh

AXES_UV = {0: (1, 2), 1: (0, 2), 2: (0, 1)}
NATURAL_SIGN = {0: 1, 1: -1, 2: 1}


def greedy_mesh(grid):
    """Return {cid: [quad, ...]}; quad = 4 corner tuples (mm), outward wound."""
    by = grid.by_comp()
    out = {}
    for cid, cells in by.items():
        cellset = cells
        quads = []
        for a in range(3):
            u, v = AXES_UV[a]
            for s in (-1, 1):
                layers = defaultdict(set)
                for c in cellset:
                    nb = list(c)
                    nb[a] += s
                    if grid.cells.get(tuple(nb)) != cid:
                        layers[c[a]].add((c[u], c[v]))
                for w, mask in layers.items():
                    plane = w + (1 if s > 0 else 0)
                    remaining = set(mask)
                    for start in sorted(mask):
                        if start not in remaining:
                            continue
                        u0, v0 = start
                        du = 1
                        while (u0 + du, v0) in remaining:
                            du += 1
                        dv = 1
                        while all((u0 + i, v0 + dv) in remaining for i in range(du)):
                            dv += 1
                        for i in range(du):
                            for j in range(dv):
                                remaining.discard((u0 + i, v0 + j))
                        corners_uv = [(u0, v0), (u0 + du, v0), (u0 + du, v0 + dv), (u0, v0 + dv)]
                        if s * NATURAL_SIGN[a] < 0:
                            corners_uv.reverse()
                        quad = []
                        for cu, cv in corners_uv:
                            pt = [0, 0, 0]
                            pt[a] = plane
                            pt[u] = cu
                            pt[v] = cv
                            quad.append(tuple(pt))
                        quads.append(quad)
        out[cid] = quads
    return out


def write_stl(path, quads_by_comp, include=None):
    tris = []
    for cid, quads in quads_by_comp.items():
        if include is not None and cid not in include:
            continue
        for q in quads:
            tris.append((q[0], q[1], q[2]))
            tris.append((q[0], q[2], q[3]))
    with open(path, "wb") as f:
        f.write(b"drone-building layout stand-in (1 mm voxels)".ljust(80, b"\0"))
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            L = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            f.write(struct.pack("<3f", nx / L, ny / L, nz / L))
            for p in (a, b, c):
                f.write(struct.pack("<3f", *p))
            f.write(struct.pack("<H", 0))
    return len(tris)


def write_obj(path, grid, quads_by_comp):
    mtl_path = path[:-4] + ".mtl"
    verts = {}
    order = []

    def vid(p):
        if p not in verts:
            verts[p] = len(verts) + 1
            order.append(p)
        return verts[p]

    faces = []
    for cid, quads in quads_by_comp.items():
        fl = []
        for q in quads:
            fl.append([vid(p) for p in q])
        faces.append((cid, fl))
    with open(path, "w") as f:
        f.write(f"mtllib {os.path.basename(mtl_path)}\n")
        for p in order:
            f.write(f"v {p[0]} {p[1]} {p[2]}\n")
        for cid, fl in faces:
            c = grid.comps[cid]
            f.write(f"g {safe(c.name)}\nusemtl m{cid}\n")
            for q in fl:
                f.write("f " + " ".join(str(i) for i in q) + "\n")
    with open(mtl_path, "w") as f:
        for cid in quads_by_comp:
            c = grid.comps[cid]
            r, g_, b = hex_rgb(c.color)
            f.write(f"newmtl m{cid}\nKd {r:.3f} {g_:.3f} {b:.3f}\n")
            if c.kind == "prop":
                f.write("d 0.4\n")
            f.write("\n")


def safe(s):
    return "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in s)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


# --------------------------------------------------------------------------- export: sketches

SCALE = 3.0  # px per mm


def _proj(view, prim):
    """Return ('rect', x0,y0,x1,y1) | ('circle', cx,cy,r,r_in) | ('poly', pts) in page mm."""
    k = prim["kind"]
    if view == "top":  # page X = -y, page Y = -x (nose up)
        if k == "box":
            return ("rect", -prim["y1"], -prim["x1"], -prim["y0"], -prim["x0"])
        if k == "cyl":
            return ("circle", -prim["cy"], -prim["cx"], prim["r"], prim.get("r_in", 0))
        if k == "poly":
            return ("poly", [(-y, -x) for x, y in prim["pts"]])
    if view == "side":  # right side: page X = x, page Y = -z
        if k == "box":
            return ("rect", prim["x0"], -prim["z1"], prim["x1"], -prim["z0"])
        if k == "cyl":
            return ("rect", prim["cx"] - prim["r"], -prim["z1"], prim["cx"] + prim["r"], -prim["z0"])
        if k == "poly":
            xs = [p[0] for p in prim["pts"]]
            return ("rect", min(xs), -prim["z1"], max(xs), -prim["z0"])
    if view == "front":  # page X = y, page Y = -z
        if k == "box":
            return ("rect", prim["y0"], -prim["z1"], prim["y1"], -prim["z0"])
        if k == "cyl":
            return ("rect", prim["cy"] - prim["r"], -prim["z1"], prim["cy"] + prim["r"], -prim["z0"])
        if k == "poly":
            ys = [p[1] for p in prim["pts"]]
            return ("rect", min(ys), -prim["z1"], max(ys), -prim["z0"])
    return None


def _pt(view, xyz):
    x, y, z = xyz
    if view == "top":
        return (-y, -x)
    if view == "side":
        return (x, -z)
    return (y, -z)


def write_svg(path, view, build, mp, prop, title):
    g = build.g
    x0, y0, z0, x1, y1, z1 = g.bounds()
    # page extents (mm)
    if view == "top":
        px0, py0, px1, py1 = -y1 - 10, -x1 - 10, -y0 + 10, -x0 + 10
    elif view == "side":
        px0, py0, px1, py1 = x0 - 10, -z1 - 10, x1 + 10, -z0 + 10
    else:
        px0, py0, px1, py1 = y0 - 10, -z1 - 10, y1 + 10, -z0 + 10
    legend_w = 300
    header = 60
    gx0, gx1 = int(math.floor(px0 / 10) * 10), int(math.ceil(px1 / 10) * 10)
    gy0, gy1 = int(math.floor(py0 / 10) * 10), int(math.ceil(py1 / 10) * 10)
    W = int((gx1 - gx0) * SCALE) + legend_w + 20
    legend_rows = len(mp["table"]) + 10 + len(build.checks)
    H = max(int((gy1 - gy0) * SCALE) + header + 30, header + legend_rows * 15 + 60)
    ox, oy = -gx0 * SCALE + 10, -gy0 * SCALE + header

    def X(v):
        return v * SCALE + ox

    def Y(v):
        return v * SCALE + oy

    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Menlo, monospace" font-size="11">',
         f'<rect width="{W}" height="{H}" fill="#fbfbfa"/>',
         f'<text x="12" y="20" font-size="15" font-weight="bold">{esc_(title)} — {view} view</text>',
         f'<text x="12" y="38" fill="#555">1 grid square = 10 mm · AUW {mp["total_g"]:.0f} g · CG ({mp["cg_mm"][0]:.1f}, {mp["cg_mm"][1]:.1f}, {mp["cg_mm"][2]:.1f}) mm · T/W {prop["thrust_to_weight"]:.1f} · hover ≈ {prop["hover_throttle_est"]*100:.0f} % · est. flight {prop["flight_time_min_1000mah"]:.0f} min</text>']
    # grid
    for v in range(gx0, gx1 + 1, 10):
        s.append(f'<line x1="{X(v):.1f}" y1="{Y(gy0):.1f}" x2="{X(v):.1f}" y2="{Y(gy1):.1f}" stroke="{"#c9ccd1" if v % 50 else "#9aa0a6"}" stroke-width="{0.5 if v % 50 else 1}"/>')
    for v in range(gy0, gy1 + 1, 10):
        s.append(f'<line x1="{X(gx0):.1f}" y1="{Y(v):.1f}" x2="{X(gx1):.1f}" y2="{Y(v):.1f}" stroke="{"#c9ccd1" if v % 50 else "#9aa0a6"}" stroke-width="{0.5 if v % 50 else 1}"/>')
    # axes
    s.append(f'<line x1="{X(0):.1f}" y1="{Y(gy0):.1f}" x2="{X(0):.1f}" y2="{Y(gy1):.1f}" stroke="#333" stroke-width="1"/>')
    s.append(f'<line x1="{X(gx0):.1f}" y1="{Y(0):.1f}" x2="{X(gx1):.1f}" y2="{Y(0):.1f}" stroke="#333" stroke-width="1"/>')
    axis_lbl = {"top": ("← left (+y) · right (−y) →", "nose (+x) ↑"), "side": ("nose (+x) →", "up (+z) ↑"), "front": ("left (+y) →", "up (+z) ↑")}
    s.append(f'<text x="{X(gx0)+4:.1f}" y="{Y(gy1)+14:.1f}" fill="#333">{axis_lbl[view][0]}</text>')
    s.append(f'<text x="{X(0)+4:.1f}" y="{Y(gy0)-4:.1f}" fill="#333">{axis_lbl[view][1]}</text>')
    # components: frame/guards first, then the rest, props last
    kind_order = {"frame": 0, "guard": 1, "hardware": 2, "battery": 3, "electronics": 4, "prop": 5}
    for c in sorted(g.comps, key=lambda c: kind_order.get(c.kind, 9)):
        if c.voxels == 0 and not c.prims:
            continue
        fill_op = {"frame": 0.55, "guard": 0.45, "prop": 0.12, "battery": 0.6}.get(c.kind, 0.75)
        for prim in c.prims:
            pr = _proj(view, prim)
            if not pr:
                continue
            dashed = ' stroke-dasharray="4 3"' if prim.get("dashed") else ""
            if pr[0] == "rect":
                _, a, b, c2, d = pr
                s.append(f'<rect x="{X(a):.1f}" y="{Y(b):.1f}" width="{(c2-a)*SCALE:.1f}" height="{(d-b)*SCALE:.1f}" fill="{c.color}" fill-opacity="{fill_op}" stroke="{c.color}" stroke-width="1"{dashed}/>')
            elif pr[0] == "circle":
                _, cx, cy, r, r_in = pr
                if r_in:
                    s.append(f'<path d="M {X(cx-r):.1f} {Y(cy):.1f} a {r*SCALE:.1f} {r*SCALE:.1f} 0 1 0 {2*r*SCALE:.1f} 0 a {r*SCALE:.1f} {r*SCALE:.1f} 0 1 0 {-2*r*SCALE:.1f} 0 Z M {X(cx-r_in):.1f} {Y(cy):.1f} a {r_in*SCALE:.1f} {r_in*SCALE:.1f} 0 1 1 {2*r_in*SCALE:.1f} 0 a {r_in*SCALE:.1f} {r_in*SCALE:.1f} 0 1 1 {-2*r_in*SCALE:.1f} 0 Z" fill="{c.color}" fill-opacity="{fill_op}" stroke="{c.color}" fill-rule="evenodd"/>')
                else:
                    s.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{r*SCALE:.1f}" fill="{c.color}" fill-opacity="{fill_op}" stroke="{c.color}" stroke-width="1"{dashed}/>')
            elif pr[0] == "poly":
                pts = " ".join(f"{X(a):.1f},{Y(b):.1f}" for a, b in pr[1])
                s.append(f'<polygon points="{pts}" fill="{c.color}" fill-opacity="{fill_op}" stroke="{c.color}" stroke-width="1"/>')
    # marks
    for mk in build.marks:
        kx, ky = _pt(view, mk["xyz"])
        if mk["kind"] == "hole":
            s.append(f'<circle cx="{X(kx):.1f}" cy="{Y(ky):.1f}" r="{mk["d"]/2*SCALE:.1f}" fill="#fff" stroke="#222" stroke-width="0.8"/>')
        elif mk["kind"] == "pad" and view == "top":
            s.append(f'<rect x="{X(kx)-4:.1f}" y="{Y(ky)-4:.1f}" width="8" height="8" fill="#ffd400" stroke="#7a5c00" stroke-width="0.8"/>')
            s.append(f'<text x="{X(kx)+5:.1f}" y="{Y(ky)-4:.1f}" font-size="8" fill="#7a5c00">{esc_(mk["label"].replace("ESC ", ""))}</text>')
        elif mk["kind"] == "socket" and view == "top":
            s.append(f'<rect x="{X(kx)-6:.1f}" y="{Y(ky)-4:.1f}" width="12" height="8" fill="none" stroke="#0b6bcb" stroke-width="1.2"/>')
            s.append(f'<text x="{X(kx)+8:.1f}" y="{Y(ky)+3:.1f}" font-size="8" fill="#0b6bcb">{esc_(mk["label"].replace("FC ", ""))}</text>')
        elif mk["kind"] == "motor" and view == "top":
            r = 14 * SCALE
            # 270° arc; θ measured counter-clockwise on screen. CW: θ decreasing (sweep=1), CCW: increasing (sweep=0)
            if mk["spin"] == "CW":
                a0, a1, sweep = math.radians(200), math.radians(-70), 1
            else:
                a0, a1, sweep = math.radians(-20), math.radians(250), 0
            p0 = (X(kx) + r * math.cos(a0), Y(ky) - r * math.sin(a0))
            p1 = (X(kx) + r * math.cos(a1), Y(ky) - r * math.sin(a1))
            s.append(f'<path d="M {p0[0]:.1f} {p0[1]:.1f} A {r:.1f} {r:.1f} 0 1 {sweep} {p1[0]:.1f} {p1[1]:.1f}" fill="none" stroke="#111" stroke-width="1.5" marker-end="url(#arrow)"/>')
            s.append(f'<text x="{X(kx)-5:.1f}" y="{Y(ky)+5:.1f}" font-size="13" font-weight="bold" fill="#111">{mk["order"]}</text>')
            s.append(f'<text x="{X(kx)+6:.1f}" y="{Y(ky)+16:.1f}" font-size="9" fill="#111">{mk["spin"]}</text>')
        elif mk["kind"] == "keepout":
            sz = mk["size"]
            if view == "top":
                a, b = -mk["xyz"][1] - sz[1], -mk["xyz"][0] - sz[0]
                w_, h_ = sz[1], sz[0]
            elif view == "side":
                a, b = mk["xyz"][0], -mk["xyz"][2] - sz[2]
                w_, h_ = sz[0], sz[2]
            else:
                a, b = mk["xyz"][1], -mk["xyz"][2] - sz[2]
                w_, h_ = sz[1], sz[2]
            s.append(f'<rect x="{X(a):.1f}" y="{Y(b):.1f}" width="{w_*SCALE:.1f}" height="{h_*SCALE:.1f}" fill="none" stroke="#d6336c" stroke-dasharray="5 3" stroke-width="1.2"/>')
            s.append(f'<text x="{X(a)+2:.1f}" y="{Y(b)-3:.1f}" font-size="8" fill="#d6336c">{esc_(mk["label"])}</text>')
        elif mk["kind"] == "wire" and view == "top":
            pts = " ".join(f"{X(_pt(view, p)[0]):.1f},{Y(_pt(view, p)[1]):.1f}" for p in mk["route"])
            s.append(f'<polyline points="{pts}" fill="none" stroke="#e8590c" stroke-width="1.5" stroke-dasharray="2 2"/>')
        elif mk["kind"] == "antenna" and view == "top":
            s.append(f'<text x="{X(kx)-20:.1f}" y="{Y(ky)+18:.1f}" font-size="8" fill="#c0553f">{esc_(mk["label"])}</text>')
        elif mk["kind"] == "camera" and view == "top":
            # FOV cone
            half = math.radians(mk["fov_deg"] / 2)
            L = 90
            p1 = _pt(view, (mk["xyz"][0] + L * math.cos(half), mk["xyz"][1] + L * math.sin(half), 0))
            p2 = _pt(view, (mk["xyz"][0] + L * math.cos(half), mk["xyz"][1] - L * math.sin(half), 0))
            s.append(f'<polygon points="{X(kx):.1f},{Y(ky):.1f} {X(p1[0]):.1f},{Y(p1[1]):.1f} {X(p2[0]):.1f},{Y(p2[1]):.1f}" fill="#6b4fbb" fill-opacity="0.08" stroke="#6b4fbb" stroke-dasharray="3 3"/>')
        elif mk["kind"] == "camera" and view == "side":
            tilt = math.radians(mk["tilt_deg"])
            p1 = _pt(view, (mk["xyz"][0] + 60 * math.cos(tilt), 0, mk["xyz"][2] + 60 * math.sin(tilt)))
            s.append(f'<line x1="{X(kx):.1f}" y1="{Y(ky):.1f}" x2="{X(p1[0]):.1f}" y2="{Y(p1[1]):.1f}" stroke="#6b4fbb" stroke-dasharray="3 3"/>')
    # CG
    cx, cy = _pt(view, mp["cg_mm"])
    s.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="7" fill="none" stroke="#d6336c" stroke-width="2"/>')
    s.append(f'<line x1="{X(cx)-11:.1f}" y1="{Y(cy):.1f}" x2="{X(cx)+11:.1f}" y2="{Y(cy):.1f}" stroke="#d6336c" stroke-width="2"/>')
    s.append(f'<line x1="{X(cx):.1f}" y1="{Y(cy)-11:.1f}" x2="{X(cx):.1f}" y2="{Y(cy)+11:.1f}" stroke="#d6336c" stroke-width="2"/>')
    s.append(f'<text x="{X(cx)+10:.1f}" y="{Y(cy)-8:.1f}" font-size="10" fill="#d6336c" font-weight="bold">CG</text>')
    # legend
    lx = W - legend_w + 10
    ly = 60
    s.append(f'<text x="{lx}" y="{ly}" font-weight="bold">Components (mass)</text>')
    ly += 6
    seen = set()
    for row in mp["table"]:
        name = row["component"]
        color = next(c.color for c in g.comps if c.name == name)
        if name.startswith(("Motor ", "Prop ")):
            # four identical parts → one legend row
            key = name.split(" ")[0]
            if key in seen:
                continue
            seen.add(key)
            part = name.split(" (")[0].split(" ", 2)[2]  # drop "Motor 1 "
            label = f"4× {key.lower()} {part}  {row['mass_g']*4:.0f} g"
        else:
            label = f"{name[:34]}  {row['mass_g']:.1f} g"
        ly += 15
        s.append(f'<rect x="{lx}" y="{ly-10}" width="10" height="10" fill="{color}"/>')
        s.append(f'<text x="{lx+16}" y="{ly-1}" font-size="10">{esc_(label)}</text>')
    ly += 22
    s.append(f'<text x="{lx}" y="{ly}" font-weight="bold">Marks</text>')
    for lab, col in [("○ M2 hole", "#222"), ("■ solder pad (ESC)", "#7a5c00"), ("□ plug socket (FC)", "#0b6bcb"),
                     ("⤺ motor order / spin (Betaflight)", "#111"), ("╌ keep-out / envelope", "#d6336c"), ("╌ wire route", "#e8590c"), ("⊕ centre of gravity", "#d6336c")]:
        ly += 14
        s.append(f'<text x="{lx}" y="{ly}" font-size="10" fill="{col}">{esc_(lab)}</text>')
    ly += 22
    s.append(f'<text x="{lx}" y="{ly}" font-weight="bold">Checks</text>')
    for ch in build.checks:
        ly += 14
        s.append(f'<text x="{lx}" y="{ly}" font-size="9" fill="{"#2b8a3e" if ch["pass"] else "#c92a2a"}">{"PASS" if ch["pass"] else "FAIL"} {esc_(ch["check"])}</text>')
    s.insert(1, '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#111"/></marker></defs>')
    s.append("</svg>")
    with open(path, "w") as f:
        f.write("\n".join(s))
    return W, H


def esc_(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def write_iso_svg(path, build, quads_by_comp, mp, title, az_deg=-35, el_deg=30):
    """Painter's-algorithm isometric of the greedy-meshed voxels; no 3-D viewer needed."""
    g = build.g
    az, el = math.radians(az_deg), math.radians(el_deg)
    d = (math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el))  # scene → camera
    right = (-math.sin(az), math.cos(az), 0.0)
    up = (d[1] * right[2] - d[2] * right[1], d[2] * right[0] - d[0] * right[2], d[0] * right[1] - d[1] * right[0])
    shade = {(0, 0, 1): 1.0, (0, 0, -1): 0.55, (1, 0, 0): 0.8, (-1, 0, 0): 0.6, (0, 1, 0): 0.7, (0, -1, 0): 0.88}
    polys = []
    for cid, quads in quads_by_comp.items():
        c = g.comps[cid]
        r, gg, b = hex_rgb(c.color)
        for q in quads:
            ux, uy, uz = q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]
            vx, vy, vz = q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]
            n = (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
            L = math.sqrt(sum(k * k for k in n)) or 1
            n = tuple(round(k / L) for k in n)
            if n[0] * d[0] + n[1] * d[1] + n[2] * d[2] <= 0:
                continue  # back face
            depth = sum(sum(p[i] * d[i] for i in range(3)) for p in q) / 4
            sc = shade.get(n, 0.75)
            pts = [(sum(p[i] * right[i] for i in range(3)), sum(p[i] * up[i] for i in range(3))) for p in q]
            polys.append((depth, pts, f"rgb({int(r*255*sc)},{int(gg*255*sc)},{int(b*255*sc)})", c.kind))
    polys.sort(key=lambda t: t[0])
    xs = [p[0] for _, pts, _, _ in polys for p in pts]
    ys = [p[1] for _, pts, _, _ in polys for p in pts]
    S = 3.0
    W = int((max(xs) - min(xs)) * S) + 40
    H = int((max(ys) - min(ys)) * S) + 80
    ox, oy = -min(xs) * S + 20, max(ys) * S + 60
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Menlo, monospace" font-size="11">',
         f'<rect width="{W}" height="{H}" fill="#fbfbfa"/>',
         f'<text x="12" y="20" font-size="15" font-weight="bold">{esc_(title)} — isometric</text>',
         f'<text x="12" y="38" fill="#555">1 mm voxels, greedy-meshed · AUW {mp["total_g"]:.0f} g · view from front-right, {el_deg}° above</text>']
    for depth, pts, col, kind in polys:
        op = ' fill-opacity="0.35"' if kind == "prop" else ""
        s.append(f'<polygon points="{" ".join(f"{x*S+ox:.1f},{oy-y*S:.1f}" for x, y in pts)}" fill="{col}"{op} stroke="{col}" stroke-width="0.3"/>')
    s.append("</svg>")
    with open(path, "w") as f:
        f.write("\n".join(s))
    return W, H


def write_slices(path, build, step=5, cell=2):
    g = build.g
    x0, y0, z0, x1, y1, z1 = g.bounds()
    lines = [f"# {build.p['name']} — voxel slices, {cell} mm per character, one slice every {step} mm (z up the file). Letters = component codes from bom.json; '.' empty."]
    for z in range(z0, z1, step):
        lines.append(f"\n--- z = {z} mm ---")
        for x in range(x1 - 1, x0 - 1, -cell):  # nose at the top of the page
            row = []
            for y in range(y1 - 1, y0 - 1, -cell):  # left of the aircraft at the left of the page
                code = "."
                for dx in range(cell):
                    for dy in range(cell):
                        cid = g.cells.get((x - dx, y - dy, z))
                        if cid is not None:
                            code = g.comps[cid].code
                            break
                    if code != ".":
                        break
                row.append(code)
            lines.append("".join(row))
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")


# --------------------------------------------------------------------------- report


def fmt(v, nd=1):
    return f"{v:.{nd}f}" if isinstance(v, (int, float)) else str(v)


def write_report(path, build, mp, prop, beam, crash, sim, files):
    p = build.p
    L = []
    L.append(f"# {p['title']}\n")
    L.append(f"Variant `{p['name']}` · kit **{p['kit']}** · generated by `scripts/build_drone_model.py` from `cad/bom.json` (parts list v2) + `cad/variants.json`. 1 mm voxel model — a layout stand-in for fit, mass, and physics before anything is printed or bought; not the final printable stock frame (that is the Onshape model, TODO).\n")
    if p.get("notes"):
        L.append(f"> {p['notes']}\n")
    L.append("## Files\n")
    for k, v in files.items():
        L.append(f"- `{v}` — {k}")
    L.append("\n## Geometry\n")
    L.append(f"| Item | Value |\n|---|---|")
    L.append(f"| Wheelbase | {build.wheelbase:.1f} mm |")
    for m in (1, 2, 3, 4):
        x, y, spin = build.motors[m]
        L.append(f"| Motor {m} | ({x:.0f}, {y:.0f}) mm, {spin} |")
    L.append(f"| Arms | {p['arm_width']} × {p['arm_thickness']} mm {p['material']}, style `{p['style']}` |")
    L.append(f"| Plates | {p['plate_thickness']} mm, centre {p['center_plate']} mm, standoffs {p['standoff_h']} mm |")
    L.append(f"| Prop plane | z = {build.prop_z} mm; guards {'on' if p['guards'] else 'off'} (outer r {build.guard_r_out:.1f} mm) |")
    L.append(f"| Battery | {p['battery_mount']}-mounted, box {[round(v) for v in build.battery_box]} |")
    L.append(f"| Solder joints (Solder SKU) | {build.solder_joints} (parts list v2 §3: 16 ESC + 0–4 RX) |")
    L.append("\n## Checks\n")
    L.append("| Check | Result | Detail |\n|---|---|---|")
    for ch in build.checks:
        L.append(f"| {ch['check']} | {'PASS' if ch['pass'] else '**FAIL**'} | {ch['detail']} |")
    ov = build.overlaps()
    unexpected = [o for o in ov if not o["expected"]]
    if unexpected:
        L.append("\n**Interference** (voxel overlap, first placed wins): " + "; ".join(f"{o['a']} ↔ {o['b']} {o['mm3']} mm³" for o in unexpected))
    expected = [o for o in ov if o["expected"]]
    if expected:
        L.append(f"\nExpected overlaps (spokes on pads, straps through slots, standoffs in holes): {sum(o['mm3'] for o in expected)} mm³ across {len(expected)} pairs.")
    db = build.disc_blockage
    L.append(f"\nProp disc shadowing: {db['inflow_above_pct']:.1f} % of the disc area has parts above the prop plane (inflow), {db['outflow_below_pct']:.1f} % below (outflow). Per motor (above/below %): " +
             ", ".join(f"M{d['motor']} {d['above_pct']:.0f}/{d['below_pct']:.0f}" for d in db["per_motor"]))
    L.append("\n## Mass and balance\n")
    dz = mp["cg_mm"][2] - build.prop_z
    L.append(f"**AUW {mp['total_g']:.0f} g** ({'under' if mp['total_g'] < 250 else 'OVER'} the 250 g soft cap) · frame + guards {mp['frame_and_guards_g']:.0f} g · CG ({mp['cg_mm'][0]:.1f}, {mp['cg_mm'][1]:.1f}, {mp['cg_mm'][2]:.1f}) mm from the frame centre, bottom-plate underside = z 0 · prop plane z {build.prop_z} mm → CG is **{abs(dz):.1f} mm {'above' if dz > 0 else 'below'} the prop plane**.\n")
    L.append("| Component | Mass (g) | Source |\n|---|---:|---|")
    for r in mp["table"]:
        L.append(f"| {r['component']} | {r['mass_g']:.1f} | {r['source']} |")
    I = mp["inertia_kgm2"]
    L.append(f"\nInertia about the CG (kg·m²): Ixx {I['Ixx']:.2e} (roll) · Iyy {I['Iyy']:.2e} (pitch) · Izz {I['Izz']:.2e} (yaw) · Ixz {I['Ixz']:.1e}\n")
    refs = []
    for key, comp in build.bom["components"].items():
        if comp.get("kit") == "video" and p["kit"] != "video":
            continue
        imgs = [f"[{os.path.basename(i)}](../../{i})" for i in comp.get("images", [])]
        srcs = [f"[{u.split('/')[2]}]({u})" for u in comp.get("sources", [])]
        if imgs or srcs:
            refs.append(f"| {comp['part'][:60]} | {' '.join(imgs) or '—'} | {' '.join(srcs) or '—'} |")
    if refs:
        L.append("## Reference images and sources\n")
        L.append("| Part | Images (`cad/images/`) | Sources |\n|---|---|---|")
        L.extend(refs)
        L.append("")
    L.append("## Propulsion (estimate)\n")
    L.append(f"| Item | Value |\n|---|---|")
    L.append(f"| Pack | {prop['pack_v_nominal']:.1f} V nominal ({build.bom['propulsion']['cells']}S) |")
    L.append(f"| Max thrust / motor | {prop['max_thrust_g_per_motor']:.0f} g at ≈{prop['rpm_max_loaded']:.0f} rpm |")
    L.append(f"| Max current / motor | {prop['max_current_a_per_motor']:.1f} A ({prop['max_electrical_w_per_motor']:.0f} W; motor limit {prop['motor_power_limit_w']} W; sibling data {prop['sibling_3s_current_a']} A) |")
    L.append(f"| Thrust-to-weight | **{prop['thrust_to_weight']:.1f} : 1** |")
    L.append(f"| Hover | {prop['hover_thrust_g_per_motor']:.0f} g/motor at ≈{prop['hover_throttle_est']*100:.0f} % throttle, {prop['hover_current_a_total']:.1f} A total ({prop['hover_power_w']:.0f} W) |")
    L.append(f"| Flight time (hover, 80 % of pack) | **{prop['flight_time_min_1000mah']:.0f} min** on 1000 mAh · {prop['flight_time_min_850mah']:.0f} min on 850 mAh |")
    L.append(f"| Disc loading | {prop['disc_loading_g_per_dm2']:.1f} g/dm² |")
    L.append(f"| ESC | {prop['esc_headroom']} |")
    L.append(f"\n{prop['note']}.\n")
    L.append("## Arm beam check\n")
    L.append(f"Longest arm {beam['arm_length_mm']:.0f} mm, section {beam['arm_section_mm'][0]}×{beam['arm_section_mm'][1]} mm {beam['material']} (Tg {beam['tg_c']} °C).\n")
    L.append("| Load case | Force (N) | Stress (MPa) | SF flat print | SF standing print |\n|---|---:|---:|---:|---:|")
    for r in beam["loads"]:
        L.append(f"| {r['load']} | {r['force_N']:.1f} | {r['stress_MPa']:.1f} | {r['SF_flat_print']:.1f} | {r['SF_standing_print']:.1f} |")
    L.append(f"\nTip deflection at max thrust {beam['tip_deflection_mm_at_max_thrust']:.2f} mm · first bending mode ≈ {beam['first_bending_mode_hz']:.0f} Hz (prop rotation {beam['prop_rev_hz_hover']:.0f} Hz at hover, {beam['prop_rev_hz_max']:.0f} Hz max — keep the arm mode away from these). {beam['note']}\n")
    L.append("## Crash energy\n")
    L.append(f"KE at 5 m/s {crash['KE_J_at_5_m_s']:.1f} J · at 10 m/s {crash['KE_J_at_10_m_s']:.1f} J · 2 m drop {crash['KE_J_2_m_drop']:.1f} J ({crash['impact_speed_2_m_drop_m_s']:.1f} m/s).\n")
    L.append("## Hover simulation\n")
    L.append(f"| Metric | Value |\n|---|---|")
    hd = sim["hover_thrust_distribution_g"]
    L.append(f"| Static hover thrust per motor (M1–M4, from the CG offset) | {hd[0]:.1f} / {hd[1]:.1f} / {hd[2]:.1f} / {hd[3]:.1f} g |")
    L.append(f"| Hover (sim, last second) | {sim['hover_throttle_sim']*100:.0f} % of max thrust ≈ {math.sqrt(sim['hover_throttle_sim'])*100:.0f} % rpm / stick |")
    L.append(f"| Takeoff to 1 m: rise time / overshoot | {fmt(sim['rise_time_90pct_s'], 2)} s / {sim['altitude_overshoot_pct']:.1f} % |")
    L.append(f"| 15° roll step: peak / return-settle | {sim['roll_step_peak_deg']:.1f}° / {fmt(sim['roll_return_settle_s'], 2)} s |")
    L.append(f"| Motor saturation | {sim['motor_saturation_pct_of_time']:.1f} % of steps |")
    L.append(f"| Control authority (max angular accel) | roll {sim['roll_authority_rad_s2']:.0f} · pitch {sim['pitch_authority_rad_s2']:.0f} · yaw {sim['yaw_authority_rad_s2']:.0f} rad/s² |")
    L.append(f"| Energy over the 8 s run | {sim['energy_used_Wh']:.3f} Wh, avg {sim['avg_power_w']:.0f} W |")
    L.append(f"\n{sim['note']}\n")
    with open(path, "w") as f:
        f.write("\n".join(L))


# --------------------------------------------------------------------------- main


def render_png(svg_path, w, h):
    if not os.path.exists(CHROME):
        return False
    png = svg_path[:-4] + ".png"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={png}",
                    f"--window-size={w},{h}", f"file://{svg_path}"], check=False,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.exists(png)


def run_variant(bom, var, name, png=False):
    p = variant_params(var, name)
    out = os.path.join(OUT_ROOT, name)
    os.makedirs(out, exist_ok=True)
    b = Build(bom, p)
    b.build()
    mp = mass_properties(b)
    prop = propulsion(b, mp["total_g"])
    beam = beam_check(b, prop, mp)
    crash = crash_energy(mp)
    sim = simulate(b, mp, prop, os.path.join(out, "sim-hover.csv"))
    b.check("AUW ≤ 250 g soft cap", mp["total_g"] <= 250, f"{mp['total_g']:.0f} g")
    b.check("arm SF ≥ 2 at max thrust", beam["loads"][0]["SF_flat_print"] >= 2, f"SF {beam['loads'][0]['SF_flat_print']:.1f}")

    quads = greedy_mesh(b.g)
    n_tri = write_stl(os.path.join(out, "assembly.stl"), quads)
    frame_ids = {c.cid for c in b.g.comps if c.kind in ("frame", "guard")}
    write_stl(os.path.join(out, "frame.stl"), quads, include=frame_ids)
    write_obj(os.path.join(out, "assembly.obj"), b.g, quads)
    sizes = {}
    for view in ("top", "side", "front"):
        w, h = write_svg(os.path.join(out, f"{view}.svg"), view, b, mp, prop, p["title"])
        sizes[view] = (w, h)
        if png:
            render_png(os.path.join(out, f"{view}.svg"), w, h)
    w, h = write_iso_svg(os.path.join(out, "iso.svg"), b, quads, mp, p["title"])
    if png:
        render_png(os.path.join(out, "iso.svg"), w, h)
    write_slices(os.path.join(out, "slices.txt"), b)
    with open(os.path.join(out, "marks.json"), "w") as f:
        json.dump({"variant": name, "axes": "x forward, y left, z up; mm", "marks": b.marks, "checks": b.checks,
                   "overlaps_mm3": b.overlaps(), "wiring": bom["wiring"]["connections"]}, f, indent=1)
    physics = {"variant": name, "kit": p["kit"], "mass": mp, "propulsion": prop, "beam": beam, "crash": crash, "sim": sim,
               "disc_blockage": b.disc_blockage, "camera_min_offaxis_deg": getattr(b, "cam_min_angle", None), "prop_z": b.prop_z, "checks": b.checks}
    with open(os.path.join(out, "physics.json"), "w") as f:
        json.dump(physics, f, indent=1)
    files = {"assembly STL (all parts)": "assembly.stl", "frame + guards STL": "frame.stl", "assembly OBJ with per-component groups": "assembly.obj",
             "top / side / front sketches": "top.svg, side.svg, front.svg", "isometric render": "iso.svg", "voxel slices": "slices.txt", "marks (holes, pads, sockets, keep-outs, wires, checks)": "marks.json",
             "physics": "physics.json", "hover sim log": "sim-hover.csv"}
    write_report(os.path.join(out, "report.md"), b, mp, prop, beam, crash, sim, files)
    print(f"{name:16s} AUW {mp['total_g']:6.1f} g  frame {mp['frame_and_guards_g']:5.1f} g  CG z {mp['cg_mm'][2]:5.1f}  T/W {prop['thrust_to_weight']:.1f}  hover {prop['hover_throttle_est']*100:.0f}%  "
          f"{prop['flight_time_min_1000mah']:.0f} min  voxels {len(b.g.cells)}  tris {n_tri}  checks {sum(c['pass'] for c in b.checks)}/{len(b.checks)}")
    return physics


def write_comparison(results):
    L = ["# Variant comparison\n", "Generated by `scripts/build_drone_model.py`. Same electronics in every row (parts list v2); only the frame layout changes. Estimates — see each variant's `report.md` for assumptions.\n"]
    L.append("| Variant | Kit | AUW g | Frame+guards g | CG z mm (props at) | Ixx / Iyy / Izz (g·cm²) | T/W | Hover % | Hover A | Flight min | Disc shadow above % | Arm SF (thrust / 10 g crash) | Roll / pitch / yaw authority rad/s² | Roll peak ° / settle s | Cam→prop ° | Checks |")
    L.append("|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|---|---|---|---:|---|")
    for r in results:
        I = r["mass"]["inertia_kgm2"]
        b = r["beam"]["loads"]
        s = r["sim"]
        checks = r["checks"]
        fails = [c["check"] for c in checks if not c["pass"]]
        cam = r.get("camera_min_offaxis_deg")
        L.append(f"| `{r['variant']}` | {r['kit']} | {r['mass']['total_g']:.0f} | {r['mass']['frame_and_guards_g']:.0f} | {r['mass']['cg_mm'][2]:.1f} ({r['prop_z']}) | "
                 f"{I['Ixx']*1e7:.0f} / {I['Iyy']*1e7:.0f} / {I['Izz']*1e7:.0f} | {r['propulsion']['thrust_to_weight']:.1f} | {r['propulsion']['hover_throttle_est']*100:.0f} | "
                 f"{r['propulsion']['hover_current_a_total']:.1f} | {r['propulsion']['flight_time_min_1000mah']:.0f} | {r['disc_blockage']['inflow_above_pct']:.0f} | {b[0]['SF_flat_print']:.1f} / {b[2]['SF_flat_print']:.1f} | "
                 f"{s['roll_authority_rad_s2']:.0f} / {s['pitch_authority_rad_s2']:.0f} / {s['yaw_authority_rad_s2']:.0f} | {s['roll_step_peak_deg']:.1f} / {fmt(s['roll_return_settle_s'], 2)} | "
                 f"{'—' if cam is None else f'{cam:.0f}'} | {'all pass' if not fails else 'FAIL: ' + '; '.join(fails)} |")
    L.append("\nReading the table: CG below the prop plane and larger inertia = calmer, slower response; higher authority = snappier. Roll peak/settle are from one fixed controller gain set flown on every frame, so differences are the frame's. Arm SF is for the flat-printed orientation; the standing-print number in each report is 40–50 % lower for PLA/PETG. Cam→prop = smallest angle between the camera axis and a front prop (O4 sees ±77.5°; bigger is better).\n")
    with open(os.path.join(OUT_ROOT, "comparison.md"), "w") as f:
        f.write("\n".join(L))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--variant", "-v", default="all", help="variant name from cad/variants.json, or 'all'")
    ap.add_argument("--png", action="store_true", help="render SVG sketches to PNG with Google Chrome")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--clean", action="store_true", help="remove cad/out first")
    a = ap.parse_args()
    bom, var = load_specs()
    if a.list:
        for k, v in var["variants"].items():
            print(f"{k:16s} {v['title']}")
        return
    if a.clean and os.path.isdir(OUT_ROOT):
        shutil.rmtree(OUT_ROOT)
    os.makedirs(OUT_ROOT, exist_ok=True)
    # variants whose frame is an imported mesh (frame_stl) belong to the exact-CAD framework only
    names = [n for n, v in var["variants"].items() if "frame_stl" not in v] if a.variant == "all" else [a.variant]
    results = [run_variant(bom, var, n, png=a.png) for n in names]
    if a.variant == "all":
        write_comparison(results)
        print(f"\ncomparison → {os.path.relpath(os.path.join(OUT_ROOT, 'comparison.md'), REPO)}")


if __name__ == "__main__":
    main()
