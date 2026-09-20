"""Markdown reports + JSON dumps for variants, comparisons and reference meshes."""
from __future__ import annotations

import json
import os


def _pf(c):
    return "NOTE" if c["pass"] is None else ("PASS" if c["pass"] else "**FAIL**")


def _f(v, nd=1):
    return f"{v:.{nd}f}" if isinstance(v, (int, float)) else str(v)


def checks_table(checks):
    L = ["| Check | Result | Detail |", "|---|---|---|"]
    for c in checks:
        L.append(f"| {c['check']} | {_pf(c)} | {c['detail']} |")
    return "\n".join(L)


def variant_report(path, b, d):
    p, mp, prop, beam, sim, bf, hits = b.p, d["mass"], d["propulsion"], d["beam"], d["sim_fixed_gains"], d["sim_betaflight"], d["interference"]
    L = [f"# {p['title']} — exact CAD, checks and simulation\n",
         f"Variant `{p['name']}` · kit **{p['kit']}** · `python -m dronecad build -v {p['name']}` in {d['seconds']:.0f} s from `bom.json` + `variants.json` (dronecad {d['version']}). "
         + (f"Frame: imported mesh `{p['frame_stl']}` in {p['material']} (kit parts mounted on it; adapters printed where the mount patterns differ).\n" if p.get("frame_stl") else
            f"Arms: {p['arm_style']} {p['arm_width']}×{p['arm_thickness']} mm {p['material']}{'; keel' if p.get('keel') else ''}{'; plate cutouts' if p.get('plate_cutouts') else ''}.\n")]
    L.append("## Files\n")
    for k, v in d["files"].items():
        L.append(f"- `{v}` — {k}")
    L.append("\n## Fit checks (exact B-rep)\n")
    L.append(checks_table(b.checks))
    exp = [h for h in hits if h["expected"]]
    if exp:
        L.append(f"\nBy-design contacts (fasteners, spokes on pads, wires on pads, hub on shaft): {sum(h['mm3'] for h in exp):.0f} mm³ in {len(exp)} pairs.")
    if b.wires:
        L.append("\n### Wire routes (swept)\n\n| Wire | Length (mm) | Ø (mm) | Mass (g) |\n|---|---:|---:|---:|")
        for w in b.wires:
            L.append(f"| {w['name']} | {w['length_mm']:.0f} | {2 * w['radius_mm']:.1f} | {w['mass_g']:.2f} |")
    if b.notes:
        L.append("\nNotes: " + "; ".join(b.notes))

    dz = mp["cg_mm"][2] - b.prop_z
    L.append("\n## Mass and balance (from the solids)\n")
    L.append(f"**AUW {mp['total_g']:.1f} g** · frame + guards {mp['frame_and_guards_g']:.1f} g · by kind {mp['by_kind_g']} · CG ({mp['cg_mm'][0]:.1f}, {mp['cg_mm'][1]:.1f}, {mp['cg_mm'][2]:.1f}) mm · "
             f"CG **{abs(dz):.1f} mm {'above' if dz > 0 else 'below'} the prop plane** (z {b.prop_z}).\n")
    if d.get("voxel"):
        vm = d["voxel"]["mass"]
        L.append(f"Voxel model: AUW {vm['total_g']:.1f} g, frame + guards {vm['frame_and_guards_g']:.1f} g, CG z {vm['cg_mm'][2]:.1f} mm.\n")
    L.append("| Component | Mass (g) | Volume (mm³) | Source |\n|---|---:|---:|---|")
    for r in mp["table"]:
        if r["mass_g"] >= 0.05:
            L.append(f"| {r['component']} | {r['mass_g']:.1f} | {r['volume_mm3']:.0f} | {r['source']} |")
    I = mp["inertia_kgm2"]
    L.append(f"\nInertia about the CG (kg·m²): Ixx {I['Ixx']:.2e} · Iyy {I['Iyy']:.2e} · Izz {I['Izz']:.2e} · Ixz {I['Ixz']:.1e}\n")

    L.append("## Propulsion\n")
    L.append(f"| Item | Value |\n|---|---|\n| Model | {prop['note']} |\n| Thrust-to-weight | {prop['thrust_to_weight']:.1f} |\n"
             f"| Hover | {prop['hover_throttle_est'] * 100:.0f} % rpm, {prop['hover_current_a_total']:.1f} A → {prop['flight_time_min_1000mah']:.0f} min on {b.bom['components']['battery']['capacity_mah']} mAh |\n"
             f"| Max thrust / current per motor | {prop['max_thrust_g_per_motor']:.0f} g / {prop['max_current_a_per_motor']:.1f} A |")

    L.append("\n## Structure\n")
    L.append("### Arm section (exact, from the solid)\n\n| Station | From root (mm) | Area (mm²) | I (mm⁴) | c (mm) |\n|---|---:|---:|---:|---:|")
    for s in beam.get("sections", []):
        L.append(f"| {s['station']:.2f} | {s['dist_from_root_mm']} | {s['area_mm2']} | {s['I_mm4']} | {s['c_mm']} |")
    L.append("\nBeam check at the weakest station:\n\n| Load | Force (N) | Stress (MPa) | SF flat print | SF standing print |\n|---|---:|---:|---:|---:|")
    for r in beam["loads"]:
        L.append(f"| {r['load']} | {r['force_N']:.1f} | {r['stress_MPa']:.1f} | {r['SF_flat_print']:.1f} | {r['SF_standing_print']:.1f} |")
    L.append(f"\nTip deflection at max thrust {beam['tip_deflection_mm_at_max_thrust']:.2f} mm · first bending mode (beam) {beam['first_bending_mode_hz']:.0f} Hz vs prop {beam['prop_rev_hz_hover']:.0f} Hz at hover / {beam['prop_rev_hz_max']:.0f} Hz max.\n")
    fea = d.get("fea")
    if fea and "cases" in fea:
        L.append(f"### FEA — bottom frame ({fea['elements']} tet10, {fea['dof_free']} free DOF, {fea['mesh_size_mm']} mm mesh, {fea['seconds']:.0f} s)\n")
        L.append("| Case | Max von Mises (MPa) | p99 (MPa) | SF (p99) | Max displacement (mm) | Hotspot (mm) |\n|---|---:|---:|---:|---:|---|")
        for c in fea["cases"]:
            L.append(f"| {c['case']} | {c['max_von_mises_mpa']:.1f} | {c['p99_von_mises_mpa']:.1f} | {fea['strength_mpa'] / c['p99_von_mises_mpa']:.1f} | {c['max_displacement_mm']:.2f} | {c['hotspot_mm']} |")
        L.append(f"\nFirst modes with motors, props and guards lumped on the pads: {', '.join(_f(m, 0) + ' Hz' for m in fea['modes_hz'])}. "
                 f"Max von Mises includes the clamp-edge singularity at the standoffs (hotspot column); the p99 value is the design number. {fea['note']}\n")
    elif fea:
        L.append(f"### FEA\n\nSkipped/failed: {fea.get('error', fea)}\n")

    L.append("## Flight dynamics\n")
    hd = sim["hover_thrust_distribution_g"]
    L.append(f"| Item | Fixed-gain reference sim | Betaflight-default PID sim |\n|---|---|---|\n"
             f"| Static hover thrust M1–M4 (g) | {hd[0]:.1f} / {hd[1]:.1f} / {hd[2]:.1f} / {hd[3]:.1f} | — |\n"
             f"| 15° roll step peak | {sim['roll_step_peak_deg']:.1f}° | {bf['roll_step_peak_deg']:.1f}° |\n"
             f"| Return to < 1° | {_f(sim['roll_return_settle_s'], 2)} s | {_f(bf['roll_return_settle_s'], 2)} s |\n"
             f"| Side gust {bf['gust_m_s']:.0f} m/s: roll peak / drift | — | {bf['gust_roll_peak_deg']:.1f}° / {bf['gust_lateral_drift_m']:.2f} m |\n"
             f"| Motor saturation | {sim['motor_saturation_pct_of_time']:.1f} % | {bf['motor_saturation_pct']:.1f} % |")
    L.append(f"\n{bf['controller']}. Gust drag acts {bf['gust_lever_mm']:.0f} mm from the CG (battery centroid), CdA {bf['CdA_m2'] * 1e4:.0f} cm². {bf['note']}\n")

    th = d["thermal"]
    L.append("## ESC thermal\n")
    L.append("| Condition | ESC loss (W) | ΔT (°C) | OK |\n|---|---:|---:|---|")
    for k in ("hover", "50 % throttle"):
        L.append(f"| {k}{' (enclosed by keel)' if th['enclosed'] else ''} | {th[k]['esc_loss_w']:.1f} | {th[k]['delta_t_c']:.0f} | {'yes' if th[k]['ok'] else '**no**'} |")
    L.append(f"\n{th['note']}\n")

    L.append("## Manufacturability (printed parts)\n")
    L.append("| Part | Volume (mm³) | Solidity est. | Filament (g) | Time est. (min) | Overhang > 45° | Thin walls | Small holes | Flags |\n|---|---:|---:|---:|---:|---:|---:|---:|---|")
    for pc in d["print_checks"]:
        sl = pc.get("slicer")
        fil = f"{pc['filament_g']:.1f}" + (f" (slicer {sl['filament_g']:.1f})" if sl and sl.get("filament_g") else "")
        tm = f"{pc['print_min_est']:.0f}" + (f" (slicer {sl['time']})" if sl and sl.get("time") else "")
        L.append(f"| {pc['part']} | {pc['volume_mm3']:.0f} | {pc['solidity_est']:.2f} | {fil} | {tm} | {pc['pct']:.1f} % | {pc['thin_wall_pct']:.1f} % | {len(pc['small_holes'])} | {'; '.join(pc['flags'] + pc.get('warnings', [])) or 'ok'} |")
    fm = [pc for pc in d["print_checks"] if pc["part"] == "frame-bottom"]
    if fm:
        ps = b.bom["materials"][p["material"]]["print_solidity"]
        L.append(f"\nMass model vs print model: `print_solidity` {ps} in bom.json (used for the mass table) vs {fm[0]['solidity_est']:.2f} estimated for these slicer settings — "
                 f"the frame will weigh between {fm[0]['filament_g']:.0f} g and {fm[0]['volume_mm3'] / 1000 * b.bom['materials'][p['material']]['density'] * ps:.0f} g depending on infill"
                 + (f"; the slicer says {fm[0]['slicer']['filament_g']:.1f} g" if (fm[0].get("slicer") or {}).get("filament_g") else "")
                 + "; calibrate with the first test print.")
    L.append("\nEstimates assume 0.4 mm nozzle, 0.2 mm layers, 3 perimeters, 4 top/bottom layers, 30 % infill, ~3.5 mm³/s effective flow.")
    sl = next((pc["slicer"] for pc in d["print_checks"] if pc.get("slicer")), None)
    if sl and sl.get("profile"):
        L.append(f"Slicer figures in parentheses are from {sl['slicer']} with profile `{sl['profile']}` and the same walls/infill/layers; "
                 "set `DRONECAD_ORCA_MACHINE=\"Vendor:Machine name\"` to slice for your printer.\n")
    elif sl and sl.get("error"):
        L.append(f"Slicer {sl['slicer']} was found but failed: `{sl['error']}`.\n")
    else:
        L.append("Install PrusaSlicer or OrcaSlicer and the real slicer numbers are added automatically.\n")
    with open(path, "w") as f:
        f.write("\n".join(L))


