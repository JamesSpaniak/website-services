"""Exact fit checks on the assembled bodies: pairwise interference, prop swept-disc clearance, keep-outs."""
from __future__ import annotations

from .geom import cyl


def bb_overlap(a, b, margin=0.0):
    return not (a.max.X + margin < b.min.X or b.max.X + margin < a.min.X or a.max.Y + margin < b.min.Y or
                b.max.Y + margin < a.min.Y or a.max.Z + margin < b.min.Z or b.max.Z + margin < a.min.Z)


def _vol(a, b):
    try:
        return (a & b).volume
    except Exception:
        return 0.0


def expected_contact(la, ka, lb, kb):
    """Contacts that are by design (fasteners, spokes on pads, wires on pads/plates, hub on shaft)."""
    return bool(
        ("guard" in (ka, kb) and ("Frame" in la or "Frame" in lb or "adapter" in la or "adapter" in lb))
        or ("hardware" in (ka, kb) and ({ka, kb} & {"frame", "electronics", "battery"}))
        or (ka == "prop" and "Motor" in lb) or (kb == "prop" and "Motor" in la)
        or ("wire" in (ka, kb) and ({ka, kb} & {"electronics", "frame", "hardware"}))
    )


def run(build, margin=3.0):
    """Populates build.checks; returns the list of interference hits."""
    solids = [(s, k) for s, k, _, _ in build.bodies if k != "keepout" and s.volume > 1]
    keepouts = [s for s, k, _, _ in build.bodies if k == "keepout"]
    bbs = [s.bounding_box() for s, _ in solids]
    hits = []
    for i in range(len(solids)):
        for j in range(i + 1, len(solids)):
            if not bb_overlap(bbs[i], bbs[j]):
                continue
            v = _vol(solids[i][0], solids[j][0])
            if v > 0.5:
                (sa, ka), (sb, kb) = solids[i], solids[j]
                hits.append({"a": sa.label, "b": sb.label, "kinds": [ka, kb], "mm3": round(v, 1),
                             "expected": expected_contact(sa.label, ka, sb.label, kb)})
    hits.sort(key=lambda h: -h["mm3"])
    strike = sum(h["mm3"] for h in hits if "prop" in h["kinds"] and not h["expected"])
    build.check("no prop strike (exact intersection)", strike < 0.5, f"{strike:.1f} mm³ of solids inside a prop")
    unexpected = [h for h in hits if not h["expected"]]
    build.check("no unexpected interference", not unexpected,
                "clean" if not unexpected else "; ".join(f"{h['a']} ↔ {h['b']} {h['mm3']:.0f} mm³" for h in unexpected[:6]))

    # swept-disc clearance shell
    worst = []
    for m, (mx, my, _) in build.motors.items():
        disc = cyl(build.prop_r + margin, 1.2 + 2 * margin, mx, my, build.prop_z - margin)
        dbb = disc.bounding_box()
        for (s, k), bb in zip(solids, bbs):
            if k == "prop" or s.label.startswith((f"Motor {m} ", f"Prop guard {m} ")):
                continue
            if bb_overlap(dbb, bb) and _vol(disc, s) > 0.5:
                # report the actual gap between the blade disc and the offender
                try:
                    gap = cyl(build.prop_r, 1.2, mx, my, build.prop_z - 0.6).distance_to(s)
                    worst.append(f"M{m} ↔ {s.label} ({gap:.1f} mm)")
                except Exception:
                    worst.append(f"M{m} ↔ {s.label}")
    build.check(f"≥ {margin:.0f} mm clearance around every prop disc (incl. wires)", not worst, "clear" if not worst else "; ".join(worst[:6]))

    # keep-outs: nothing but the owner may enter
    bad = []
    for ko in keepouts:
        owner = ko.label.replace("KEEP-OUT ", "").split()[0]  # "BeeID", "ELRS"
        kbb = ko.bounding_box()
        for (s, k), bb in zip(solids, bbs):
            if owner in s.label or not bb_overlap(kbb, bb):
                continue
            v = _vol(ko, s)
            if v > 0.5:
                bad.append(f"{ko.label} ← {s.label} ({v:.0f} mm³)")
    build.check("RF keep-outs free (GPS sky view, RX antenna tip)", not bad, "clear" if not bad else "; ".join(bad[:6]))
    return hits
