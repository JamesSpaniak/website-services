# Base kit parts on the Fusion reference frame (20260911 print, imported STL) — exact CAD, checks and simulation

Variant `reference-fusion` · kit **base** · `python -m dronecad build -v reference-fusion` in 210 s from `bom.json` + `variants.json` (dronecad 0.3.0). Frame: imported mesh `reference/fusion-frame-20260911.stl` in PETG (kit parts mounted on it; adapters printed where the mount patterns differ).

## Files

- `assembly.step` — STEP assembly, coloured + labelled (Onshape / FreeCAD / Fusion)
- `assembly.glb` — glTF for the browser viewer
- `viewer.html` — rotate-in-browser viewer
- `print/*.stl` — printable adapters + guard; frame-reference.stl is the imported frame in kit axes (FEA input)
- `cad.json` — everything below as data
- `sim-hover-cad.csv` — fixed-gain hover sim
- `sim-betaflight-gust.csv` — Betaflight-PID sim with gust

## Fit checks (exact B-rep)

| Check | Result | Detail |
|---|---|---|
| motor mount: mesh pads have Ø9 bolt circle (diamond), kit motors need 12x12 | NOTE | 12 of 16 kit hole positions over air → printed 2 mm adapter disc per motor (Ø24); motors sit 2 mm higher |
| stack mount: mesh has 30.5×30.5, kit needs 20×20 | NOTE | printed 2 mm adapter plate added (38.5×38.5); stack sits 2 mm higher |
| stack clear height ≥ 16 mm (+O4 + coax plug if video) | PASS | clear 23.3 mm; needs 15.7; stack top z=22.0 |
| prop tip-to-tip gap ≥ 8 mm | PASS | min 13.3 mm |
| guard-to-guard gap ≥ 2 mm | PASS | min 6.3 mm |
| wheelbase 145–168 mm (parts list §4 target 150–160) | PASS | 165.8 mm |
| motor leads ≤ 150 mm (swept route) | PASS | longest 66 mm |
| no prop strike (exact intersection) | PASS | 0.0 mm³ of solids inside a prop |
| no unexpected interference | PASS | clean |
| ≥ 3 mm clearance around every prop disc (incl. wires) | **FAIL** | M1 ↔ Frame (reference mesh fusion-frame-20260911.stl) (2.0 mm); M2 ↔ Frame (reference mesh fusion-frame-20260911.stl) (2.0 mm); M3 ↔ Frame (reference mesh fusion-frame-20260911.stl) (2.0 mm); M4 ↔ Frame (reference mesh fusion-frame-20260911.stl) (2.0 mm) |
| RF keep-outs free (GPS sky view, RX antenna tip) | PASS | clear |
| AUW ≤ 250 g soft cap | PASS | 222 g |
| arm SF ≥ 2 at max thrust (exact section) | PASS | SF 4.5 |
| ESC ΔT < 60 °C at 50 % throttle | PASS | ΔT 16 °C |
| gust 5 m/s: roll excursion < 10° with BF defaults | PASS | 0.1°, drift 2.91 m |
| print/frame-reference.stl prints cleanly | PASS | 40.5 g, 2h 37m 43s (OrcaSlicer); 28.2 % of the surface overhangs > 45° in flight orientation — the mesh holds several bodies; orient per body in the slicer |
| print/motor-adapter.stl prints cleanly | PASS | 0.9 g, 3m 26s (OrcaSlicer) |
| print/stack-adapter.stl prints cleanly | PASS | 3.0 g, 7m 51s (OrcaSlicer) |
| print/guard.stl prints cleanly | PASS | 7.5 g, 35m 3s (OrcaSlicer); print with supports under 210 mm² of overhang (3.0 %) |
| FEA SF ≥ 2 at max thrust (p99 basis) | PASS | max 28.5 MPa (SF 1.8), p99 12.1 MPa |
| first arm mode vs the idle→hover motor band (FEA) | PASS | 36 Hz = 2135 rpm vs idle 80 Hz – hover 254 Hz |

By-design contacts (fasteners, spokes on pads, wires on pads, hub on shaft): 253 mm³ in 17 pairs.

### Wire routes (swept)

| Wire | Length (mm) | Ø (mm) | Mass (g) |
|---|---:|---:|---:|
| Motor 1 leads (3× 22 AWG) | 66 | 2.4 | 0.48 |
| Motor 2 leads (3× 22 AWG) | 66 | 2.4 | 0.48 |
| Motor 3 leads (3× 22 AWG) | 66 | 2.4 | 0.48 |
| Motor 4 leads (3× 22 AWG) | 66 | 2.4 | 0.48 |
| Battery leads (2× 14 AWG) | 22 | 3.0 | 0.25 |
| RX harness (4 wires) | 65 | 1.6 | 0.21 |

