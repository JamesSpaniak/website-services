"""Kit loading: bom.json + variants.json + optional parts/ library and thrust-stand data."""
from __future__ import annotations

import json
import os
import sys

_SCRIPTS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)
import build_drone_model as vox  # noqa: E402  — the stdlib voxel model: shared variant params + base physics

REPO = os.path.abspath(os.path.join(_SCRIPTS, ".."))
DEFAULT_KIT = os.path.join(REPO, "assets", "courses", "drone-building", "cad")

G = 9.81


class Kit:
    """A kit directory: bom.json, variants.json, parts/<component>/part.step (optional), thrust-stand.csv (optional)."""

    def __init__(self, path: str = DEFAULT_KIT):
        self.path = os.path.abspath(path)
        with open(os.path.join(self.path, "bom.json")) as f:
            self.bom = json.load(f)
        with open(os.path.join(self.path, "variants.json")) as f:
            self.variants = json.load(f)
        self.parts_dir = os.path.join(self.path, "parts")
        self.out_root = os.path.join(self.path, "generated")
        self.thrust_stand = os.path.join(self.path, "thrust-stand.csv")
        if not os.path.exists(self.thrust_stand):
            self.thrust_stand = None

    @property
    def name(self):
        base = os.path.basename(self.path.rstrip("/"))
        return self.bom.get("kit_name") or (os.path.basename(os.path.dirname(self.path.rstrip("/"))) if base == "cad" else base)

    def variant_names(self):
        return list(self.variants["variants"])

    def params(self, name):
        p = vox.variant_params(self.variants, name)
        # framework-level defaults for options older variants.json files do not declare
        p.setdefault("arm_style", "solid")       # solid | truss (vertical Warren truss) | truss-flat (planar)
        p.setdefault("truss_height", 10.0)       # vertical truss height (mm)
        p.setdefault("truss_chord", 3.0)         # chord thickness (mm)
        p.setdefault("truss_web", 2.0)           # diagonal / web thickness (mm)
        p.setdefault("plate_cutouts", False)     # lightening holes in the centre plate
        p.setdefault("root_fillet", 3.0)         # fillet radius where arms meet the plate (0 = none)
        p.setdefault("keel", False)              # lattice side walls between the plates
        p.setdefault("keel_thickness", 2.0)
        p.setdefault("wires", True)              # swept wire routes
        return p

    def motors(self, p):
        return vox.motor_positions(p)

    def step_for(self, component: str):
        """Tier-C vendor geometry: parts/<component>/part.step (+ optional part.json with an origin offset)."""
        d = os.path.join(self.parts_dir, component)
        for fn in ("part.step", "part.stp", "part.STEP"):
            fp = os.path.join(d, fn)
            if os.path.exists(fp):
                meta = {}
                mp = os.path.join(d, "part.json")
                if os.path.exists(mp):
                    with open(mp) as f:
                        meta = json.load(f)
                return fp, meta
        return None, None

    def out_dir(self, variant):
        d = os.path.join(self.out_root, variant)
        os.makedirs(os.path.join(d, "print"), exist_ok=True)
        return d
