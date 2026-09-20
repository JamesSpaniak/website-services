# Base kit — stretched X (longer pitch axis) — exact CAD, checks and simulation

Variant `base-stretch-x` · kit **base** · `python -m dronecad build -v base-stretch-x` in 49 s from `bom.json` + `variants.json` (dronecad 0.3.0). Arms: solid 12×4 mm PETG.

## Files

- `assembly.step` — STEP assembly, coloured + labelled (Onshape / FreeCAD / Fusion)
- `assembly.glb` — glTF for the browser viewer
- `viewer.html` — rotate-in-browser viewer
- `print/*.stl` — printable parts (+ frame-bottom.step for FEA)
- `cad.json` — everything below as data
- `sim-hover-cad.csv` — fixed-gain hover sim
- `sim-betaflight-gust.csv` — Betaflight-PID sim with gust

## Fit checks (exact B-rep)

| Check | Result | Detail |
|---|---|---|
| stack clear height ≥ 16 mm (+O4 + coax plug if video) | PASS | clear 24 mm; needs 15.7; stack top z=20 |
| prop tip-to-tip gap ≥ 8 mm | PASS | min 11.1 mm |
| guard-to-guard gap ≥ 2 mm | PASS | min 4.1 mm |
| wheelbase 145–168 mm (parts list §4 target 150–160) | PASS | 165.6 mm |
| motor leads ≤ 150 mm (swept route) | PASS | longest 79 mm |
| no prop strike (exact intersection) | PASS | 0.0 mm³ of solids inside a prop |
| no unexpected interference | PASS | clean |
| ≥ 3 mm clearance around every prop disc (incl. wires) | PASS | clear |
| RF keep-outs free (GPS sky view, RX antenna tip) | PASS | clear |
| AUW ≤ 250 g soft cap | PASS | 218 g |
| arm SF ≥ 2 at max thrust (exact section) | PASS | SF 10.7 |
| ESC ΔT < 60 °C at 50 % throttle | PASS | ΔT 16 °C |
| gust 5 m/s: roll excursion < 10° with BF defaults | PASS | 0.1°, drift 2.48 m |
| print/frame-bottom.stl prints cleanly | PASS | 19.7 g, 48m 37s (OrcaSlicer) |
| print/frame-top.stl prints cleanly | PASS | 11.8 g, 24m 41s (OrcaSlicer) |
| print/guard.stl prints cleanly | PASS | 7.5 g, 34m 45s (OrcaSlicer); print with supports under 210 mm² of overhang (3.0 %) |
| FEA SF ≥ 2 at max thrust (p99 basis) | PASS | max 31.5 MPa (SF 1.6), p99 8.1 MPa |
| first arm mode vs the idle→hover motor band (FEA) | PASS | 43 Hz = 2571 rpm vs idle 80 Hz – hover 252 Hz |

By-design contacts (fasteners, spokes on pads, wires on pads, hub on shaft): 998 mm³ in 35 pairs.

### Wire routes (swept)

| Wire | Length (mm) | Ø (mm) | Mass (g) |
|---|---:|---:|---:|
| Motor 1 leads (3× 22 AWG) | 79 | 2.4 | 0.57 |
| Motor 2 leads (3× 22 AWG) | 79 | 2.4 | 0.57 |
| Motor 3 leads (3× 22 AWG) | 79 | 2.4 | 0.57 |
| Motor 4 leads (3× 22 AWG) | 79 | 2.4 | 0.57 |
| Battery leads (2× 14 AWG) | 20 | 3.0 | 0.23 |
| RX harness (4 wires) | 61 | 1.6 | 0.20 |

## Mass and balance (from the solids)

**AUW 218.5 g** · frame + guards 64.6 g · by kind {'frame': 38.7, 'electronics': 59.7, 'hardware': 18.3, 'prop': 7.2, 'guard': 26.0, 'battery': 66, 'wire': 2.8} · CG (-3.2, 0.0, 22.7) mm · CG **1.2 mm above the prop plane** (z 21.5).

Voxel model: AUW 220.6 g, frame + guards 66.7 g, CG z 22.8 mm.

| Component | Mass (g) | Volume (mm³) | Source |
|---|---:|---:|---|
| Frame bottom + arms | 24.3 | 21274 | 21274 mm³ × 1.27 × 0.9 |
| Frame top plate | 14.4 | 12581 | 12581 mm³ × 1.27 × 0.9 |
| ESC 45A 4-in-1 | 7.0 | 5811 | BOM |
| FC F722 | 9.9 | 3514 | BOM |
| Standoff 1 | 1.5 | 226 | BOM |
| Standoff 2 | 1.5 | 226 | BOM |
| Standoff 3 | 1.5 | 226 | BOM |
| Standoff 4 | 1.5 | 226 | BOM |
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
| Wire: Motor 1 leads (3× 22 AWG) | 0.6 | 358 | swept volume × 1.6 g/cm³ |
| Wire: Motor 2 leads (3× 22 AWG) | 0.6 | 358 | swept volume × 1.6 g/cm³ |
| Wire: Motor 3 leads (3× 22 AWG) | 0.6 | 358 | swept volume × 1.6 g/cm³ |
| Wire: Motor 4 leads (3× 22 AWG) | 0.6 | 358 | swept volume × 1.6 g/cm³ |
| Wire: Battery leads (2× 14 AWG) | 0.2 | 142 | swept volume × 1.6 g/cm³ |
| Wire: RX harness (4 wires) | 0.2 | 123 | swept volume × 1.6 g/cm³ |
| XT30 pigtail | 6.3 | 1152 | BOM |

