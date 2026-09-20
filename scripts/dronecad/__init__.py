"""dronecad — reusable CAD + checks + simulation framework for small-drone kits.

A *kit* is a directory holding `bom.json` (components, materials, propulsion) and `variants.json`
(frame layouts). The framework builds exact B-rep geometry with build123d, runs fit / clearance /
manufacturability checks, computes mass properties, runs FEA (gmsh + tet10) and flight-dynamics
simulations, and can analyse third-party frame meshes against the kit.

CLI: `python -m dronecad --help` (run with scripts/.venv-cad/bin/python).
"""

__version__ = "0.3.0"
