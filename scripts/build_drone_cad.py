#!/usr/bin/env python3
"""Compatibility wrapper — the exact-CAD pipeline now lives in the `dronecad` package.

    scripts/.venv-cad/bin/python scripts/build_drone_cad.py [-v VARIANT]   ≡   python -m dronecad build [-v VARIANT]

See scripts/dronecad/cli.py and assets/courses/drone-building/cad/README.md.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dronecad.cli import main  # noqa: E402

if __name__ == "__main__":
    argv = sys.argv[1:]
    if not argv or argv[0].startswith("-"):
        argv = ["build"] + argv
    main(argv)
