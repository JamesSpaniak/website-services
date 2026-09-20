"""dronecad command line.

  python -m dronecad build   [-k KIT_DIR] [-v VARIANT|all] [--no-fea] [--fea-size 2.5] [--slicer PATH] [--thrust-stand CSV]
  python -m dronecad reference FRAME.stl [-k KIT_DIR] [--material PETG] [--no-fea] [--fea-size 3]
  python -m dronecad view    [-k KIT_DIR] [-v VARIANT] [--keepouts]     (OCP CAD Viewer panel must be open)
  python -m dronecad compare [-k KIT_DIR]                                (comparison-cad.md from existing cad.json)
  python -m dronecad list    [-k KIT_DIR]
"""
from __future__ import annotations

import argparse
import json
import math
import os
import time

from . import __version__, checks, fea, massprops, meshref, physics, printcheck, report
from .frame import FrameBuild
from .spec import DEFAULT_KIT, G, Kit, vox

VIEWER = """<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
<style>body{{margin:0;font-family:Menlo,monospace;background:#e9ecef}} model-viewer{{width:100vw;height:88vh}} p{{margin:8px 14px;color:#333;font-size:13px}}</style></head>
<body><model-viewer src="assembly.glb" camera-controls auto-rotate shadow-intensity="0.7" exposure="1.0" camera-orbit="35deg 65deg 0.55m" min-camera-orbit="auto auto 0.2m"></model-viewer>
<p><b>{title}</b> — drag to rotate, scroll to zoom. AUW {auw:.0f} g · CG z {cgz:.1f} mm · dronecad {version}. Serve this folder over HTTP (python3 -m http.server); the viewer script needs internet.</p></body></html>"""


