# Drone building — CAD / manufacture / sim extensions

**Status:** Research note, Sep 16 2026. Does **not** change the v3.4 outline, parts list v4, or `dronecad` outputs. Continue from here when extending the frame pipeline or Unit 5 / Unit 8. Canonical how-to remains [`../cad/README.md`](../cad/README.md). Course 2 (repair) stays a proposal in [`soldering-lab.md`](soldering-lab.md) § 6.

Prices and competitor list prices are street/list snapshots from mid-Sep 2026, pre-tax. Items marked *verify* are estimates.

---

## 1. What we already have

`scripts/dronecad` is a kit-agnostic CLI. A variant in `cad/variants.json` plus `cad/bom.json` produces B-rep geometry, interference / keep-out / prop-shell checks, mass–CG–inertia, section beam check, tet10 FEA, a Betaflight-default PID + gust sim (CSV, not visual), ESC thermal, and OrcaSlicer print figures. Students and Onshape still consume STEP / STL; the framework is the pre-print gate.

Installed on the dev Mac (Sep 14–15): OrcaSlicer 2.4, FreeCAD 1.0, OCP CAD Viewer. The Fusion Sep 11 print is `cad/reference/fusion-frame-20260911.stl` and the `reference-fusion` variant (kit parts on that mesh; 3.5" props pass 2 mm from its deck posts — do not ship that mesh as the stock frame).

**Not modelled:** prop wash, battery sag, print tolerances, layer anisotropy in FEA, CFD, a student-facing stick sim, CNC plates, a canopy.

---

## 2. Manufacture: print first, CNC later

### 2.1 Machines

| | FDM (school / friend) | Resin (e.g. Anycubic Photon D2) | Desktop CNC router |
|---|---|---|---|
| Role for this kit | First-flight frame + guards + canopy | Wrong tool (brittle, toxic, tiny bed) | End-of-year / race-spec plates |
| Classroom | Common; 0.4 mm nozzle, ≥180 mm bed | No | CTE shop only (dust, CAM, bits) |
| Run cost, `base-x` bottom | ~18 g PETG, ~45 min, **~$0.40** plastic + pennies of power (Orca, generic 0.4 mm) | — | Sheet + bit wear; mail-order CF plate ~$12–25 *verify* |

**PETG** is polyethylene terephthalate glycol (water-bottle family, glycol so it prints). Default in `bom.json`: 1.27 g/cm³, Tg 80 °C (PLA is 60 °C — a sun-parked PLA frame warps), tougher than PLA, ~$20–25/kg. TPU 95A is the guard / canopy plastic. `CF` in the materials table is **sheet**, not filled filament.

A printed PETG airframe is ~10–30× less stiff than CNC carbon (E ≈ 2.1 GPa vs ~60 GPa) and crash SF ~1 at 10 g on solid arms. It still hovers. For a hobbyist / first semester that is acceptable; for a season of racing it is not. Schools care more about overnight reprint than 30× stiffness.

### 2.2 CNC compatibility of the current model

**Not CNC-ready as-is.** `base-x` / `base-truss` / keel are 3D solids (vertical webs, printed pads). A router cuts flat sheet. The Fusion reference is closer to stacked plates. Iterating toward CNC means **designing 2–3 flat outlines + standoffs with the same hole pattern**, then optionally printing a 3D first-flight body on that pattern — not projecting a truss onto a plane and calling it a plate.

`build123d` already has `ExportDXF`. Emitting layered DXF (outer / drill / pocket) plus a hole table and cut-area report is a bounded `dronecad` job (~a day). That is the analog of `print/*.stl`.

**CAM (DXF → G-code) is the automation blocker.** Orca works because a slicer is a closed loop with bundled profiles. Estlcam, Carbide Create, and Fusion CAM are GUIs (no useful brew CLI). FreeCAD Path / `ocp-freecad-cam` need FreeCAD’s Python (typically 3.11), not `.venv-cad` (3.14). A generic “carbon on any 3018” profile is unsafe. Do **not** auto-emit run-this-anywhere G-code.

Automatable CAM-adjacent work:

1. DXF + cut report (area, min web, estimated minutes on a *declared* bit).
2. Quote path: same DXF to a cut service (they own CAM).
3. Later: one named school-shop preset if a partner gives a tool table.

### 2.3 Kit story (locked direction until a shop exists)

- **Most of the year / first flights:** PETG plates or unibody + TPU guards on any current FDM. Same holes as the eventual CNC plates. Crash → reprint.
- **End of year / race spec:** flatten, emit DXF, cut 2–3 mm carbon or G10 (CTE router or mail-order).
- **Visual-only skins:** printed, never CNC (see § 3).

---

## 3. Visual plating (canopy)

The part that hides the stack and wires is a **canopy** (body kit / fairing / top shell). It is not structure and is not a CNC job. A flat carbon top plate still leaves the FC/ESC visible from the sides.

| Material | How | Use |
|---|---|---|
| **TPU 95A** | Same FDM as the frame | Industry default; flexes in a crash; ~8–15 g *verify* |
| Nylon | Printed | Stiffer, dyeable |
| Polycarbonate | Vacuum-formed | Commercial clear/tinted shells |
| PET (soda bottle) | Cut / heat-form | Cheap classroom demo; same family as PETG |
| Painted PETG / PLA | Printed | Looks finished; PLA cracks on impact |
| CF veneer 0.3–0.5 mm | Decorative sheet | Carbon *look* only; still needs a shell |
| Carbon top plate | CNC | Structural lid, not a hide |

Next CAD part when we want “looks finished”: a third `print/` body (TPU canopy) generated from the same stack envelope as the top plate.

---

## 4. Packaged-kit market (pricing context)

Hobby retail is roughly keystone (2× wholesale). STEM/education kits target landed COGS ~35–45% of list (≈1.8–2.9× on components + kitting). Curriculum-bundled class packs run higher: Pitsco Infinity ~$499/kit *verify*; Five33 Level 1 $2,790 / 4 students; Drone Legends FPV Initiator $6,499–$12,500; PCS Discover Drones $8,995 / 25 students. Hardware is often 20–40% of that list; the rest is curriculum, standards mapping, teacher support, league.

Our Base aircraft is **~$275 retail parts** (parts list v4); class-of-10 hardware ~$3,800. A school-facing sell of $499–$1,500/student with curriculum is the fair fight against those packs — compare **quoted kit + seats**, never BOM to their list ([`docs/sales/competitor-analysis.md`](../../../docs/sales/competitor-analysis.md) § 12). Printed frames are a margin lever: the school makes the wear part for ~$1 of PETG; we sell electronics + files + curriculum + spares, not a $55 CF SKU and its breakage returns.

Gap we occupy: almost no education kit has students **design and print** the airframe with parametric checks. Competitors are toy whoops or pre-built carbon. `dronecad` + printed frame + FAA/Remote ID is that hole. Do not invent pass rates or school counts from this note.

---

## 5. Simulation: share the plant, not the brain

### 5.1 Overlap

```
variants.json + bom.json
        →  build123d (.venv-cad)     source of truth for geometry
        →  cad.json + assembly.glb / STEP / STL
              ├── FreeCAD     view / measure / later CAM (do not fork geometry here)
              ├── Isaac Lab   USD + mass/I/motors → optional RL policy
              └── BF SITL     same mass/I/motors + real firmware → stick test
```

The shared artifact is a **plant card**: mass, CG, inertia, motor XYZ, spin, max thrust, mesh. Isaac trains a neural net. Betaflight is PID + mixer + filters on the F722. Those are two pilots. There is **no stock Isaac Lab → Betaflight SITL bridge**. Stacks that look similar (Pegasus, Isaac drone-racing) talk to **PX4 / ArduPilot**, or they train in a fast NumPy plant and only validate the mesh in Isaac.

| Shared | Not shared |
|---|---|
| Mesh, hole pattern, wheelbase | Isaac weights ≠ BF `pid` / `filter` / `mixer` |
| Mass, CG, Ixx/Iyy/Izz | Obs/action spaces |
| Motor sites, CW/CCW, thrust limits | Coordinates (Isaac ENU/FLU vs BF NED/FRD) |
| Optional simplified collision mesh | Isaac cameras ≠ BF gyro/OSD |

### 5.2 Two pipelines (do not mix the promise)

**A — This course (default).** Build in `.venv-cad`. Dump the plant. Fly **Betaflight SITL**. Flash the same firmware to the GOKU F722. Isaac is optional later for camera/contact, not for the student brain.

**B — Research brain.** Same plant → Isaac PPO → ONNX on a companion computer, or PX4 Offboard. Does **not** replace Betaflight on this kit. Distilling a policy into PID gains is a paper, not a week of glue.

Isaac’s stock quad is a rigid brick with four force arrows. It will not reuse FEA, print checks, or truss webs. Soft PETG arms in PhysX are research-grade, not the Crazyflie example.

### 5.3 Effort rungs

| Rung | What | Effort | Course fit |
|---|---|---|---|
| 0 | Existing BF-default PID + gust CSV | Done | Unit 4/5 design check |
| 1 | Drive `assembly.glb` in `viewer.html` with the same equations + gamepad | ~2–4 days | “See your CG fly” in Unit 5 |
| 2 | Godot / Three.js + `cad.json` plant, floor + gates | ~1–2 weeks playable | Classroom demo; stick feel still toy |
| 3 | `plant.json` + tiny URDF → **Betaflight SITL** + Configurator + Blackbox | ~3–5 days to a logged hover | **Unit 8 gate that matches the kit** |
| 4 | Isaac Crazyflie example → swap our mesh/inertias, train hover | 1–2 days install + 1–2 weeks hover policy | Course 2 / club / vision unit; CUDA box; second Python, not `.venv-cad` |
| 5 | Isaac policy on the real F722 | Months / different stack | Do not promise |

Commercial FPV sims (Velocidrone, Liftoff, Uncrashed) are the Unit 8 **stick-time** pick already on the backlog — they will not import this exact CAD. Use them for proficiency; use SITL when the question is “does *our* inertia and mixer fly.”

---

## 6. Course extensions (not locked)

Do not rewrite v3.4 until a rung ships. Hooks only:

| Unit / SKU | Possible add | Depends on |
|---|---|---|
| **Unit 5** | `dronecad` report as a critique artifact (fit / FEA SF / print time) next to Onshape; optional viewer-fly of their STL once rung 1 exists | Stock-frame decision; test print |
| **Unit 5** | Material-profile row already planned; add “print vs CNC plate” as a *compare* leaf, not a shop requirement | DXF exporter optional |
| **Unit 5** | TPU canopy as a Tier A part (Video / short time) | Canopy solid in `frame.py` |
| **Unit 8** | Third-party sim proficiency gate (Velocidrone / Liftoff / RealFlight — pick in TODO) **before** maiden; crew roles already listed | Sales/competitor § 12; radio trainer SOP |
| **Unit 8** | Optional teacher/demo: BF SITL of the *stock* plant (not student laptops) | Rung 3 |
| **Print-and-ship** | Still PETG; DXF is a later “race plate” SKU, not the default ship | Outline print-and-ship design (open) |
| **Course 2** | CNC plates, canopy, Isaac/PX4 vision, repair of crash spares | soldering-lab § 6; v1 sales |

Onshape remains the student CAD (outline locked). `dronecad` stays the pre-print / pre-CNC check, not a second class CAD package.

---

## 7. What to install when

| Tool | Install now? | Role |
|---|---|---|
| `.venv-cad` + Orca + FreeCAD + OCP viewer | Yes (done) | Build / print / inspect |
| Betaflight Configurator + SITL + Blackbox Explorer | **Next**, when we want test flights | Student brain; radio or virtual TX |
| Isaac Lab + Isaac Sim | Only with a CUDA box and a reason that is not “replace PID” | Learned policy or camera gym |
| Pegasus Simulator | Only if Isaac **plus** a real autopilot | That autopilot will be PX4, not BF |
| Estlcam / Carbide / Fusion CAM | No (GUI, machine-specific) | Shop-side after DXF exists |

Do not add a second geometry source of truth in FreeCAD. Do not run Gazebo and Isaac and Godot as three plants.

**Glue worth writing (one exporter):** `plant.json` + `visual.glb` + optional single-link `vehicle.urdf` (four motor sites) from `cad.json`. Isaac, SITL, and the viewer all read that. No tool owns the numbers except the kit JSON.

---

## 8. Continue here (priority)

1. **Stock-frame pick** — `base-x` vs `base-truss`; test-print both bottoms; set `DRONECAD_ORCA_MACHINE`; drop `thrust-stand.csv` when a stand exists. (Already on [`docs/TODO.md`](../../../docs/TODO.md) § Stock-frame CAD.)
2. **Plant exporter** — `dronecad` writes `plant.json` / URDF / keeps `assembly.glb`. Unblocks SITL and any later Isaac swap without forking mass numbers.
3. **DXF plate exporter** — mid-plane section of top + flattened bottom; layers `cut` / `drill` / `pocket`; hole table + cut-area in the CAD report. Design new CNC-ish variants as plates, do not project the truss.
4. **Unit 8 sim pick** — commercial stick-time gate (TODO already); separately, BF SITL on the stock plant for *our* airframe.
5. **Viewer-fly (rung 1)** — only after the plant card exists so the browser and SITL share equations.
6. **TPU canopy print part** — when we want internals hidden without claiming CNC cosmetics.
7. **Isaac Lab** — after 2, and only for a vision / companion-computer experiment. Second Python env.

---

## 9. Claims this note does not make

- Isaac-trained policies will fly the class F722.
- A brew CAM install will slice carbon like Orca slices PETG.
- The Fusion reference mesh is the stock frame.
- Education-kit markups above are audited filings (they are supplier playbooks + public list prices).
- CFD, CalculiX, or soft-body PETG arms are in scope for v1.
