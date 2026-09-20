"""Manufacturability of printed parts, from the B-rep and its exported STL.

- overhangs: tessellated faces steeper than the threshold that are not on the bed
- thin walls: 2-D morphological opening of slices (offset −w/2 then +w/2) — area that vanishes is thinner than w
- small holes: cylindrical faces under the printable minimum
- filament mass and print time: shell/infill model from slice offsets (a slicer CLI is used instead when available)
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import struct
import subprocess
import tempfile
import zipfile

from build123d import Axis, Box, GeomType, Kind, Pos, offset

PRINT = {"nozzle": 0.4, "layer": 0.2, "perimeters": 3, "top_bottom_layers": 4, "infill": 0.30,
         "flow_mm3_s": 3.5, "layer_overhead_s": 4.0, "overhang_deg": 45.0, "min_wall": 0.9, "min_hole_d": 2.0}


def _stl_tris(path):
    with open(path, "rb") as f:
        d = f.read()
    n = struct.unpack_from("<I", d, 80)[0]
    if len(d) == 84 + 50 * n:
        for i in range(n):
            v = struct.unpack_from("<12f", d, 84 + i * 50)
            yield (v[3:6], v[6:9], v[9:12])
        return
    pts = re.findall(rb"vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)", d)
    for i in range(0, len(pts) - 2, 3):
        yield tuple(tuple(float(c) for c in pts[i + k]) for k in range(3))


def overhangs(stl_path, threshold_deg=PRINT["overhang_deg"]):
    """Area (mm²) of downward-facing surface steeper than the threshold, excluding the first layer on the bed."""
    tris = list(_stl_tris(stl_path))
    zmin = min(c[2] for t in tris for c in t)
    cos_lim = math.cos(math.radians(threshold_deg))
    bad = total = 0.0
    for a, b, c in tris:
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        L = math.sqrt(nx * nx + ny * ny + nz * nz)
        if L < 1e-9:
            continue
        area = L / 2
        total += area
        if -nz / L > cos_lim and max(a[2], b[2], c[2]) > zmin + 0.3:  # faces down, steeper than threshold, not on bed
            bad += area
    return {"overhang_area_mm2": bad, "surface_area_mm2": total, "pct": 100 * bad / max(total, 1e-9)}


def _slice_faces(part, z):
    slab = part & Pos(0, 0, z) * Box(600, 600, 0.02)
    faces = [f for f in slab.faces().filter_by(Axis.Z)]
    top_z = max((f.center().Z for f in faces), default=None)
    return [f for f in faces if top_z is not None and abs(f.center().Z - top_z) < 0.005]


def _opening_loss(face, w):
    """Area removed by an opening with a disc of diameter w (regions thinner than w)."""
    try:
        inner = offset(face, -w / 2, kind=Kind.INTERSECTION)
        if inner is None or inner.area <= 0:
            return face.area
        reopened = offset(inner, w / 2, kind=Kind.INTERSECTION)  # sharp corners: no rounding loss at convex corners
        return max(0.0, face.area - reopened.area)
    except Exception:
        return 0.0


def slice_metrics(part, n_layers=5):
    bb = part.bounding_box()
    h = bb.max.Z - bb.min.Z
    zs = [bb.min.Z + h * (i + 0.5) / n_layers for i in range(n_layers)]
    thin_total = area_total = core_total = 0.0
    shell_w = PRINT["perimeters"] * PRINT["nozzle"] * 1.1
    for z in zs:
        for f in _slice_faces(part, z):
            area_total += f.area
            thin_total += _opening_loss(f, PRINT["min_wall"])
            try:
                core = offset(f, -shell_w, kind=Kind.INTERSECTION)
                core_total += core.area if core is not None else 0.0
            except Exception:
                pass
    return {"height_mm": h, "sampled_layers": n_layers, "thin_wall_area_mm2_per_layer": thin_total / n_layers,
            "thin_wall_pct": 100 * thin_total / max(area_total, 1e-9), "core_fraction": core_total / max(area_total, 1e-9)}


def small_holes(part, min_d=PRINT["min_hole_d"]):
    out = []
    for f in part.faces():
        if f.geom_type == GeomType.CYLINDER:
            try:
                r = f.geom_adaptor().Cylinder().Radius()
            except Exception:
                continue
            if 2 * r < min_d - 1e-3 and 2 * r > 0.3:
                c = f.center()
                out.append({"d_mm": round(2 * r, 2), "at": [round(c.X, 1), round(c.Y, 1), round(c.Z, 1)]})
    return out


def estimate_print(part, material):
    """Filament grams and print minutes from the shell/infill model; solidity from slice offsets."""
    vol = part.volume
    sm = slice_metrics(part)
    h = sm["height_mm"]
    solid_layers_frac = min(1.0, 2 * PRINT["top_bottom_layers"] * PRINT["layer"] / max(h, 1e-6))
    body_solidity = (1 - sm["core_fraction"]) + sm["core_fraction"] * PRINT["infill"]
    solidity = solid_layers_frac + (1 - solid_layers_frac) * body_solidity
    dep = vol * solidity
    layers = h / PRINT["layer"]
    minutes = (dep / PRINT["flow_mm3_s"] + layers * PRINT["layer_overhead_s"]) / 60
    return {"volume_mm3": vol, "solidity_est": solidity, "filament_g": dep / 1000 * material["density"],
            "print_min_est": minutes, "layers": layers, **sm}


def slicer_cli():
    for cand in ("prusa-slicer", "PrusaSlicer", "/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer",
                 "/Applications/Original Prusa Drivers/PrusaSlicer.app/Contents/MacOS/PrusaSlicer",
                 "/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer"):
        p = shutil.which(cand) or (cand if os.path.exists(cand) else None)
        if p:
            return p
    return None


def _parse_gcode_stats(text, exe):
    g = re.search(r"filament used \[g\]\s*=\s*([\d.]+)", text)
    t = re.search(r"estimated printing time.*?=\s*(.+)", text)
    res = {"filament_g": float(g.group(1)) if g else None, "time": t.group(1).strip() if t else None, "slicer": os.path.basename(exe)}
    if t:
        h, m, s = (re.search(rf"(\d+)\s*{u}", res["time"]) for u in ("h", "m", "s"))
        res["print_min"] = round(60 * int(h.group(1) if h else 0) + int(m.group(1) if m else 0) + int(s.group(1) if s else 0) / 60, 1)
    return res


# --- OrcaSlicer -----------------------------------------------------------------------------------
# Orca's CLI needs a machine + process + filament JSON, and its bundled profiles use `inherits`, which
# the CLI does not resolve. We flatten the chain via the vendor index (<vendor>.json → sub_path).
# Default is Orca's generic 250 mm Klipper printer; override with DRONECAD_ORCA_MACHINE="Vendor:Machine name"
# (e.g. "BBL:Bambu Lab P1S 0.4 nozzle", "Prusa:Original Prusa MK4 0.4 nozzle").
ORCA_FILAMENT = {"PLA": "Generic PLA @System", "PETG": "Generic PETG @System", "ASA": "Generic ASA @System",
                 "ABS": "Generic ABS @System", "Nylon": "Generic PA @System", "PA": "Generic PA @System",
                 "TPU": "Generic TPU @System", "CF": "Generic PA-CF @System"}
_ORCA_PROFILE_CACHE = {}


def _orca_profiles_dir(exe):
    return os.path.normpath(os.path.join(os.path.dirname(exe), "..", "Resources", "profiles"))


def _orca_flatten(root, vendor, kind, name):
    idx = json.load(open(os.path.join(root, vendor + ".json")))
    entry = next((e for e in idx.get(f"{kind}_list", []) if e["name"] == name), None)
    if entry is None:
        raise FileNotFoundError(f"Orca {vendor} {kind} preset '{name}' not found")
    d = json.load(open(os.path.join(root, vendor, entry["sub_path"])))
    parent = d.pop("inherits", None)
    if parent:
        base = _orca_flatten(root, vendor, kind, parent)
        base.update(d)
        d = base
    return d


def _orca_profiles(exe, material_name, layer=PRINT["layer"]):
    """Flattened (machine, process, filament) JSON paths for Orca's CLI, cached per material."""
    key = (exe, material_name)
    if key in _ORCA_PROFILE_CACHE:
        return _ORCA_PROFILE_CACHE[key]
    root = _orca_profiles_dir(exe)
    vendor, machine = (os.environ.get("DRONECAD_ORCA_MACHINE") or "Custom:MyKlipper 0.4 nozzle").split(":", 1)
    m = _orca_flatten(root, vendor, "machine", machine)
    idx = json.load(open(os.path.join(root, vendor + ".json")))
    proc_name = None
    for e in idx.get("process_list", []):
        if e["name"].startswith(f"{layer:.2f}mm"):
            cand = _orca_flatten(root, vendor, "process", e["name"])
            if machine in cand.get("compatible_printers", []) or not cand.get("compatible_printers"):
                proc_name = e["name"]
                p = cand
                break
    if proc_name is None:
        raise FileNotFoundError(f"no {layer:.2f}mm Orca process preset compatible with {machine}")
    f = _orca_flatten(root, "OrcaFilamentLibrary", "filament", ORCA_FILAMENT.get(material_name, "Generic PETG @System"))
    p.update({"wall_loops": str(PRINT["perimeters"]), "sparse_infill_density": f"{PRINT['infill'] * 100:.0f}%",
              "top_shell_layers": str(PRINT["top_bottom_layers"]), "bottom_shell_layers": str(PRINT["top_bottom_layers"]),
              "compatible_printers": [m["name"]], "compatible_printers_condition": ""})
    f["compatible_printers"] = []
    d = tempfile.mkdtemp(prefix="dronecad-orca-")
    paths = []
    for tag, cfg in (("machine", m), ("process", p), ("filament", f)):
        for k in ("setting_id", "instantiation", "renamed_from"):
            cfg.pop(k, None)
        cfg["from"] = "system"  # CLI then treats the preset name itself as the system name for the compat check
        path = os.path.join(d, f"{tag}.json")
        with open(path, "w") as fh:
            json.dump(cfg, fh)
        paths.append(path)
    _ORCA_PROFILE_CACHE[key] = (tuple(paths), f"{vendor}:{machine} / {proc_name} / {f['name']}")
    return _ORCA_PROFILE_CACHE[key]


