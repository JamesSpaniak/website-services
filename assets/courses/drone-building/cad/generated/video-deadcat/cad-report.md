# Video kit — deadcat CF stand-in (props out of the camera view) — exact CAD, checks and simulation

Variant `video-deadcat` · kit **video** · `python -m dronecad build -v video-deadcat` in 46 s from `bom.json` + `variants.json` (dronecad 0.3.0). Arms: solid 10×4 mm CF.

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
| stack clear height ≥ 16 mm (+O4 + coax plug if video) | PASS | clear 30 mm; needs 28.2; stack top z=29 |
| prop tip-to-tip gap ≥ 8 mm | PASS | min 11.1 mm |
| guard-to-guard gap ≥ 2 mm | PASS | min 4.1 mm |
| wheelbase 145–168 mm (parts list §4 target 150–160) | PASS | 157.0 mm |
| motor leads ≤ 150 mm (swept route) | PASS | longest 81 mm |
| front props outside the O4 155° FOV cone | **FAIL** | nearest prop point 25° off the camera axis |
| no prop strike (exact intersection) | PASS | 0.0 mm³ of solids inside a prop |
| no unexpected interference | PASS | clean |
| ≥ 3 mm clearance around every prop disc (incl. wires) | PASS | clear |
| RF keep-outs free (GPS sky view, RX antenna tip) | PASS | clear |
| AUW ≤ 250 g soft cap | PASS | 231 g |
| arm SF ≥ 2 at max thrust (exact section) | PASS | SF 87.1 |
| ESC ΔT < 60 °C at 50 % throttle | PASS | ΔT 16 °C |
| gust 5 m/s: roll excursion < 10° with BF defaults | PASS | 0.1°, drift 2.37 m |
| print/frame-bottom.stl prints cleanly | PASS | 16.9 g, 56m 13s (OrcaSlicer) |
| print/frame-top.stl prints cleanly | PASS | 8.1 g, 20m 43s (OrcaSlicer) |
| print/guard.stl prints cleanly | PASS | 7.5 g, 34m 53s (OrcaSlicer); print with supports under 210 mm² of overhang (3.0 %) |
| print/camera-plate.stl prints cleanly | PASS | 0.7 g, 4m 57s (OrcaSlicer) |
| FEA SF ≥ 2 at max thrust (p99 basis) | PASS | max 70.5 MPa (SF 7.1), p99 8.8 MPa |
| first arm mode vs the idle→hover motor band (FEA) | NOTE | 198 Hz = 11856 rpm vs idle 80 Hz – hover 259 Hz — crossed on every spool-up; expect gyro noise there, keep Betaflight RPM filtering on; stiffer arms (truss / CF) push it up |

By-design contacts (fasteners, spokes on pads, wires on pads, hub on shaft): 1278 mm³ in 41 pairs.

### Wire routes (swept)

| Wire | Length (mm) | Ø (mm) | Mass (g) |
|---|---:|---:|---:|
| Motor 1 leads (3× 22 AWG) | 65 | 2.4 | 0.47 |
| Motor 2 leads (3× 22 AWG) | 81 | 2.4 | 0.59 |
| Motor 3 leads (3× 22 AWG) | 65 | 2.4 | 0.47 |
| Motor 4 leads (3× 22 AWG) | 81 | 2.4 | 0.59 |
| Battery leads (2× 14 AWG) | 20 | 3.0 | 0.23 |
| RX harness (4 wires) | 60 | 1.6 | 0.19 |

## Mass and balance (from the solids)

**AUW 230.9 g** · frame + guards 68.8 g · by kind {'frame': 43.0, 'electronics': 67.9, 'hardware': 18.5, 'prop': 7.2, 'guard': 26.0, 'battery': 66, 'wire': 2.6} · CG (-1.1, 0.0, 23.7) mm · CG **2.2 mm above the prop plane** (z 21.5).

Voxel model: AUW 232.5 g, frame + guards 70.4 g, CG z 22.5 mm.

| Component | Mass (g) | Volume (mm³) | Source |
|---|---:|---:|---|
| Frame bottom + arms | 29.4 | 18355 | 18355 mm³ × 1.6 × 1.0 |
| Frame top plate | 13.6 | 8473 | 8473 mm³ × 1.6 × 1.0 |
| ESC 45A 4-in-1 | 7.0 | 5811 | BOM |
| FC F722 | 9.9 | 3514 | BOM |
| DJI O4 Air Unit | 5.2 | 5271 | BOM |
| DJI O4 camera | 3.0 | 2606 | BOM |
| Standoff 1 | 1.5 | 283 | BOM |
| Standoff 2 | 1.5 | 283 | BOM |
| Standoff 3 | 1.5 | 283 | BOM |
| Standoff 4 | 1.5 | 283 | BOM |
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
| Battery strap | 3.0 | 1440 | BOM |
| BeeID GPS + Remote ID | 5.2 | 2816 | BOM |
| ELRS RX | 0.8 | 1152 | BOM |
| Capacitor (low-ESR, on BAT pads) | 3.0 | 603 | BOM |
| Wire: Motor 1 leads (3× 22 AWG) | 0.5 | 296 | swept volume × 1.6 g/cm³ |
| Wire: Motor 2 leads (3× 22 AWG) | 0.6 | 366 | swept volume × 1.6 g/cm³ |
| Wire: Motor 3 leads (3× 22 AWG) | 0.5 | 296 | swept volume × 1.6 g/cm³ |
| Wire: Motor 4 leads (3× 22 AWG) | 0.6 | 366 | swept volume × 1.6 g/cm³ |
| Wire: Battery leads (2× 14 AWG) | 0.2 | 142 | swept volume × 1.6 g/cm³ |
| Wire: RX harness (4 wires) | 0.2 | 121 | swept volume × 1.6 g/cm³ |
| XT30 pigtail | 6.5 | 1152 | BOM |