def comparison(path, results, version):
    L = [f"# Variant comparison — exact CAD (dronecad {version})\n",
         "| Variant | Arms | AUW g | Frame+guards g | CG z − prop z (mm) | T/W | Flight min | Beam SF thrust / 10 g | FEA SF thrust / 10 g crash | Mode 1 (Hz) | Gust roll ° | Print g / min | Checks |",
         "|---|---|---:|---:|---:|---:|---:|---|---|---:|---:|---|---|"]
    for r in results:
        m, pr, bm, fe, bf = r["mass"], r["propulsion"], r["beam"], r.get("fea") or {}, r["sim_betaflight"]
        fails = [c["check"] for c in r["checks"] if c["pass"] is False]
        fea_sf = "—"
        mode = "—"
        if fe.get("cases"):
            cs = {c["case"]: c for c in fe["cases"]}
            sy = fe["strength_mpa"]
            fea_sf = f"{sy / cs['max thrust on all motors']['p99_von_mises_mpa']:.1f} / {sy / cs['10 g vertical crash on one arm tip']['p99_von_mises_mpa']:.1f}"
            mode = _f(fe["modes_hz"][0], 0) if fe["modes_hz"] and isinstance(fe["modes_hz"][0], float) else "—"
        pg = sum(pc["filament_g"] for pc in r["print_checks"])
        pm = sum(pc["print_min_est"] for pc in r["print_checks"])
        L.append(f"| `{r['variant']}` | {r['arm_style']} | {m['total_g']:.0f} | {m['frame_and_guards_g']:.0f} | {m['cg_mm'][2] - r['prop_z']:+.1f} | {pr['thrust_to_weight']:.1f} | {pr['flight_time_min_1000mah']:.0f} | "
                 f"{bm['loads'][0]['SF_flat_print']:.1f} / {bm['loads'][2]['SF_flat_print']:.1f} | {fea_sf} | {mode} | {bf['gust_roll_peak_deg']:.1f} | {pg:.0f} / {pm:.0f} | {'all pass' if not fails else 'FAIL: ' + '; '.join(fails)} |")
    with open(path, "w") as f:
        f.write("\n".join(L) + "\n")


