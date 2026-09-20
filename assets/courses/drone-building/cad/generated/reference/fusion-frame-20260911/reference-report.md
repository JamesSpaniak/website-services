# Reference frame — `fusion-frame-20260911.stl` vs kit `drone-building`

Third-party mesh analysed by `python -m dronecad reference`. 7682 triangles, 2 shells, watertight; envelope 145.6 × 145.0 × 34.3 mm; volume 37.0 cm³ → 42 g printed in PETG (47 g solid).

## Detected geometry

- Horizontal plateaus (z: area mm²): {'0.0': 5716, '3.0': 5832, '26.3': 3820, '29.3': 4048}
- Holes: 24 circular, diameters [2.81, 3.48, 4.68] mm
- Stack patterns: 30.5 at [(25.0, -35.0)]
- Motor pattern: Ø9 bolt circle (diamond); motors at [(-40.3, -86.1), (90.3, -86.1), (90.3, 16.1), (-40.3, 16.1)]
- Wheelbase 165.8 mm; motor spacings [102.2, 102.2, 130.6, 130.6] mm
- Stack clear height 23.3 mm

## Kit-fit checks

| Check | Result | Detail |
|---|---|---|
| stack mount 20×20 present | **FAIL** | found: 30.5 |
| motor mount 12×12 present | **FAIL** | found: Ø9 bolt circle (diamond) |
| wheelbase 145–168 mm (parts list §4 target 150–160) | PASS | 165.8 mm |
| prop tip gap ≥ 8 mm with 89 mm props | PASS | 13.3 mm |
| room for the kit's prop guards | PASS | 6.3 mm between rings |
| stack clear height ≥ 16 mm | PASS | 23.3 mm from bottom-plate top (z 3.0) to top-plate underside (z 26.3) |
| frame mass ≤ 65 g in PETG | PASS | 42 g printed (47 g solid) |
| watertight mesh (printable) | PASS | 2 shells, 0 bad edges |
| BeeID footprint on a top surface | NOTE | needs a 22×16 mm clear top area with sky view — verify manually |

## Manufacturability

Overhangs steeper than 45° (not on the bed): 10133 mm² = 28.2 % of the surface — this mesh holds 2 bodies in flight orientation, so the figure includes upper bodies' undersides; judge per body in the slicer. Thin-wall and hole checks need the B-rep (import the STEP/F3D source if available).

## FEA (from the mesh, kit motor loads)

Largest closed shell (plate + arms) remeshed: 34621 tet10, 198789 free DOF, 71 s. Clamped at the detected stack pattern; kit max thrust / 10 g × 240 g on the detected motor pads.

| Case | Max von Mises (MPa) | p99 (MPa) | SF (p99) | Max displacement (mm) |
|---|---:|---:|---:|---:|
| max thrust on all motors | 294.5 | 12.1 | 4.1 | 4.55 |
| 10 g vertical crash on one arm tip | 201.3 | 58.2 | 0.9 | 25.98 |
| 10 g lateral crash on one arm tip | 35.7 | 9.9 | 5.1 | 1.21 |

First modes (motor + prop lumped on the pads): 44 Hz, 45 Hz, 48 Hz. Max von Mises includes clamp-edge singularities; compare frames on the p99 column.