Inertia about the CG (kg·m²): Ixx 3.08e-04 · Iyy 5.16e-04 · Izz 7.17e-04 · Ixz 6.5e-07

## Propulsion

| Item | Value |
|---|---|
| Model | Ct/Cp model; swap in thrust-stand numbers via the override fields in bom.json |
| Thrust-to-weight | 7.0 |
| Hover | 38 % rpm, 3.1 A → 16 min on 1000 mAh |
| Max thrust / current per motor | 382 g / 13.5 A |

## Structure

### Arm section (exact, from the solid)

| Station | From root (mm) | Area (mm²) | I (mm⁴) | c (mm) |
|---|---:|---:|---:|---:|
| 0.15 | 8.4 | 54.0 | 70.0 | 2.0 |
| 0.50 | 27.9 | 48.0 | 64.2 | 2.0 |
| 0.85 | 47.4 | 48.0 | 64.2 | 2.0 |

Beam check at the weakest station:

| Load | Force (N) | Stress (MPa) | SF flat print | SF standing print |
|---|---:|---:|---:|---:|
| max thrust | 3.7 | 4.7 | 10.7 | 6.4 |
| crash 5 g on the arm tip | 10.7 | 13.3 | 3.8 | 2.3 |
| crash 10 g | 21.4 | 26.6 | 1.9 | 1.1 |
| crash 20 g | 42.9 | 53.3 | 0.9 | 0.6 |

Tip deflection at max thrust 2.65 mm · first bending mode (beam) 55 Hz vs prop 252 Hz at hover / 667 Hz max.

### FEA — bottom frame (13441 tet10, 72351 free DOF, 4.0 mm mesh, 23 s)

| Case | Max von Mises (MPa) | p99 (MPa) | SF (p99) | Max displacement (mm) | Hotspot (mm) |
|---|---:|---:|---:|---:|---|
| max thrust on all motors | 31.5 | 8.1 | 6.2 | 3.24 | [19.6, -22.8, 2.6] |
| 10 g vertical crash on one arm tip | 178.5 | 35.1 | 1.4 | 18.56 | [19.6, -22.8, 2.6] |
| 10 g lateral crash on one arm tip | 99.0 | 8.8 | 5.7 | 1.83 | [19.6, -22.8, 2.6] |

First modes with motors, props and guards lumped on the pads: 43 Hz, 43 Hz, 43 Hz. Max von Mises includes the clamp-edge singularity at the standoffs (hotspot column); the p99 value is the design number. Linear elastic tet10; clamped at the stack footprint; loads spread over pad top nodes; lumped masses for modes. Layer adhesion not modelled — multiply SF by the material's layer_factor for standing prints.

## Flight dynamics

| Item | Fixed-gain reference sim | Betaflight-default PID sim |
|---|---|---|
| Static hover thrust M1–M4 (g) | 57.3 / 52.0 / 57.3 / 52.0 | — |
| 15° roll step peak | 15.0° | 15.0° |
| Return to < 1° | 0.40 s | 0.54 s |
| Side gust 5 m/s: roll peak / drift | — | 0.1° / 2.48 m |
| Motor saturation | 0.0 % | 0.0 % |

Betaflight 4.5 default PIDs (angle mode), 4 kHz loop, D-term LPF 100 Hz. Gust drag acts 19 mm from the CG (battery centroid), CdA 44 cm². Rate PID in BF units (pidSum/1000 → motor fraction); thrust ∝ command²; 20 ms motor lag; side gust from the right at 3.5 s.

## ESC thermal

| Condition | ESC loss (W) | ΔT (°C) | OK |
|---|---:|---:|---|
| hover | 1.0 | 15 | yes |
| 50 % throttle | 1.1 | 16 | yes |

Lumped estimate: Rds(on) 10 mΩ/leg + 0.25 W switching per channel; h = 35 W/m²K in prop wash, 15 W/m²K behind lattice keel walls. ΔT < 60 °C keeps FETs under 100 °C at 40 °C ambient.

## Manufacturability (printed parts)

| Part | Volume (mm³) | Solidity est. | Filament (g) | Time est. (min) | Overhang > 45° | Thin walls | Small holes | Flags |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frame-bottom | 21274 | 0.69 | 18.6 (slicer 19.7) | 71 (slicer 48m 37s) | 0.0 % | 0.0 % | 0 | ok |
| frame-top | 12581 | 0.54 | 8.6 (slicer 11.8) | 35 (slicer 24m 41s) | 0.0 % | 0.0 % | 0 | ok |
| guard | 6293 | 0.96 | 7.3 (slicer 7.5) | 36 (slicer 34m 45s) | 3.0 % | 0.0 % | 0 | print with supports under 210 mm² of overhang (3.0 %) |

Mass model vs print model: `print_solidity` 0.9 in bom.json (used for the mass table) vs 0.69 estimated for these slicer settings — the frame will weigh between 19 g and 24 g depending on infill; the slicer says 19.7 g; calibrate with the first test print.

Estimates assume 0.4 mm nozzle, 0.2 mm layers, 3 perimeters, 4 top/bottom layers, 30 % infill, ~3.5 mm³/s effective flow.
Slicer figures in parentheses are from OrcaSlicer with profile `Custom:MyKlipper 0.4 nozzle / 0.20mm Standard @MyKlipper / Generic PETG @System` and the same walls/infill/layers; set `DRONECAD_ORCA_MACHINE="Vendor:Machine name"` to slice for your printer.