def build_variant(kit, name, args):
    from build123d import export_gltf, export_step, export_stl
    t0 = time.time()
    out = kit.out_dir(name)
    b = FrameBuild(kit, name)
    b.build()
    hits = checks.run(b)
    mp = massprops.compute(b)
    sections = b.arm_sections()
    ts = args.thrust_stand or kit.thrust_stand
    prop = physics.propulsion(b, mp["total_g"], ts)
    beam = physics.beam_check(b, prop, mp, sections)
    sim = vox.simulate(physics.shim(b), mp, prop, os.path.join(out, "sim-hover-cad.csv"))
    bf = physics.simulate_bf(b, mp, prop, os.path.join(out, "sim-betaflight-gust.csv"))
    thermal = physics.esc_thermal(b, prop, enclosed=bool(b.p.get("keel")))
    b.check("AUW ≤ 250 g soft cap", mp["total_g"] <= 250, f"{mp['total_g']:.0f} g")
    b.check("arm SF ≥ 2 at max thrust (exact section)", beam["loads"][0]["SF_flat_print"] >= 2, f"SF {beam['loads'][0]['SF_flat_print']:.1f}")
    b.check("ESC ΔT < 60 °C at 50 % throttle", thermal["50 % throttle"]["ok"], f"ΔT {thermal['50 % throttle']['delta_t_c']:.0f} °C{' (enclosed)' if thermal['enclosed'] else ''}")
    b.check(f"gust {bf['gust_m_s']:.0f} m/s: roll excursion < 10° with BF defaults", bf["gust_roll_peak_deg"] < 10, f"{bf['gust_roll_peak_deg']:.1f}°, drift {bf['gust_lateral_drift_m']:.2f} m")

    # exports — print parts first (re-parenting into the assembly Compound breaks later single-part STEP export)
    mat = kit.bom["materials"]
    print_checks = []
    bottom_step = os.path.join(out, "print", "frame-bottom.step")
    mesh_stl = None
    if b.mesh_frame is not None:
        # third-party frame: keep its triangles (planar faces tessellate exactly) in kit axes for FEA and the slicer
        mesh_stl = os.path.join(out, "print", "frame-reference.stl")
        export_stl(b.mesh_frame, mesh_stl, tolerance=0.5, angular_tolerance=0.5)  # kit coordinates (FEA loads use them)
        print_checks.append(printcheck.check_mesh("frame-reference", mesh_stl, dict(mat[b.p["material"]], name=b.p["material"]), out, args.slicer))
    else:
        export_step(b.print_parts["frame-bottom"], bottom_step, timestamp="2026-09-12T00:00:00")
    for k, s in b.print_parts.items():
        s = b.on_bed(s)
        stl = os.path.join(out, "print", f"{k}.stl")
        export_stl(s, stl, tolerance=0.05, angular_tolerance=0.1)
        mname = b.p["guard_material"] if k == "guard" else b.p["material"]
        print_checks.append(printcheck.check_part(k, s, stl, dict(mat[mname], name=mname), out, args.slicer))
    asm = b.assembly()
    export_step(asm, os.path.join(out, "assembly.step"), timestamp="2026-09-12T00:00:00")
    export_gltf(asm, os.path.join(out, "assembly.glb"), binary=True, linear_deflection=0.05, angular_deflection=0.3)
    for pc in print_checks:
        if pc["flags"]:
            b.check(f"print/{pc['part']}.stl prints cleanly", False, "; ".join(pc["flags"] + pc["warnings"]))
        else:
            sl = pc.get("slicer") or {}
            fig = (f"{sl['filament_g']:.1f} g, {sl['time']} ({sl['slicer']})" if sl.get("filament_g")
                   else f"{pc['filament_g']:.0f} g, ~{pc['print_min_est']:.0f} min (estimate)")
            b.check(f"print/{pc['part']}.stl prints cleanly", True, fig + ("; " + "; ".join(pc["warnings"]) if pc["warnings"] else ""))
    with open(os.path.join(out, "viewer.html"), "w") as f:
        f.write(VIEWER.format(title=b.p["title"], auw=mp["total_g"], cgz=mp["cg_mm"][2], version=__version__))

    # FEA of the bottom frame
    fea_res = None
    if not args.no_fea:
        C = kit.bom["components"]
        pads = {f"M{m}": (mx, my, b.p["motor_pad_r"] if mesh_stl is None else 8.0, b.pad_z[m]) for m, (mx, my, _) in b.motors.items()}
        T = prop["max_thrust_N_per_motor"]
        F_crash = 10 * mp["total_g"] / 1000 * G
        m2 = b.motors[2]
        rx, ry = b.arm_root[2]
        L = math.hypot(m2[0] - rx, m2[1] - ry)
        ux, uy = (m2[0] - rx) / L, (m2[1] - ry) / L
        cases = [("max thrust on all motors", {k: (0, 0, T) for k in pads}),
                 ("10 g vertical crash on one arm tip", {"M2": (0, 0, -F_crash)}),
                 ("10 g lateral crash on one arm tip", {"M2": (-uy * F_crash, ux * F_crash, 0)})]
        tip = (C["motor"]["mass_g"] + C["prop"]["mass_g"]) / 1000 + (mp["by_kind_g"].get("guard", 0) / 4) / 1000
        mmat = dict(mat[b.p["material"]])
        try:
            if mesh_stl is None:
                fea_res = fea.run(bottom_step, mmat, fixed=b.fea_fixed, pads=pads, cases=cases, tip_mass_kg=tip, size_mm=args.fea_size)
            else:
                fea_res = fea.run(mesh_stl, mmat, fixed=b.fea_fixed, pads=pads, cases=cases, tip_mass_kg=tip, size_mm=max(args.fea_size, 3.0), is_stl=True)
            if "cases" in fea_res:
                sf = min(c["safety_factor"] for c in fea_res["cases"][:1])
                b.check("FEA SF ≥ 2 at max thrust (p99 basis)", mat[b.p["material"]]["strength_mpa"] / fea_res["cases"][0]["p99_von_mises_mpa"] >= 2,
                        f"max {fea_res['cases'][0]['max_von_mises_mpa']:.1f} MPa (SF {sf:.1f}), p99 {fea_res['cases'][0]['p99_von_mises_mpa']:.1f} MPa")
                if fea_res["modes_hz"] and isinstance(fea_res["modes_hz"][0], float):
                    f1 = fea_res["modes_hz"][0]
                    idle_hz = 0.12 * prop["rpm_max_loaded"] / 60  # ~12 % idle
                    hover_hz = beam["prop_rev_hz_hover"]
                    inside = idle_hz <= f1 <= hover_hz
                    b.check("first arm mode vs the idle→hover motor band (FEA)", True if not inside else None,
                            f"{f1:.0f} Hz = {f1 * 60:.0f} rpm vs idle {idle_hz:.0f} Hz – hover {hover_hz:.0f} Hz" + (" — crossed on every spool-up; expect gyro noise there, keep Betaflight RPM filtering on; stiffer arms (truss / CF) push it up" if inside else ""))
        except Exception as e:  # noqa: BLE001
            fea_res = {"error": str(e)}

    vox_phys = None
    vp = os.path.join(out, "physics.json")
    if os.path.exists(vp):
        with open(vp) as f:
            vox_phys = json.load(f)
    secs = time.time() - t0
    files = {"STEP assembly, coloured + labelled (Onshape / FreeCAD / Fusion)": "assembly.step", "glTF for the browser viewer": "assembly.glb",
             "rotate-in-browser viewer": "viewer.html",
             ("printable adapters + guard; frame-reference.stl is the imported frame in kit axes (FEA input)" if mesh_stl else "printable parts (+ frame-bottom.step for FEA)"): "print/*.stl",
             "everything below as data": "cad.json",
             "fixed-gain hover sim": "sim-hover-cad.csv", "Betaflight-PID sim with gust": "sim-betaflight-gust.csv"}
    data = {"variant": name, "kit": b.p["kit"], "version": __version__, "arm_style": b.p["arm_style"], "mass": mp, "propulsion": prop, "beam": beam,
            "sim_fixed_gains": sim, "sim_betaflight": bf, "thermal": thermal, "fea": fea_res, "print_checks": print_checks, "interference": hits,
            "wires": b.wires, "checks": b.checks, "prop_z": b.prop_z, "wheelbase_mm": b.wheelbase, "camera_min_offaxis_deg": getattr(b, "cam_min_angle", None),
            "voxel": vox_phys, "files": files, "seconds": secs}
    report.dump(os.path.join(out, "cad.json"), data)
    report.variant_report(os.path.join(out, "cad-report.md"), b, data)
    fails = sum(1 for c in b.checks if c["pass"] is False)
    fea_s = f"FEA SF(p99) {fea_res['strength_mpa'] / fea_res['cases'][0]['p99_von_mises_mpa']:.1f}/{fea_res['strength_mpa'] / fea_res['cases'][1]['p99_von_mises_mpa']:.1f} f1 {fea_res['modes_hz'][0]:.0f} Hz" if fea_res and "cases" in fea_res and isinstance(fea_res["modes_hz"][0], float) else "FEA —"
    print(f"{name:16s} AUW {mp['total_g']:6.1f} g  frame {mp['frame_and_guards_g']:5.1f} g  CG z {mp['cg_mm'][2]:5.1f}  T/W {prop['thrust_to_weight']:.1f}  "
          f"{fea_s}  gust roll {bf['gust_roll_peak_deg']:.1f}°  checks {len(b.checks) - fails}/{len(b.checks)}  {secs:.0f} s", flush=True)
    return data