Notes: top deck from the mesh at z 26.3–29.3 mm, x -70…75: battery and BeeID placed on it, strap modelled through it; frame from fusion-frame-20260911.stl: 7682 triangles, 37.0 cm³; stack pattern 30.5 at mesh (25, -35) → origin, rotated -90°; motors Ø9 bolt circle (diamond); pads at z [5.0]

## Mass and balance (from the solids)

**AUW 222.2 g** · frame + guards 68.2 g · by kind {'hardware': 18.6, 'frame': 42.3, 'electronics': 59.7, 'prop': 7.2, 'guard': 26.0, 'battery': 66, 'wire': 2.4} · CG (-2.4, 0.0, 22.5) mm · CG **0.0 mm above the prop plane** (z 22.5).

| Component | Mass (g) | Volume (mm³) | Source |
|---|---:|---:|---|
| Motor adapter M1 (Ø9 bolt circle (diamond) → 12x12, printed) | 0.8 | 721 | 721 mm³ × 1.27 × 0.9 |
| Motor adapter M2 (Ø9 bolt circle (diamond) → 12x12, printed) | 0.8 | 721 | 721 mm³ × 1.27 × 0.9 |
| Motor adapter M3 (Ø9 bolt circle (diamond) → 12x12, printed) | 0.8 | 721 | 721 mm³ × 1.27 × 0.9 |
| Motor adapter M4 (Ø9 bolt circle (diamond) → 12x12, printed) | 0.8 | 721 | 721 mm³ × 1.27 × 0.9 |
| Stack adapter 30.5→20×20 (printed) | 2.8 | 2448 | 2448 mm³ × 1.27 × 0.9 |
| Frame (reference mesh fusion-frame-20260911.stl) | 42.3 | 36984 | 36984 mm³ × 1.27 × 0.9 |
| ESC 45A 4-in-1 | 7.0 | 5811 | BOM |
| FC F722 | 9.9 | 3514 | BOM |
| Motor 1 XILO 1404 (CW) | 9.2 | 4012 | BOM |
| Prop 1 Gemfan 3525 (CW) | 1.8 | 1453 | BOM |
| Motor 2 XILO 1404 (CCW) | 9.2 | 4012 | BOM |
| Prop 2 Gemfan 3525 (CCW) | 1.8 | 1453 | BOM |
| Motor 3 XILO 1404 (CCW) | 9.2 | 4012 | BOM |
| Prop 3 Gemfan 3525 (CCW) | 1.8 | 1453 | BOM |
| Motor 4 XILO 1404 (CW) | 9.2 | 4012 | BOM |
| Prop 4 Gemfan 3525 (CW) | 1.8 | 1453 | BOM |
| Prop guard 1 (TPU) | 6.5 | 6293 | 6293 mm³ × 1.21 × 0.85 |
| Prop guard 2 (TPU) | 6.5 | 6293 | 6293 mm³ × 1.21 × 0.85 |
| Prop guard 3 (TPU) | 6.5 | 6293 | 6293 mm³ × 1.21 × 0.85 |
| Prop guard 4 (TPU) | 6.5 | 6293 | 6293 mm³ × 1.21 × 0.85 |
| Battery Flywoo Explorer 1000 mAh 3S LiHV 80C XT30UP (assumed) | 66.0 | 34443 | BOM |
| Battery strap | 3.0 | 1488 | BOM |
| BeeID GPS + Remote ID | 5.2 | 2816 | BOM |
| ELRS RX | 0.8 | 1152 | BOM |
| Capacitor (low-ESR, on BAT pads) | 3.0 | 603 | BOM |
| Wire: Motor 1 leads (3× 22 AWG) | 0.5 | 300 | swept volume × 1.6 g/cm³ |
| Wire: Motor 2 leads (3× 22 AWG) | 0.5 | 300 | swept volume × 1.6 g/cm³ |
| Wire: Motor 3 leads (3× 22 AWG) | 0.5 | 300 | swept volume × 1.6 g/cm³ |
| Wire: Motor 4 leads (3× 22 AWG) | 0.5 | 300 | swept volume × 1.6 g/cm³ |
| Wire: Battery leads (2× 14 AWG) | 0.2 | 156 | swept volume × 1.6 g/cm³ |
| Wire: RX harness (4 wires) | 0.2 | 130 | swept volume × 1.6 g/cm³ |
| XT30 pigtail | 6.6 | 1152 | BOM |

Inertia about the CG (kg·m²): Ixx 4.57e-04 · Iyy 4.06e-04 · Izz 7.59e-04 · Ixz -1.9e-07

## Propulsion

| Item | Value |
|---|---|
| Model | Ct/Cp model; swap in thrust-stand numbers via the override fields in bom.json |
| Thrust-to-weight | 6.9 |
| Hover | 38 % rpm, 3.1 A → 15 min on 1000 mAh |
| Max thrust / current per motor | 382 g / 13.5 A |

## Structure

### Arm section (exact, from the solid)

