"""Frame builder: parametric printed frame + placed kit components for one variant.

Bodies are collected as (solid, kind, mass_g|None, material|None); kind ∈ frame, guard, electronics, prop,
battery, hardware, wire, keepout. Printed parts are collected separately for STL export.
"""
from __future__ import annotations

import math

from build123d import Axis, Box, Color, Cylinder, Pos, Rot

from . import parts as P
from .geom import bar, box, cyl, safe_fillet, strut, wire_sweep, z_edges_near

WIRE_DENSITY_G_MM3 = 0.0016  # silicone-insulated stranded copper, bundle average


class FrameBuild:
    def __init__(self, kit, variant):
        self.kit, self.p = kit, kit.params(variant)
        self.bom = kit.bom
        self.motors = kit.motors(self.p)
        self.bodies = []       # (solid, kind, mass_g|None, material|None)
        self.print_parts = {}  # name -> solid (as printed, z up)
        self.checks = []
        self.arm_root = {}
        self.wires = []        # dicts: name, length_mm, radius
        self.notes = []

    # ------------------------------------------------------------------ helpers
    def add(self, solid, kind, mass_g=None, material=None):
        self.bodies.append((solid, kind, mass_g, material))
        return solid

    def add_all(self, items, material=None):
        for solid, kind, mass in items:
            self.add(solid, kind, mass, material)

    def check(self, name, ok, detail):
        self.checks.append({"check": name, "pass": None if ok is None else bool(ok), "detail": detail})

    # ------------------------------------------------------------------ arms
    def arm(self, p0, p1, width, thick):
        """Arm body from p0 (root, on the plate) to p1 (motor centre).

        arm_style: solid — bar width × thick;
                   truss — vertical Warren truss (chords top/bottom, diagonals in the x–z plane), height truss_height,
                           as in the Fusion reference frame: far stiffer in bending for the same mass;
                   truss-flat — planar truss in the arm plane (saves mass, no bending gain).
        """
        p = self.p
        (x0, y0), (x1, y1) = p0, p1
        L = math.hypot(x1 - x0, y1 - y0)
        ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
        style = p["arm_style"]
        if style == "solid":
            return bar(p0, p1, width, thick, 0)
        chord, web = p["truss_chord"], p["truss_web"]
        Lt = L - p["motor_pad_r"] + 2          # truss ends inside the motor pad
        if style == "truss":
            H = p["truss_height"]
            local = box(Lt, width, chord, Lt / 2, 0, 0) + box(Lt, width, chord, Lt / 2, 0, H - chord)  # bottom + top chords
            local += box(6, width, H, 3, 0, 0) + box(4, width, H, Lt - 5.5, 0, 0)                       # root and pad-end posts (post clears the pad rim)
            gz = min(H, self.z_esc - 0.5)                                                                # root gusset runs 9 mm into the plate, under the ESC
            local += box(9, width, gz, -4.5, 0, 0)
            pitch = max((H - chord) * 1.0, 8.0)
            n = max(2, int(Lt / pitch))
            xs = [Lt * k / n for k in range(n + 1)]
            for k in range(n):
                za, zb = (chord / 2, H - chord / 2) if k % 2 == 0 else (H - chord / 2, chord / 2)
                s = strut((xs[k], 0, za), (xs[k + 1], 0, zb), width, web)
                if s is not None:
                    local += s
            self.arm_top = max(getattr(self, "arm_top", thick), H)
            return Pos(x0, y0, 0) * Rot(0, 0, ang) * local
        # truss-flat
        yo = width / 2 - chord / 2
        local = box(Lt, chord, thick, Lt / 2, yo, 0) + box(Lt, chord, thick, Lt / 2, -yo, 0)
        local += box(6, width, thick, 3, 0, 0)
        pitch = max(width * 1.1, 8.0)
        n = max(2, int(Lt / pitch))
        xs = [Lt * k / n for k in range(n + 1)]
        yin = width / 2 - chord
        for k in range(n):
            sa, sb = (1, -1) if k % 2 == 0 else (-1, 1)
            local += bar((xs[k], sa * yin), (xs[k + 1], sb * yin), web, thick, 0)
        for xk in xs:
            local += bar((xk, -yin), (xk, yin), web, thick, 0)
        return Pos(x0, y0, 0) * Rot(0, 0, ang) * local

    # ------------------------------------------------------------------ build
    def build(self):
        """Frame (printed parametric, or imported from a third-party mesh) + the kit's components on it."""
        if self.p.get("frame_stl"):
            self._frame_from_mesh()
        else:
            self._frame_printed()
        self._components()

    def _deck_layout(self, top_xmin, top_xmax):
        """Battery / BeeID / strap positions on the top deck between x = top_xmin and top_xmax."""
        C, p = self.bom["components"], self.p
        bat, bee = C["battery"]["dims"], C["beeid"]["dims"]
        bee_x0 = top_xmin + 2
        bee_x1 = bee_x0 + bee[0]
        bx0 = -bat[0] / 2
        if p["battery_mount"] == "top" and bx0 < bee_x1 + 3:
            bx0 = bee_x1 + 3
        self.bee_x0, self.bee_x1, self.bx0, self.sx = bee_x0, bee_x1, bx0, bx0 + bat[0] / 2

    def _frame_printed(self):
        p, C, kit = self.p, self.bom["components"], self.kit
        t, at, cp = p["plate_thickness"], p["arm_thickness"], p["center_plate"]
        half = cp / 2
        hole_r = (2.0 + 2 * p["hole_clearance"]) / 2
        z_top0 = t + p["standoff_h"]
        self.arm_top = at
        self.z_esc = t + 3
        frame_color = "#5b6470" if p["material"] != "CF" else "#1f2328"
        stack_holes = [(sx, sy) for sx in (-10, 10) for sy in (-10, 10)]
        self.z_top0, self.t, self.half, self.hole_r, self.stack_holes = z_top0, t, half, hole_r, stack_holes
        self.top_t, self.pad_z, self.own_standoffs, self.mesh_frame = t, {m: at for m in self.motors}, True, None

        # ---- bottom plate + arms (printed part 1)
        bottom = box(cp, cp, t)
        bottom = safe_fillet(bottom, bottom.edges().filter_by(Axis.Z), 5)
        roots = []
        if p["style"] == "x":
            # solid arms start 8 mm inside the plate (fillet junction); tall truss arms start at the plate edge so their
            # root posts stay clear of the stack boards
            r_root = half - 8 if p["arm_style"] != "truss" else half + 1
            for m, (mx, my, _) in self.motors.items():
                L = math.hypot(mx, my)
                ux, uy = mx / L, my / L
                root = (ux * r_root, uy * r_root)
                self.arm_root[m] = root
                roots.append((ux * half, uy * half))
                bottom += self.arm(root, (mx, my), p["arm_width"], at)
                bottom += cyl(p["motor_pad_r"], at, mx, my, 0)
        else:
            for side in (-1, 1):
                ys = side * abs(self.motors[2][1])
                xf, xr = self.motors[2][0], self.motors[1][0]
                bottom += self.arm((xr, ys), (xf, ys), p["arm_width"], at)
                bottom += cyl(p["motor_pad_r"], at, xf, ys, 0) + cyl(p["motor_pad_r"], at, xr, ys, 0)
                bottom += bar((0, side * (half - 4)), (0, ys), p["arm_width"], at, 0)
                roots.append((0, side * half))
            for m, (mx, my, _) in self.motors.items():
                self.arm_root[m] = (0, my)
        if p["root_fillet"]:
            bottom = safe_fillet(bottom, z_edges_near(bottom, roots, p["arm_width"] * 0.9), p["root_fillet"])
        for hx, hy in stack_holes:
            bottom -= cyl(hole_r, 20, hx, hy, -5)
        if p["plate_cutouts"]:
            for cx, cy in ((16, 0), (-16, 0), (0, 16), (0, -16)):
                bottom -= cyl(4, 20, cx, cy, -5)
        for m, (mx, my, _) in self.motors.items():
            for dx in (-6, 6):
                for dy in (-6, 6):
                    bottom -= cyl(hole_r, 20, mx + dx, my + dy, -5)
            bottom -= cyl(4, 20, mx, my, -5)
        if p["camera"]:
            cam = C["o4_camera"]["dims"]
            for side in (-1, 1):
                yc = side * (cam[1] / 2 + 1.5)
                plate = box(14, 1.5, 22, half + 4, yc, t)
                plate -= Pos(half + 4, yc, t + 10) * Rot(90, 0, 0) * Cylinder(1.1, 4)
                bottom += plate
            self.cam_pos = (half + 4, 0.0, t + 10)
        # ---- optional lattice keel (side walls between the plates, one body with the bottom)
        if p["keel"]:
            kt = p["keel_thickness"]
            kw = C["stack_esc"]["dims"][1] / 2 + 3 + kt / 2  # just outside the stack boards
            kl = min(cp - 6, 32)  # short enough that the wall corners stay 3 mm clear of the prop discs
            h = z_top0 - t
            for side in (-1, 1):
                y = side * kw
                wall = box(kl, kt, 2, 0, y, t) + box(kl, kt, 2, 0, y, z_top0 - 2)
                wall += box(2, kt, h, -kl / 2 + 1, y, t) + box(2, kt, h, kl / 2 - 1, y, t)
                for sgn in (1, -1):
                    s = strut((-sgn * (kl / 2 - 1), y, t + 1), (sgn * (kl / 2 - 1), y, z_top0 - 1), kt, 2)
                    if s is not None:
                        wall += s
                bottom += wall
            self.notes.append("keel: lattice side walls tie the plates together (stiffness; adds mass, blocks side access)")
        bottom.label, bottom.color = "Frame bottom + arms", Color(frame_color)
        self.add(bottom, "frame", material=p["material"])
        self.print_parts["frame-bottom"] = bottom
        self.bottom = bottom
        self.fea_fixed = [(hx, hy, 3.0) for hx, hy in stack_holes]
        self._top_plate(frame_color)

    def _top_plate(self, frame_color):
        """Printed top plate (part 2): stack holes, BeeID pocket, strap slots; sets the deck layout."""
        p, C = self.p, self.bom["components"]
        t, z_top0, half, hole_r, stack_holes = self.t, self.z_top0, self.half, self.hole_r, self.stack_holes
        bat, bee = C["battery"]["dims"], C["beeid"]["dims"]
        top_f, top_r, top_w = half, half + 22 + 4, half
        if p["battery_mount"] == "top":
            top_f = max(half, bat[0] / 2 + 4)
            top_r = max(top_r, bat[0] / 2 + 4 + 22 + 4)
            top_w = max(half, bat[1] / 2 + 3)
        top = box(top_f + top_r, 2 * top_w, t, (top_f - top_r) / 2, 0, z_top0)
        top = safe_fillet(top, top.edges().filter_by(Axis.Z), 5)
        for hx, hy in stack_holes:
            top -= cyl(hole_r, 20, hx, hy, z_top0 - 5)
        self._deck_layout(-top_r, top_f)
        bee_x0, bee_x1, sx = self.bee_x0, self.bee_x1, self.sx
        for yy in (-bee[1] / 2 - 1, bee[1] / 2):
            top += box(bee[0] + 2, 1, 4, (bee_x0 + bee_x1) / 2, yy + 0.5, z_top0 + t)
        top += box(1, bee[1] + 2, 4, bee_x0 - 0.5, 0, z_top0 + t)
        for yy in (-bat[1] / 2 - 2.5, bat[1] / 2 + 2.5):
            top -= box(14, 3, 20, sx, yy, z_top0 - 5)
        top.label, top.color = "Frame top plate", Color(frame_color)
        self.add(top, "frame", material=p["material"])
        self.print_parts["frame-top"] = top

    # ------------------------------------------------------------------ frame imported from a mesh
    def _frame_from_mesh(self):
        """Frame body from a third-party STL (e.g. the Fusion reference print) with the kit's parts mounted on it.

        The mesh is analysed (plate levels, holes, stack / motor patterns), re-centred on its stack pattern, rotated by
        `frame_rotate_z_deg` into kit axes (x forward, y left), and used as the frame solid for every exact check.
        Mount mismatches are handled the way a builder would: a printed adapter plate for the stack, and a check that
        the kit's motor bolt pattern lands on pad material (drill). Variant keys: frame_stl (path relative to the kit),
        frame_rotate_z_deg (default 0), frame_origin [x, y] (default: detected stack centre).
        """
        import os
        from build123d import Compound, Mesher
        from . import meshref
        from .spec import vox
        p, C, kit = self.p, self.bom["components"], self.kit
        path = p["frame_stl"] if os.path.isabs(p["frame_stl"]) else os.path.join(kit.path, p["frame_stl"])
        tris = meshref.load(path)
        st = meshref.stats(tris)
        det = meshref.detect(tris, st)
        stack = next(((float(k), cs[0]) for k, cs in det["stack_patterns"].items() if cs), None)
        motors_mesh = det["motors_xy"]
        if len(motors_mesh) != 4:
            raise ValueError(f"{os.path.basename(path)}: could not find four motor mounts")
        if p.get("frame_origin"):
            ox, oy = p["frame_origin"]
        elif stack:
            ox, oy = stack[1]
        else:
            ox, oy = sum(m[0] for m in motors_mesh) / 4, sum(m[1] for m in motors_mesh) / 4
        rot = float(p.get("frame_rotate_z_deg", 0.0))
        cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))

        def xf(x, y):
            dx, dy = x - ox, y - oy
            return (dx * cr - dy * sr, dx * sr + dy * cr)

        shapes = Mesher().read(path)
        solid = shapes[0] if len(shapes) == 1 else Compound(children=shapes)
        solid = Rot(0, 0, rot) * Pos(-ox, -oy, 0) * solid

        # motors → Betaflight numbering by quadrant (1 RR, 2 FR, 3 RL, 4 FL); spins from the kit layout
        mk = [xf(x, y) for x, y in motors_mesh]
        self.motors = {}
        for m, (fr, ysign, spin) in vox.MOTOR_LAYOUT.items():
            want = (1 if fr == "front" else -1, ysign)
            cand = [q for q in mk if (q[0] > 0) == (want[0] > 0) and (q[1] > 0) == (want[1] > 0)]
            if not cand:
                raise ValueError(f"no motor in the {fr}/{'left' if ysign > 0 else 'right'} quadrant after rotating {rot}° — check frame_rotate_z_deg / frame_origin")
            self.motors[m] = (round(cand[0][0], 2), round(cand[0][1], 2), spin)

        # plate levels: base plate top, and a top deck if the mesh has one (plateau ≥ 10 mm above the base)
        t = st["base_plate_top_z"]
        upper = [z for z in st["z_plateaus"] if z >= t + 10]
        has_deck = bool(upper)
        frame_color = "#8a6d3b"  # reference prints get a distinct tan so they read differently from the kit frame
        p["plate_thickness"] = p["arm_thickness"] = t  # the mesh sets the levels the components see
        self.t, self.arm_top = t, t
        if has_deck:
            z_top0 = upper[0]
            self.top_t = (upper[1] - z_top0) if len(upper) > 1 else p["plate_thickness"]
        else:
            z_top0, self.top_t = t + p["standoff_h"], t
        self.z_top0 = z_top0
        p["standoff_h"] = round(z_top0 - t, 2)

        # motor pad heights and 12×12 hole landing (probe the solid exactly)
        self.hole_r = (2.0 + 2 * p["hole_clearance"]) / 2
        self.pad_z = {}
        landing = []
        for m, (mx, my, _) in self.motors.items():
            probe = (cyl(8, 60, mx, my, -30) - cyl(3, 62, mx, my, -31)) & solid
            self.pad_z[m] = round(probe.bounding_box().max.Z, 2) if probe.volume > 1 else t
            bad = []
            for dx in (-6, 6):
                for dy in (-6, 6):
                    core = cyl(1.1, 6, mx + dx, my + dy, self.pad_z[m] - 6) & solid
                    if core.volume < 0.5 * math.pi * 1.1 ** 2 * min(6, t):
                        bad.append((round(mx + dx, 1), round(my + dy, 1)))
            landing += bad
        kit_pat = str(C["motor"].get("mount", {}).get("pattern", "12x12"))
        mesh_pat = det.get("motor_pattern_found") or "no square pattern"
        if not landing:
            self.check(f"motor {kit_pat} M2 holes land on pad material (drill the pads; mesh has {mesh_pat})", True, "all 16 hole positions on solid pad")
        else:
            # pads too small for the kit motors: printed adapter disc per motor — kit pattern on top, the mesh's own holes below
            ad_t = 2.0
            for m, (mx, my, _) in self.motors.items():
                pz = self.pad_z[m]
                disc = cyl(p["motor_pad_r"], ad_t, mx, my, pz) - cyl(4.0, ad_t + 2, mx, my, pz - 1)
                for dx in (-6, 6):
                    for dy in (-6, 6):
                        disc -= cyl(self.hole_r, ad_t + 2, mx + dx, my + dy, pz - 1)
                for hx, hy, hd in det["hole_list"]:
                    qx, qy = xf(hx, hy)
                    r = math.hypot(qx - mx, qy - my)
                    if 2.5 < r < p["motor_pad_r"] - 1.5 and hd < 4.0:
                        disc -= cyl(hd / 2 + 0.2, ad_t + 2, qx, qy, pz - 1)
                disc.label, disc.color = f"Motor adapter M{m} ({mesh_pat} → {kit_pat}, printed)", Color("#c9a227")
                self.add(disc, "hardware", material=p["material"])
                if m == 2:
                    self.print_parts["motor-adapter"] = Pos(-mx, -my, -pz) * disc
                self.pad_z[m] = round(pz + ad_t, 2)
            self.check(f"motor mount: mesh pads have {mesh_pat}, kit motors need {kit_pat}", None,
                       f"{len(landing)} of 16 kit hole positions over air → printed {ad_t:g} mm adapter disc per motor (Ø{2 * p['motor_pad_r']:g}); motors sit {ad_t:g} mm higher")

        # stack: use the mesh pattern directly if it matches the kit, else a printed adapter plate on the base plate
        kit_stack = float(str(C["stack_fc"].get("mount", {}).get("pattern", "20x20")).lower().split("x")[0])
        self.stack_holes = [(sx, sy) for sx in (-kit_stack / 2, kit_stack / 2) for sy in (-kit_stack / 2, kit_stack / 2)]
        self.half = (stack[0] if stack else kit_stack) / 2 + 8
        if stack and abs(stack[0] - kit_stack) < 0.5:
            self.z_esc = t + 3
            self.fea_fixed = [(hx, hy, 3.0) for hx, hy in self.stack_holes]
            self.check(f"stack mount {kit_stack:g}×{kit_stack:g} present in the mesh", True, "kit stack bolts straight on")
        elif stack:
            s = stack[0]
            ad_t = 2.0
            side = s + 8
            mesh_holes = [(sx, sy) for sx in (-s / 2, s / 2) for sy in (-s / 2, s / 2)]
            plate = box(side, side, ad_t, 0, 0, t)
            plate = safe_fillet(plate, plate.edges().filter_by(Axis.Z), 3)
            for hx, hy in mesh_holes:
                plate -= cyl(1.7, 10, hx, hy, t - 4)      # M3 clearance to the mesh pattern
            for hx, hy in self.stack_holes:
                plate -= cyl(self.hole_r, 10, hx, hy, t - 4)  # M2 to the kit stack
            plate -= box(14, 14, 10, 0, 0, t - 4)          # centre opening for the ESC's underside / wires
            plate.label, plate.color = f"Stack adapter {s:g}→{kit_stack:g}×{kit_stack:g} (printed)", Color("#c9a227")
            self.add(plate, "hardware", material=p["material"])
            self.print_parts["stack-adapter"] = plate
            self.z_esc = t + ad_t + 3
            self.fea_fixed = [(hx, hy, 3.0) for hx, hy in mesh_holes]
            self.half = side / 2 + 4 + C["wiring"]["capacitor"]["dims"][0] / 2  # capacitor and pigtail sit outside the adapter
            self.check(f"stack mount: mesh has {s:g}×{s:g}, kit needs {kit_stack:g}×{kit_stack:g}", None,
                       f"printed {ad_t:g} mm adapter plate added ({side:g}×{side:g}); stack sits {ad_t:g} mm higher")
        else:
            self.z_esc = t + 3
            self.fea_fixed = [(hx, hy, 3.0) for hx, hy in self.stack_holes]
            self.check("stack mount pattern found in the mesh", False, "no 16/20/25.5/30.5 square of holes — stack position assumed at the motor centroid")
        self.own_standoffs = not has_deck
        p["arm_style"] = "imported mesh"
        for m, (mx, my, _) in self.motors.items():
            L = math.hypot(mx, my)
            self.arm_root[m] = (mx / L * (self.half + 2), my / L * (self.half + 2))

        solid.label, solid.color = f"Frame (reference mesh {os.path.basename(path)})", Color(frame_color)
        self.add(solid, "frame", material=p["material"])
        self.bottom, self.mesh_frame = solid, solid
        # section slab for the beam check: wide enough for the mesh arm, spanning the arm's full height
        self.section_w = 40.0
        self.section_z = (st["bbox_min"][2], max(self.pad_z.values()))

        if has_deck:
            loops = meshref.slice_loops(tris, z_top0 + 0.5)
            big = max(loops, key=lambda lp: abs(sum(lp[i][0] * lp[(i + 1) % len(lp)][1] - lp[(i + 1) % len(lp)][0] * lp[i][1] for i in range(len(lp)))))
            xs = [xf(x, y)[0] for x, y in big]
            self._deck_layout(min(xs), max(xs))
            self.notes.append(f"top deck from the mesh at z {z_top0}–{z_top0 + self.top_t:g} mm, x {min(xs):.0f}…{max(xs):.0f}: battery and BeeID placed on it, strap modelled through it")
        else:
            self._top_plate(frame_color)
        self.notes.append(f"frame from {os.path.basename(path)}: {st['triangles']} triangles, {st['volume_mm3'] / 1000:.1f} cm³; stack pattern "
                          f"{stack[0] if stack else '?'} at mesh ({ox:g}, {oy:g}) → origin, rotated {rot:g}°; motors {det.get('motor_pattern_found') or 'by arm-tip holes'}; "
                          f"pads at z {sorted(set(self.pad_z.values()))}")

    def _components(self):
        """Everything that is not the frame: stack, motors/props, guards, battery, BeeID, RX, wiring, checks."""
        p, C, kit = self.p, self.bom["components"], self.kit
        t, z_top0, half, hole_r, stack_holes = self.t, self.z_top0, self.half, self.hole_r, self.stack_holes
        at = p["arm_thickness"]
        bat, bee = C["battery"]["dims"], C["beeid"]["dims"]
        bee_x0, bee_x1, bx0, sx = self.bee_x0, self.bee_x1, self.bx0, self.sx
        deck_z = z_top0 + self.top_t  # top face of the top plate

        # ---- electronics (Tier C when a vendor STEP exists, else Tier B)
        esc, fc = C["stack_esc"], C["stack_fc"]
        z_esc = self.z_esc
        vendor = P.from_step(kit, "stack_esc", 0, 0, z_esc, "ESC 45A 4-in-1", esc["color"], esc["mass_g"])
        items = vendor or P.board(esc["dims"], 20, hole_r * 2, esc["color"], "ESC 45A 4-in-1", z_esc, pads=esc["pads"])
        for s, k, m in items:
            self.add(s, k, esc["mass_g"] if m is None else m)
        z_fc = z_esc + esc["dims"][2] + 4
        vendor = P.from_step(kit, "stack_fc", 0, 0, z_fc, "FC F722", fc["color"], fc["mass_g"])
        items = vendor or P.board(fc["dims"], 20, hole_r * 2, fc["color"], "FC F722", z_fc, sockets=fc["sockets"],
                                  connectors={"USB-C": (13, 9, 4, 9, 3.2)})
        for s, k, m in items:
            self.add(s, k, fc["mass_g"] if m is None else m)
        self.z_esc, self.z_fc = z_esc, z_fc
        stack_top = z_fc + fc["dims"][2]
        if p["camera"]:
            o4 = C["o4_air_unit"]
            z_o4 = stack_top + 4  # gummies / M2 standoffs above the FC's USB-C (3.2 mm)
            vendor = P.from_step(kit, "o4_air_unit", 0, 0, z_o4, "DJI O4 Air Unit", o4["color"], o4["mass_g"])
            for s, k, m in vendor or P.board(o4["dims"], 25.5, hole_r * 2, o4["color"], "DJI O4 Air Unit", z_o4,
                                             connectors={"coax": (0, 12, 6, 4, 2.5)}):
                self.add(s, k, o4["mass_g"] if m is None else m)
            stack_top = z_o4 + o4["dims"][2]
            cam = C["o4_camera"]
            cx, cy, cz = self.cam_pos
            body = Pos(cx, cy, cz) * Rot(0, -cam["tilt_deg"], 0) * (
                Box(cam["dims"][0], cam["dims"][1], cam["dims"][2]) + Pos(cam["dims"][0] / 2 + 2, 0, 0) * Rot(0, 90, 0) * Cylinder(4.5, 4))
            body.label, body.color = "DJI O4 camera", Color(cam["color"])
            self.add(body, "electronics", cam["mass_g"])
        clear = z_top0 - t
        need = fc["assembled_stack_height_mm"] + (C["o4_air_unit"]["dims"][2] + 4 + 2.5 if p["camera"] else 0)  # + O4 gap + its top coax plug
        self.check("stack clear height ≥ 16 mm (+O4 + coax plug if video)", clear >= max(16, need), f"clear {clear} mm; needs {need:.1f}; stack top z={stack_top}")
        self.stack_top = stack_top

        hw = C["hardware"]
        if self.own_standoffs:
            for i, (hx, hy) in enumerate(stack_holes):
                s = cyl(hw["standoff_d_mm"] / 2, p["standoff_h"], hx, hy, t) - cyl(1.0, p["standoff_h"] + 2, hx, hy, t - 1)
                s.label, s.color = f"Standoff {i + 1}", Color(hw["color"])
                self.add(s, "hardware", hw["mass_g"] / 4)

        mot, prop = C["motor"], C["prop"]
        self.prop_r = prop["diameter_mm"] / 2
        self.prop_z = max(self.pad_z.values()) + mot["dims"][2] + 3
        for m, (mx, my, spin) in self.motors.items():
            pz = self.pad_z[m]
            vendor = P.from_step(kit, "motor", mx, my, pz, f"Motor {m} XILO 1404 ({spin})", mot["color"], mot["mass_g"])
            self.add_all(vendor or P.motor(mot, mx, my, pz, f"Motor {m} XILO 1404 ({spin})"))
            self.add_all(P.prop(prop, mx, my, self.prop_z, f"Prop {m} Gemfan 3525 ({spin})", spin))

        # ---- guards
        if p["guards"]:
            r_in = self.prop_r + p["guard_gap"]
            r_out = r_in + p["guard_ring"]
            self.guard_r_out = r_out
            gz0 = self.prop_z - p["guard_h"] // 2
            for m, (mx, my, _) in self.motors.items():
                pz = self.pad_z[m]
                ring = cyl(r_out, p["guard_h"], mx, my, gz0) - cyl(r_in, p["guard_h"] + 2, mx, my, gz0 - 1)
                L = math.hypot(mx, my)
                ux, uy = mx / L, my / L
                for ang in (35, -35):
                    a = math.radians(ang)
                    vx, vy = ux * math.cos(a) - uy * math.sin(a), ux * math.sin(a) + uy * math.cos(a)
                    ring += bar((mx + vx * (p["motor_pad_r"] - 1), my + vy * (p["motor_pad_r"] - 1)),
                                (mx + vx * (r_in + 1), my + vy * (r_in + 1)), 3, gz0 - pz, pz)
                ring.label, ring.color = f"Prop guard {m} ({p['guard_material']})", Color("#7a8a99")
                self.add(ring, "guard", material=p["guard_material"])
                if m == 2:
                    # printed ring-down: flip so the ring is on the bed and the spokes rise from it (no overhangs)
                    self.print_parts["guard"] = Rot(180, 0, 0) * Pos(-mx, -my, 0) * ring
        else:
            self.guard_r_out = self.prop_r

        # ---- battery, strap, BeeID, RX, wiring lumps
        bd = C["battery"]
        tt = self.top_t
        bz0 = deck_z if p["battery_mount"] == "top" else -bat[2] - 1
        self.add_all(P.block(bd, bx0, -bat[1] / 2, bz0, f"Battery {bd['part'].split(',')[0]} (assumed)", fillet_r=2, kind="battery"))
        self.battery_box = (bx0, -bat[1] / 2, bz0, bx0 + bat[0], bat[1] / 2, bz0 + bat[2])
        strap = box(12, bat[1] + 6, bat[2] + tt + 4, sx, 0, min(bz0, z_top0) - 1) - box(12.2, bat[1] + 2, bat[2] + tt + 6, sx, 0, min(bz0, z_top0) - 2)
        strap.label, strap.color = "Battery strap", Color(C["strap"]["color"])
        self.add(strap, "hardware", C["strap"]["mass_g"])

        self.add_all(P.block(C["beeid"], bee_x0, -bee[1] / 2, deck_z, "BeeID GPS + Remote ID"))
        bee_c = ((bee_x0 + bee_x1) / 2, 0.0, deck_z + bee[2])
        self.add_all(P.keepout_cone(20, 30, bee_c[0], bee_c[1], bee_c[2], "BeeID GPS sky view"))

        rx = C["rx"]
        if p["battery_mount"] == "top":
            rz, d = -rx["dims"][2] - 1, -1
        else:
            rz, d = deck_z, 1
        rx_x0 = -half + 2 if d < 0 else half - 2 - rx["dims"][0]
        self.add_all(P.block(rx, rx_x0, -rx["dims"][1] / 2, rz, "ELRS RX"))
        rcx = rx_x0 + rx["dims"][0] / 2
        ant = rx.get("antenna", {})
        if ant.get("type") == "tower":
            # integrated tower antenna: short vertical stub, keep-out above/below it away from carbon and the pack
            up = 1 if rz >= 0 else -1
            tz = rz + rx["dims"][2] if up > 0 else rz - 15
            tower = cyl(1.5, 15, rcx, 0, tz)
            tower.label, tower.color = "ELRS tower antenna", Color("#222222")
            self.add(tower, "electronics", 0.0)
            self.add(self._kbox(12, 12, 20, rcx, 0, tz + (15 if up > 0 else -20), "ELRS antenna"), "keepout", 0.0)
        else:
            az = rz + rx["dims"][2] / 2
            ax = -half if d < 0 else half
            self.add_all(P.antenna_t(ax, 0, az, d, "ELRS T antenna"))
            self.add(self._kbox(10, 34, 10, ax + d * 30, 0, az - 5, "ELRS antenna tip"), "keepout", 0.0)
        self.rx_pos = (rcx, 0.0, rz + rx["dims"][2] if rz >= 0 else rz)

        w = C["wiring"]
        cap = cyl(w["capacitor"]["dims"][0] / 2, w["capacitor"]["dims"][2], -half + 4, 0, t)
        cap.label, cap.color = "Capacitor (low-ESR, on BAT pads)", Color(w["color"])
        self.add(cap, "hardware", 3.0)
        plug = next((k for k in ("xt30", "xt60") if k in w), None)
        xt = w[plug]["dims"] if plug else [12, 8, 12]
        pig = box(xt[0], xt[1], xt[2], -half - xt[0] / 2, 0, t + 2)
        pig.label, pig.color = f"{(plug or 'XT').upper()} pigtail", Color(w["color"])
        self.pig_pos = (-half - xt[0] / 2, 0.0, t + 2 + xt[2] / 2)
        if p["camera"]:
            self.print_parts["camera-plate"] = box(14, 1.5, 22, 0, 0, 0) - Pos(0, 0, 10) * Rot(90, 0, 0) * Cylinder(1.1, 4)

        # ---- wires (swept along splines); their mass comes out of the BOM wiring lump
        wire_mass = 0.0
        if p["wires"]:
            wire_mass = self.route_wires()
        self.add(pig, "hardware", max(0.5, w["mass_g"] - 3.0 - wire_mass))

        self.geometry_checks()

    def _kbox(self, l, w, h, x, y, z, label):
        k = box(l, w, h, x, y, z)
        k.label, k.color = f"KEEP-OUT {label}", Color(1.0, 0.3, 0.3, 0.25)
        return k

    # ------------------------------------------------------------------ wires
    def route_wires(self):
        p, C = self.p, self.bom["components"]
        esc, at, t = C["stack_esc"], p["arm_thickness"], p["plate_thickness"]
        z_pad = self.z_esc + esc["dims"][2] + 0.4
        total = 0.0
        mot_d = C["motor"]["dims"][0]
        for m, (mx, my, _) in self.motors.items():
            px, py = esc["pads"][f"M{m}"]
            rx, ry = self.arm_root[m]
            L = math.hypot(mx - rx, my - ry)
            ux, uy = (mx - rx) / L, (my - ry) / L
            zt = self.arm_top
            pts = [(px, py, z_pad + 1.5), (px + ux * 6, py + uy * 6, z_pad + 3),
                   (rx + ux * 4, ry + uy * 4, zt + 1.8), (mx - ux * (p["motor_pad_r"] + 4), my - uy * (p["motor_pad_r"] + 4), zt + 1.8),
                   (mx - ux * (mot_d / 2 + 0.5), my - uy * (mot_d / 2 + 0.5), self.pad_z[m] + 3.5)]
            total += self._wire(pts, 1.2, f"Motor {m} leads (3× 22 AWG)", "#c0392b")
        # battery: pigtail → ESC BAT pads (bundle to the midpoint of BAT+/BAT-)
        pads = esc["pads"]
        bp = [pads[k] for k in pads if k.startswith("BAT")] or [[-14, 0]]
        bx, by = sum(q[0] for q in bp) / len(bp), sum(q[1] for q in bp) / len(bp)
        pts = [(self.pig_pos[0] + 6, 0.0, self.pig_pos[2]), (-self.half + 6, 3.0, t + 6), (bx - 3, by, z_pad + 3), (bx, by, z_pad + 1.5)]
        total += self._wire(pts, 1.5, "Battery leads (2× 14 AWG)", "#e74c3c")
        # RX → FC UART socket
        fc = C["stack_fc"]
        sock = next((k for k in fc["sockets"] if k.upper().startswith("RX")), list(fc["sockets"])[0])
        sx, sy = fc["sockets"][sock]
        z_sock = self.z_fc + fc["dims"][2] + 2
        rxp = self.rx_pos
        zr = rxp[2] + (1 if rxp[2] >= 0 else -1)
        pts = [(rxp[0], rxp[1], zr), (rxp[0] * 0.7, rxp[1] + 8, (zr + z_sock) / 2), (sx, sy - 4, z_sock + 3), (sx, sy, z_sock + 1)]
        total += self._wire(pts, 0.8, "RX harness (4 wires)", "#8e44ad")
        return total

    def _wire(self, pts, r, label, color):
        try:
            solid, length = wire_sweep(pts, r)
        except Exception as e:  # sweep failures are reported, never fatal
            self.notes.append(f"wire '{label}' could not be swept: {e}")
            return 0.0
        mass = solid.volume * WIRE_DENSITY_G_MM3
        solid.label, solid.color = f"Wire: {label}", Color(color)
        self.add(solid, "wire", mass)
        self.wires.append({"name": label, "length_mm": round(length, 1), "radius_mm": r, "mass_g": round(mass, 2)})
        return mass

    # ------------------------------------------------------------------ geometric checks
    def geometry_checks(self):
        p = self.p
        pos = list(self.motors.values())
        gap_p = gap_g = 1e9
        for i in range(4):
            for j in range(i + 1, 4):
                d = math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])
                gap_p = min(gap_p, d - 2 * self.prop_r)
                gap_g = min(gap_g, d - 2 * self.guard_r_out)
        self.check("prop tip-to-tip gap ≥ 8 mm", gap_p >= 8, f"min {gap_p:.1f} mm")
        if p["guards"]:
            self.check("guard-to-guard gap ≥ 2 mm", gap_g >= 2, f"min {gap_g:.1f} mm")
        self.wheelbase = math.hypot(self.motors[2][0] - self.motors[3][0], self.motors[2][1] - self.motors[3][1])
        self.check("wheelbase 145–168 mm (parts list §4 target 150–160)", 145 <= self.wheelbase <= 168, f"{self.wheelbase:.1f} mm")
        leads = [w["length_mm"] for w in self.wires if w["name"].startswith("Motor")]
        if leads:
            lim = self.bom["components"]["motor"].get("lead_length_mm", 150)
            self.check(f"motor leads ≤ {lim} mm (swept route)", max(leads) <= lim, f"longest {max(leads):.0f} mm")
        if p["camera"]:
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
                        best = min(best, math.degrees(math.acos(max(-1, min(1, (px * axis[0] + py * axis[1] + pz * axis[2]) / L)))))
            self.cam_min_angle = best
            self.check("front props outside the O4 155° FOV cone", best >= 77.5, f"nearest prop point {best:.0f}° off the camera axis")

    # ------------------------------------------------------------------ arm section properties (for the beam check)
    def arm_sections(self, stations=(0.15, 0.5, 0.85)):
        """Exact section properties of the longest arm at fractional stations: I about the horizontal transverse
        axis (bending under thrust / vertical crash), area, and extreme-fibre distance."""
        m = max(self.motors.items(), key=lambda kv: math.hypot(*kv[1][:2]))
        mx, my, _ = m[1]
        rx, ry = self.arm_root[m[0]]
        L = math.hypot(mx - rx, my - ry)
        ux, uy = (mx - rx) / L, (my - ry) / L
        ang = math.degrees(math.atan2(uy, ux))
        eps = 0.2
        out = []
        usable = L - self.p["motor_pad_r"]
        sw = getattr(self, "section_w", self.p["arm_width"] + 2)
        z0, z1 = getattr(self, "section_z", (0.0, self.arm_top))
        for s in stations:
            d = usable * s
            cx, cy = rx + ux * d, ry + uy * d
            slab = self.bottom & (Pos(cx, cy, (z0 + z1) / 2) * Rot(0, 0, ang) * Box(eps, sw, z1 - z0 + 1))
            if slab is None or slab.volume < 1e-6:
                continue
            A = slab.volume / eps
            M = slab.matrix_of_inertia
            n = (-uy, ux, 0.0)  # local transverse horizontal axis
            Iyy = sum(n[i] * M[i][j] * n[j] for i in range(3) for j in range(3)) / eps  # mm⁴ (about slab CG)
            bb = slab.bounding_box()
            c = (bb.max.Z - bb.min.Z) / 2
            out.append({"station": s, "dist_from_root_mm": round(d, 1), "area_mm2": round(A, 1), "I_mm4": round(Iyy, 1), "c_mm": round(c, 2)})
        return {"arm_length_mm": L, "sections": out}

    def on_bed(self, part):
        """Translate a print part so its lowest point sits on z = 0 (slicer bed)."""
        bb = part.bounding_box()
        return Pos(0, 0, -bb.min.Z) * part

    def assembly(self):
        from build123d import Compound
        kids = [s for s, k, _, _ in self.bodies if k != "keepout"]
        asm = Compound(children=kids)
        asm.label = self.p["name"]
        return asm