def reference_report(path, res, fea, ov, kit_name):
    st = res["stats"]
    L = [f"# Reference frame — `{os.path.basename(res['file'])}` vs kit `{kit_name}`\n",
         f"Third-party mesh analysed by `python -m dronecad reference`. {st['triangles']} triangles, {st['shells']} shells, "
         f"{'watertight' if st['watertight'] else str(st['non_manifold_edges']) + ' non-manifold edges'}; envelope {st['size_mm'][0]:.1f} × {st['size_mm'][1]:.1f} × {st['size_mm'][2]:.1f} mm; "
         f"volume {st['volume_mm3'] / 1000:.1f} cm³ → {res['mass_g_printed']:.0f} g printed in {res['material']} ({res['mass_g_solid']:.0f} g solid).\n"]
    L.append("## Detected geometry\n")
    L.append(f"- Horizontal plateaus (z: area mm²): {st['plateau_area_mm2']}")
    L.append(f"- Holes: {res['holes']['count']} circular, diameters {res['holes']['diameters']} mm")
    L.append(f"- Stack patterns: {', '.join(f'{k} at {v}' for k, v in res['stack_patterns'].items() if v) or 'none'}")
    L.append(f"- Motor pattern: {res.get('motor_pattern_found') or 'not recognised'}; motors at {res['motors_xy']}")
    if "wheelbase_mm" in res:
        L.append(f"- Wheelbase {res['wheelbase_mm']:.1f} mm; motor spacings {[round(x, 1) for x in res['motor_spacing_mm']]} mm")
    if "stack_clear_mm" in res:
        L.append(f"- Stack clear height {res['stack_clear_mm']:.1f} mm")
    L.append("\n## Kit-fit checks\n")
    L.append(checks_table(res["checks"]))
    L.append("\n## Manufacturability\n")
    L.append(f"Overhangs steeper than 45° (not on the bed): {ov['overhang_area_mm2']:.0f} mm² = {ov['pct']:.1f} % of the surface"
             + (f" — this mesh holds {st['shells']} bodies in flight orientation, so the figure includes upper bodies' undersides; judge per body in the slicer." if st["shells"] > 1 else ".")
             + " Thin-wall and hole checks need the B-rep (import the STEP/F3D source if available).\n")
    L.append("## FEA (from the mesh, kit motor loads)\n")
    if fea and "cases" in fea:
        L.append(f"Largest closed shell (plate + arms) remeshed: {fea['elements']} tet10, {fea['dof_free']} free DOF, {fea['seconds']:.0f} s. Clamped at the detected stack pattern; kit max thrust / 10 g × 240 g on the detected motor pads.\n")
        L.append("| Case | Max von Mises (MPa) | p99 (MPa) | SF (p99) | Max displacement (mm) |\n|---|---:|---:|---:|---:|")
        sy = fea.get("strength_mpa")
        for c in fea["cases"]:
            sf99 = (sy / c["p99_von_mises_mpa"]) if sy else c["safety_factor"]
            L.append(f"| {c['case']} | {c['max_von_mises_mpa']:.1f} | {c['p99_von_mises_mpa']:.1f} | {sf99:.1f} | {c['max_displacement_mm']:.2f} |")
        L.append(f"\nFirst modes (motor + prop lumped on the pads): {', '.join(_f(m, 0) + ' Hz' for m in fea['modes_hz'])}. "
                 "Max von Mises includes clamp-edge singularities; compare frames on the p99 column.\n")
    else:
        L.append(f"Not available: {fea.get('error') if fea else 'skipped'}\n")
    with open(path, "w") as f:
        f.write("\n".join(L))


def dump(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=1, default=str)