def cmd_build(args):
    kit = Kit(args.kit)
    names = kit.variant_names() if args.variant == "all" else [args.variant]
    results = [build_variant(kit, n, args) for n in names]
    if args.variant == "all":
        path = os.path.join(kit.out_root, "comparison-cad.md")
        report.comparison(path, results, __version__)
        print(f"\ncomparison → {os.path.relpath(path)}")


def cmd_reference(args):
    kit = Kit(args.kit)
    name = os.path.splitext(os.path.basename(args.stl))[0]
    out = os.path.join(kit.out_root, "reference", name)
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    res, tris = meshref.analyse(args.stl, kit, args.material)
    ov = printcheck.overhangs(args.stl)
    fea_res = None
    if not args.no_fea and len(res["motors_xy"]) == 4:
        C = kit.bom["components"]
        mat = kit.bom["materials"][args.material]
        base = res["stats"]["base_plate_top_z"]
        pads = {f"M{i + 1}": (x, y, 8.0, base) for i, (x, y) in enumerate(res["motors_xy"])}
        stack = None
        for k, cs in res["stack_patterns"].items():
            if cs:
                stack = (float(k), cs[0])
        if stack:
            s, (cx, cy) = stack
            fixed = [(cx + dx, cy + dy, 3.0) for dx in (-s / 2, s / 2) for dy in (-s / 2, s / 2)]
        else:
            fixed = [(sum(x for x, _ in res["motors_xy"]) / 4, sum(y for _, y in res["motors_xy"]) / 4, 12.0)]
        prop = vox.propulsion(type("S", (), {"bom": kit.bom, "p": {"kit": "base"}})(), 240.0)
        T = prop["max_thrust_N_per_motor"]
        F = 10 * 0.24 * G
        mx, my = res["motors_xy"][0]
        cxm = sum(x for x, _ in res["motors_xy"]) / 4
        cym = sum(y for _, y in res["motors_xy"]) / 4
        L = math.hypot(mx - cxm, my - cym)
        ux, uy = (mx - cxm) / L, (my - cym) / L
        cases = [("max thrust on all motors", {k: (0, 0, T) for k in pads}), ("10 g vertical crash on one arm tip", {"M1": (0, 0, -F)}),
                 ("10 g lateral crash on one arm tip", {"M1": (-uy * F, ux * F, 0)})]
        try:
            fea_res = fea.run(args.stl, mat, fixed=fixed, pads=pads, cases=cases, tip_mass_kg=(C["motor"]["mass_g"] + C["prop"]["mass_g"]) / 1000,
                              size_mm=args.fea_size, is_stl=True)
        except Exception as e:  # noqa: BLE001
            fea_res = {"error": str(e)}
    res["overhangs"] = ov
    res["fea"] = fea_res
    res["seconds"] = time.time() - t0
    report.dump(os.path.join(out, "reference.json"), res)
    report.reference_report(os.path.join(out, "reference-report.md"), res, fea_res, ov, kit.name)
    fails = sum(1 for c in res["checks"] if c["pass"] is False)
    print(f"reference {name}: {res['stats']['triangles']} tris, {res['mass_g_printed']:.0f} g in {args.material}, wheelbase {res.get('wheelbase_mm', 0):.0f} mm, "
          f"checks {len(res['checks']) - fails}/{len(res['checks'])} pass, FEA {'ok' if fea_res and 'cases' in fea_res else (fea_res or {}).get('error', 'skipped')}  {res['seconds']:.0f} s")
    print(f"→ {os.path.relpath(out)}/reference-report.md")