def _slice_orca(exe, stl_path, out_dir, material_name):
    (machine, process, filament), profile = _orca_profiles(exe, material_name)
    work = tempfile.mkdtemp(prefix="dronecad-orca-out-")
    try:
        subprocess.run([exe, "--load-settings", f"{machine};{process}", "--load-filaments", filament, "--arrange", "1", "--ensure-on-bed",
                        "--slice", "0", "--export-3mf", "out.3mf", "--outputdir", work, stl_path],
                       check=True, capture_output=True, timeout=600)
        with zipfile.ZipFile(os.path.join(work, "out.3mf")) as z:
            names = [n for n in z.namelist() if n.endswith(".gcode")]
            text = z.read(names[0]).decode(errors="ignore")
            text = text[:30000] + text[-30000:]  # Orca writes the totals in the header, Prusa in the footer
        res = _parse_gcode_stats(text, exe)
        res["profile"] = profile
        return res
    finally:
        shutil.rmtree(work, ignore_errors=True)


def slice_with_cli(exe, stl_path, out_dir, material_name="PETG"):
    """Real filament/time from PrusaSlicer or OrcaSlicer CLI. Returns None if slicing fails."""
    try:
        if "orca" in os.path.basename(exe).lower():
            return _slice_orca(exe, stl_path, out_dir, material_name)
        gcode = os.path.join(out_dir, os.path.basename(stl_path).replace(".stl", ".gcode"))
        subprocess.run([exe, "--export-gcode", "-o", gcode, stl_path], check=True, capture_output=True, timeout=600)
        with open(gcode, errors="ignore") as f:
            tail = f.read()[-20000:]
        os.remove(gcode)
        return _parse_gcode_stats(tail, exe)
    except Exception as e:  # slicer problems must never fail the build
        return {"error": f"{type(e).__name__}: {e}"[:200], "slicer": os.path.basename(exe)}