| Station | From root (mm) | Area (mm²) | I (mm⁴) | c (mm) |
|---|---:|---:|---:|---:|
| 0.15 | 6.3 | 13.8 | 37.9 | 2.35 |
| 0.50 | 20.8 | 69.2 | 310.5 | 4.0 |
| 0.85 | 35.4 | 38.2 | 62.1 | 2.67 |

Beam check at the weakest station:

| Load | Force (N) | Stress (MPa) | SF flat print | SF standing print |
|---|---:|---:|---:|---:|
| max thrust | 3.7 | 11.0 | 4.5 | 2.7 |
| crash 5 g on the arm tip | 10.9 | 32.0 | 1.6 | 0.9 |
| crash 10 g | 21.8 | 64.0 | 0.8 | 0.5 |
| crash 20 g | 43.6 | 128.0 | 0.4 | 0.2 |

Tip deflection at max thrust 2.42 mm · first bending mode (beam) 59 Hz vs prop 254 Hz at hover / 667 Hz max.

### FEA — bottom frame (29937 tet10, 174321 free DOF, 4.0 mm mesh, 49 s)

| Case | Max von Mises (MPa) | p99 (MPa) | SF (p99) | Max displacement (mm) | Hotspot (mm) |
|---|---:|---:|---:|---:|---|
| max thrust on all motors | 28.5 | 12.1 | 4.1 | 4.53 | [-16.9, 17.2, 2.9] |
| 10 g vertical crash on one arm tip | 141.8 | 60.3 | 0.8 | 26.98 | [17.9, -15.6, 2.8] |
| 10 g lateral crash on one arm tip | 24.5 | 9.6 | 5.2 | 1.12 | [49.6, -14.7, 0.6] |

First modes with motors, props and guards lumped on the pads: 36 Hz, 36 Hz, 37 Hz. Max von Mises includes the clamp-edge singularity at the standoffs (hotspot column); the p99 value is the design number. Linear elastic tet10; clamped at the stack footprint; loads spread over pad top nodes; lumped masses for modes. Layer adhesion not modelled — multiply SF by the material's layer_factor for standing prints.

## Flight dynamics

| Item | Fixed-gain reference sim | Betaflight-default PID sim |
|---|---|---|
| Static hover thrust M1–M4 (g) | 58.1 / 52.9 / 58.2 / 52.9 | — |
| 15° roll step peak | 15.5° | 15.0° |
| Return to < 1° | 0.43 s | 0.54 s |
| Side gust 5 m/s: roll peak / drift | — | 0.1° / 2.91 m |
| Motor saturation | 0.0 % | 0.0 % |

Betaflight 4.5 default PIDs (angle mode), 4 kHz loop, D-term LPF 100 Hz. Gust drag acts 19 mm from the CG (battery centroid), CdA 55 cm². Rate PID in BF units (pidSum/1000 → motor fraction); thrust ∝ command²; 20 ms motor lag; side gust from the right at 3.5 s.

## ESC thermal

| Condition | ESC loss (W) | ΔT (°C) | OK |
|---|---:|---:|---|
| hover | 1.0 | 15 | yes |
| 50 % throttle | 1.1 | 16 | yes |

Lumped estimate: Rds(on) 10 mΩ/leg + 0.25 W switching per channel; h = 35 W/m²K in prop wash, 15 W/m²K behind lattice keel walls. ΔT < 60 °C keeps FETs under 100 °C at 40 °C ambient.

## Manufacturability (printed parts)

| Part | Volume (mm³) | Solidity est. | Filament (g) | Time est. (min) | Overhang > 45° | Thin walls | Small holes | Flags |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frame-reference | 36984 | 0.90 | 42.3 (slicer 40.5) | 159 (slicer 2h 37m 43s) | 28.2 % | 0.0 % | 0 | 28.2 % of the surface overhangs > 45° in flight orientation — the mesh holds several bodies; orient per body in the slicer |
| motor-adapter | 721 | 0.94 | 0.9 (slicer 0.9) | 4 (slicer 3m 26s) | 0.0 % | 0.0 % | 0 | ok |
| stack-adapter | 2448 | 1.00 | 3.1 (slicer 3.0) | 12 (slicer 7m 51s) | 0.0 % | 0.0 % | 0 | ok |
| guard | 6293 | 0.96 | 7.3 (slicer 7.5) | 36 (slicer 35m 3s) | 3.0 % | 0.0 % | 0 | print with supports under 210 mm² of overhang (3.0 %) |

Estimates assume 0.4 mm nozzle, 0.2 mm layers, 3 perimeters, 4 top/bottom layers, 30 % infill, ~3.5 mm³/s effective flow.
Slicer figures in parentheses are from OrcaSlicer with profile `Custom:MyKlipper 0.4 nozzle / 0.20mm Standard @MyKlipper / Generic PETG @System` and the same walls/infill/layers; set `DRONECAD_ORCA_MACHINE="Vendor:Machine name"` to slice for your printer.