def cmd_compare(args):
    """Rewrite comparison-cad.md from the cad.json files already in generated/ (no rebuild)."""
    kit = Kit(args.kit)
    results = []
    for n in kit.variant_names():
        fp = os.path.join(kit.out_root, n, "cad.json")
        if os.path.exists(fp):
            with open(fp) as f:
                results.append(json.load(f))
    path = os.path.join(kit.out_root, "comparison-cad.md")
    report.comparison(path, results, __version__)
    print(f"{len(results)} variants → {os.path.relpath(path)}")


def cmd_view(args):
    """Build a variant and push it to the OCP CAD Viewer panel (Cursor/VS Code extension bernhard-42.ocp-cad-viewer)."""
    import socket
    os.environ.setdefault("OCP_PORT", str(args.port))
    try:
        from ocp_vscode import Camera, set_defaults, show
    except ImportError:
        raise SystemExit("ocp_vscode not installed in this venv: scripts/.venv-cad/bin/pip install ocp_vscode")
    with socket.socket() as s:
        s.settimeout(0.5)
        if s.connect_ex(("127.0.0.1", args.port)) != 0:
            raise SystemExit(f"nothing listening on port {args.port}: open the panel first (Cmd-Shift-P → 'OCP CAD Viewer: Open viewer'), then re-run.")
    kit = Kit(args.kit)
    b = FrameBuild(kit, args.variant)
    b.build()
    bodies = [s for s, k, _, _ in b.bodies if args.keepouts or k != "keepout"]
    names = [getattr(s, "label", None) or f"body {i}" for i, s in enumerate(bodies)]
    set_defaults(reset_camera=Camera.RESET, axes=True, axes0=True, grid=(True, False, False))
    show(*bodies, names=names)
    print(f"{args.variant}: {len(bodies)} bodies sent to OCP CAD Viewer (port {args.port})")