Inertia about the CG (kg·m²): Ixx 3.96e-04 · Iyy 4.29e-04 · Izz 6.86e-04 · Ixz 7.0e-06

## Propulsion

| Item | Value |
|---|---|
| Model | Ct/Cp model; swap in thrust-stand numbers via the override fields in bom.json |
| Thrust-to-weight | 6.6 |
| Hover | 39 % rpm, 3.8 A → 13 min on 1000 mAh |
| Max thrust / current per motor | 382 g / 13.5 A |

## Structure

### Arm section (exact, from the solid)

| Station | From root (mm) | Area (mm²) | I (mm⁴) | c (mm) |
|---|---:|---:|---:|---:|
| 0.15 | 8.7 | 44.0 | 58.4 | 2.0 |
| 0.50 | 28.9 | 40.0 | 53.5 | 2.0 |
| 0.85 | 49.2 | 40.0 | 53.5 | 2.0 |

Beam check at the weakest station:

| Load | Force (N) | Stress (MPa) | SF flat print | SF standing print |
|---|---:|---:|---:|---:|
| max thrust | 3.7 | 5.7 | 87.1 | 87.1 |
| crash 5 g on the arm tip | 11.3 | 17.4 | 28.8 | 28.8 |
| crash 10 g | 22.7 | 34.7 | 14.4 | 14.4 |
| crash 20 g | 45.3 | 69.4 | 7.2 | 7.2 |

Tip deflection at max thrust 0.12 mm · first bending mode (beam) 254 Hz vs prop 259 Hz at hover / 667 Hz max.

### FEA — bottom frame (12277 tet10, 70092 free DOF, 4.0 mm mesh, 15 s)

| Case | Max von Mises (MPa) | p99 (MPa) | SF (p99) | Max displacement (mm) | Hotspot (mm) |
|---|---:|---:|---:|---:|---|
| max thrust on all motors | 70.5 | 8.8 | 57.0 | 0.15 | [-46.4, 42.6, 1.8] |
| 10 g vertical crash on one arm tip | 196.7 | 47.2 | 10.6 | 0.90 | [22.9, -16.8, 1.7] |
| 10 g lateral crash on one arm tip | 169.6 | 13.7 | 36.5 | 0.13 | [22.9, -16.8, 1.7] |

First modes with motors, props and guards lumped on the pads: 198 Hz, 198 Hz, 272 Hz. Max von Mises includes the clamp-edge singularity at the standoffs (hotspot column); the p99 value is the design number. Linear elastic tet10; clamped at the stack footprint; loads spread over pad top nodes; lumped masses for modes. Layer adhesion not modelled — multiply SF by the material's layer_factor for standing prints.

## Flight dynamics

| Item | Fixed-gain reference sim | Betaflight-default PID sim |
|---|---|---|
| Static hover thrust M1–M4 (g) | 62.1 / 53.4 / 62.1 / 53.4 | — |
| 15° roll step peak | 15.2° | 15.0° |
| Return to < 1° | 0.41 s | 0.54 s |
| Side gust 5 m/s: roll peak / drift | — | 0.1° / 2.37 m |
| Motor saturation | 0.0 % | 0.0 % |

Betaflight 4.5 default PIDs (angle mode), 4 kHz loop, D-term LPF 100 Hz. Gust drag acts 22 mm from the CG (battery centroid), CdA 44 cm². Rate PID in BF units (pidSum/1000 → motor fraction); thrust ∝ command²; 20 ms motor lag; side gust from the right at 3.5 s.

## ESC thermal

| Condition | ESC loss (W) | ΔT (°C) | OK |
|---|---:|---:|---|
| hover | 1.0 | 15 | yes |
| 50 % throttle | 1.1 | 16 | yes |

Lumped estimate: Rds(on) 10 mΩ/leg + 0.25 W switching per channel; h = 35 W/m²K in prop wash, 15 W/m²K behind lattice keel walls. ΔT < 60 °C keeps FETs under 100 °C at 40 °C ambient.

## Manufacturability (printed parts)

| Part | Volume (mm³) | Solidity est. | Filament (g) | Time est. (min) | Overhang > 45° | Thin walls | Small holes | Flags |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frame-bottom | 18355 | 0.61 | 17.9 (slicer 16.9) | 61 (slicer 56m 13s) | 0.2 % | 0.0 % | 0 | ok |
| frame-top | 8473 | 0.56 | 7.6 (slicer 8.1) | 25 (slicer 20m 43s) | 0.0 % | 0.0 % | 0 | ok |
| guard | 6293 | 0.96 | 7.3 (slicer 7.5) | 36 (slicer 34m 53s) | 3.0 % | 0.0 % | 0 | print with supports under 210 mm² of overhang (3.0 %) |
| camera-plate | 456 | 1.00 | 0.7 (slicer 0.7) | 10 (slicer 4m 57s) | 0.4 % | 0.0 % | 0 | ok |

Mass model vs print model: `print_solidity` 1.0 in bom.json (used for the mass table) vs 0.61 estimated for these slicer settings — the frame will weigh between 18 g and 29 g depending on infill; the slicer says 16.9 g; calibrate with the first test print.

Estimates assume 0.4 mm nozzle, 0.2 mm layers, 3 perimeters, 4 top/bottom layers, 30 % infill, ~3.5 mm³/s effective flow.
Slicer figures in parentheses are from OrcaSlicer with profile `Custom:MyKlipper 0.4 nozzle / 0.20mm Standard @MyKlipper / Generic PA-CF @System` and the same walls/infill/layers; set `DRONECAD_ORCA_MACHINE="Vendor:Machine name"` to slice for your printer.