def check_mesh(name, stl_path, material, out_dir, slicer=None):
    """Print figures for a frame that only exists as a mesh (third-party STL): overhangs + slicer; no B-rep checks."""
    tris = list(_stl_tris(stl_path))
    vol = 0.0
    for a, b, c in tris:  # signed tetra volumes → closed-mesh volume
        vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    vol = abs(vol)
    ov = overhangs(stl_path)
    res = {"part": name, "volume_mm3": vol, "solidity_est": material.get("print_solidity", 0.9), "thin_wall_pct": 0.0,
           "filament_g": vol / 1000 * material["density"] * material.get("print_solidity", 0.9), "print_min_est": vol / 1000 / 3.5 / 60 * 1000 * 0.9,
           "layers": None, "small_holes": [], **ov, "mesh_only": True}
    exe = slicer or slicer_cli()
    if exe:
        res["slicer"] = slice_with_cli(exe, stl_path, out_dir, material.get("name", "PETG"))
    res["flags"], res["warnings"] = [], []
    if ov["pct"] > 15.0:
        res["warnings"].append(f"{ov['pct']:.1f} % of the surface overhangs > {PRINT['overhang_deg']:.0f}° in flight orientation — the mesh holds several bodies; orient per body in the slicer")
    elif ov["pct"] > 2.0:
        res["warnings"].append(f"print with supports under {ov['overhang_area_mm2']:.0f} mm² of overhang ({ov['pct']:.1f} %)")
    return res


def check_part(name, part, stl_path, material, out_dir, slicer=None):
    est = estimate_print(part, material)
    ov = overhangs(stl_path)
    holes = small_holes(part)
    res = {"part": name, **est, **ov, "small_holes": holes}
    exe = slicer or slicer_cli()
    if exe:
        res["slicer"] = slice_with_cli(exe, stl_path, out_dir, material.get("name", "PETG"))
    res["flags"], res["warnings"] = [], []
    if ov["pct"] > 15.0:
        res["flags"].append(f"overhangs > {PRINT['overhang_deg']:.0f}°: {ov['overhang_area_mm2']:.0f} mm² ({ov['pct']:.1f} % of surface) — re-orient or redesign")
    elif ov["pct"] > 2.0:
        res["warnings"].append(f"print with supports under {ov['overhang_area_mm2']:.0f} mm² of overhang ({ov['pct']:.1f} %)")
    if est["thin_wall_pct"] > 1.0:
        res["flags"].append(f"walls thinner than {PRINT['min_wall']} mm: {est['thin_wall_pct']:.1f} % of slice area")
    if holes:
        res["flags"].append(f"{len(holes)} holes under Ø{PRINT['min_hole_d']} mm (will close up / need drilling)")
    return res