def cmd_list(args):
    kit = Kit(args.kit)
    print(f"kit {kit.name} ({kit.path})")
    for n in kit.variant_names():
        p = kit.params(n)
        print(f"  {n:16s} {p['kit']:6s} {p['style']}-frame arms {p['arm_style']} {p['arm_width']}×{p['arm_thickness']} {p['material']:5s} front {p['front']} rear {p['rear']}  {p['title']}")
    print(f"  parts library: {kit.parts_dir} ({'present' if os.path.isdir(kit.parts_dir) else 'none — Tier A/B generators used'})")
    print(f"  thrust stand : {kit.thrust_stand or 'none — Ct/Cp model'}")


def main(argv=None):
    ap = argparse.ArgumentParser(prog="dronecad", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    kit_kw = dict(default=DEFAULT_KIT, help="kit directory with bom.json + variants.json (default: drone-building/cad)")
    b = sub.add_parser("build", help="build variants: CAD, checks, physics, FEA, print checks")
    b.add_argument("-k", "--kit", **kit_kw)
    b.add_argument("-v", "--variant", default="all")
    b.add_argument("--no-fea", action="store_true")
    b.add_argument("--fea-size", type=float, default=4.0, help="tet10 mesh size mm (4 = ~20 s per variant; 3 = ~1 min)")
    b.add_argument("--slicer", default=None, help="path to PrusaSlicer/OrcaSlicer CLI for real filament/time")
    b.add_argument("--thrust-stand", default=None, help="CSV with rpm,thrust_g,current_a[,voltage_v]")
    b.set_defaults(fn=cmd_build)
    r = sub.add_parser("reference", help="analyse a third-party frame STL against the kit")
    r.add_argument("stl")
    r.add_argument("-k", "--kit", **kit_kw)
    r.add_argument("--material", default="PETG")
    r.add_argument("--no-fea", action="store_true")
    r.add_argument("--fea-size", type=float, default=3.0)
    r.set_defaults(fn=cmd_reference)
    vw = sub.add_parser("view", help="build one variant and show it live in the OCP CAD Viewer panel")
    vw.add_argument("-k", "--kit", **kit_kw)
    vw.add_argument("-v", "--variant", default="base-truss")
    vw.add_argument("--keepouts", action="store_true", help="also show the translucent keep-out boxes")
    vw.add_argument("--port", type=int, default=3939)
    vw.set_defaults(fn=cmd_view)
    cp = sub.add_parser("compare", help="rewrite comparison-cad.md from existing cad.json files")
    cp.add_argument("-k", "--kit", **kit_kw)
    cp.set_defaults(fn=cmd_compare)
    ls = sub.add_parser("list", help="list variants and kit resources")
    ls.add_argument("-k", "--kit", **kit_kw)
    ls.set_defaults(fn=cmd_list)
    args = ap.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
