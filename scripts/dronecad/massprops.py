"""Mass, CG and inertia tensor from the exact solids (BOM masses for bought parts, density × volume for printed)."""
from __future__ import annotations

from build123d import CenterOf


def compute(build):
    mats = build.bom["materials"]
    rows, total, entries = [], 0.0, []
    for s, kind, mass_g, material in build.bodies:
        if kind == "keepout":
            continue
        vol = s.volume
        if vol <= 0:
            continue
        if mass_g is None:
            m = mats[material]
            mass = vol / 1000 * m["density"] * m["print_solidity"]
            src = f"{vol:.0f} mm³ × {m['density']} × {m['print_solidity']}"
        else:
            mass, src = mass_g, "BOM" if kind != "wire" else "swept volume × 1.6 g/cm³"
        if mass <= 0:
            continue
        cg = s.center(CenterOf.MASS)
        I = s.matrix_of_inertia
        k = mass / vol
        entries.append((mass, cg, [[I[r][c] * k for c in range(3)] for r in range(3)]))
        total += mass
        rows.append({"component": s.label, "kind": kind, "mass_g": round(mass, 2), "volume_mm3": round(vol, 1), "source": src})
    cx = sum(m * c.X for m, c, _ in entries) / total
    cy = sum(m * c.Y for m, c, _ in entries) / total
    cz = sum(m * c.Z for m, c, _ in entries) / total
    T = [[0.0] * 3 for _ in range(3)]
    for m, c, I in entries:
        d = (c.X - cx, c.Y - cy, c.Z - cz)
        d2 = sum(v * v for v in d)
        for r in range(3):
            for q in range(3):
                T[r][q] += I[r][q] + m * ((d2 if r == q else 0) - d[r] * d[q])
    k = 1e-9  # g·mm² → kg·m²
    inertia = {"Ixx": T[0][0] * k, "Iyy": T[1][1] * k, "Izz": T[2][2] * k, "Ixy": T[0][1] * k, "Ixz": T[0][2] * k, "Iyz": T[1][2] * k}
    frame = sum(r["mass_g"] for r in rows if r["kind"] in ("frame", "guard"))
    by_kind = {}
    for r in rows:
        by_kind[r["kind"]] = round(by_kind.get(r["kind"], 0) + r["mass_g"], 1)
    return {"total_g": total, "cg_mm": (cx, cy, cz), "inertia_kgm2": inertia, "table": rows,
            "frame_and_guards_g": frame, "by_kind_g": by_kind}
