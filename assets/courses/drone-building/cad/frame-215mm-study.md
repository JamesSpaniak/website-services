# 215 mm frame study — can the Tony 5 be the Base frame?

**Date:** Sep 18 2026 · **Tool:** `dronecad` 0.3.0 (`scripts/dronecad/`) · **Author:** ours
**Decision record for:** [parts list v4 § 7a](../reference/parts-list-draft-v4.md) (Tony 5 / Video parked, Sep 12) and
[outline v3.4 § 2](../outlines/drone-building-course-outline-v3.md) (Airframe = 3.5")
**Prompted by:** [`build-steps-joe-v1.md`](../reference/build-steps-joe-v1.md) — Joe's Sep 12 build was written on a Tony 5.

Repo `bom.json` and `variants.json` were **not modified**. Every run used a scratch kit directory
via `dronecad build -k`, so nothing in `generated/` was overwritten.

---

## 1. The question

Parts v4 § 7a parked the FlyFishRC Tony 5 on three grounds: 3.5" props do not fill a 215 mm
wheelbase; 5" props overheat the 1404 4500KV; a real 5" kit is a different BOM. Joe then built
the v4 electronics on a Tony 5 anyway, and the frame was reproposed as the Base frame on the
grounds that it is light, roomy and easier to work on.

Two separable questions:

- **Q1.** Does the **current 3.5" powertrain** work on a 215 mm frame?
- **Q2.** Does a **real 5" powertrain** work on this kit?

## 2. Verdict

**Q1 — yes.** 228.7 g (under the 250 g soft cap), thrust/weight 6.68 vs the baseline's 7.00,
FEA safety factor and first mode both far better, ESC 16 °C over ambient. 17 of 18 checks pass;
the one failure is our own wheelbase *target* (145–168 mm), a policy number, not physics.

**Q2 — no, on four independent counts.** Over the weight cap by 43–64 g; motor power limit
exceeded; the 45 A matched stack undersized by 2.3–2.6×; guards and props foul the frame.
Moving to 5" replaces the stack, guards, frame geometry and charger at once — a different kit,
which is what parts v4 § 7a concluded without numbers.

**Consequence:** the configuration that passes is a **215 mm frame with the existing 3.5"
powertrain**. Tier B (student-printed frame) survives at 215 mm with a measurable but modest
cost — see § 5.3.

---

## 3. What was modelled

Six variants. All share the v4 electronics unless the row says otherwise. 215 mm True-X puts the
motors at (±76.0, ±76.0) mm — wheelbase = 2·a·√2, checked against the baseline (2 × 53 × √2 =
149.9 mm, which is what the baseline reports).

| Variant | Frame | Wheelbase | Powertrain | Purpose |
|---|---|---|---|---|
| `base-truss` | printed PETG truss | 149.9 mm | 1404 4500KV · 3525 · 3S | **Baseline.** Re-run this session, not quoted from the Sep 12 build |
| `tony5-asis` | CF stand-in | 215 mm | unchanged | **Q1.** Tony 5 with the parts we already own |
| `printed-215` | printed PETG truss | 215 mm | unchanged | Tier B at 5" scale — can students still print it? |
| `tony5-5in` | CF stand-in | 215 mm | **5" props on the 1404** | The parts v4 "do not" case, quantified |
| `5in-4s` | CF stand-in | 215 mm | **2004-class · 5" tri · 4S 650** | **Q2.** Keeps the M4AC charger (1–4S) |
| `5in-6s` | CF stand-in | 215 mm | **2004-class · 5" bi · 6S 380** | **Q2.** FlyFish's own published Tony 5 sub-250 config |

**The CF variants are geometry stand-ins**, not the Tony 5's STEP file: 215 mm True-X, 4 mm CF
arms, 2 mm plates, 24 mm standoffs. They carry the Tony 5's published wheelbase and material but
not its actual plate shapes. The same convention the repo already uses for `video-x`.

## 4. Input provenance

This is the part that decides how much weight the numbers carry.

| Input | Status | Note |
|---|---|---|
| FC 9.9 g, motor 9.2 g, 12×12 M2, 150 mm leads, prop 1.8 g, pack 66 g / 58 × 24.5 × 23.5, stack 15.7 mm | **Verified** | From parts v4 § 1 desk check |
| ESC 7 g, pad positions | Estimate | Assembled stack minus FC; pad layout a stand-in |
| Material E / strength / Tg | Typical FDM datasheet values | `bom.json` § materials; fine for comparison, not for certification |
| Thrust and current | **Ct/Cp first-principles model** (Ct 0.11, Cp 0.055) | **No thrust stand has been run.** `cad/thrust-stand.csv` is still the open TODO |
| Tony 5 wheelbase 215 mm, 5" props, 57 g, 12×12 M2 motors, 20×20/25.5 **M3** stack | Vendor spec | parts v4 § 7a, from FlyFishRC |
| 2004 motor 20 g / Ø25.5 × 19, 330 W limit; 5" prop 4.5 g tri / 3.5 g bi; 4S 650 78 g; 6S 380 62 g | **PLACEHOLDER** | **No 5" motor or pack has been chosen.** Chosen to be plausible and slightly generous to the 5" case |

The Q2 verdict does not rest on the placeholder precision — see § 5.4.

---

## 5. Results

All figures from `cad.json` of each run. Check counts are from the 18-check exact-CAD report
(`cad-report.md`), consistently across variants.

### 5.1 Q1 — 3.5" powertrain at 215 mm

| | `base-truss` 150 mm | `tony5-asis` 215 mm CF | `printed-215` 215 mm PETG |
|---|---|---|---|
| **Checks** | **18/18** | **17/18** | **17/18** |
| AUW | 218.1 g | **228.7 g** | 224.8 g |
| Frame + guards (modelled solid) | 64.2 g | 74.8 g | 70.9 g |
| Thrust/weight | 7.00 | 6.68 | 6.79 |
| Hover throttle | 38 % | 39 % | 38 % |
| Current per motor at WOT | 13.5 A | 13.5 A | 13.5 A |
| Motor power | 154 W of 225 W | 154 W of 225 W | 154 W of 225 W |
| ESC at WOT | 54 A total vs 45 A/motor | same | same |
| ESC ΔT at 50 % | 38 °C (enclosed) | **16 °C** | 38 °C (enclosed) |
| FEA SF (p99) thrust / crash | 8.9 / 2.3 | **39.1 / 7.7** | 6.3 / **1.7** |
| First arm mode | 82 Hz | **127 Hz** | 40 Hz |
| Gust 5 m/s roll / drift | 0.1° / 2.49 m | 0.1° / 2.39 m | 0.1° / 2.78 m |
| Prop tip-to-tip gap | 17.1 mm | 63.1 mm | 63.1 mm |
| Only failing check | — | wheelbase target | wheelbase target |

Notes that matter:

- **The wheelbase "FAIL" is ours.** The check is `wheelbase 145–168 mm`, written into
  `checks.py` from the parts-list § 4 target of 150–160 mm. It is a design intent we chose, not a
  physical limit. If 215 mm is adopted the check bound moves with it.
- **63.1 mm of dead span** between prop tips is parts v4 § 7a's "props do not fill the frame"
  objection, quantified. It costs nothing measurable here.
- **The wind argument does not appear.** Parts v4 predicted "extra arm length catches wind
  without extra disc". The Betaflight-PID gust sim gives 0.1° roll excursion on every variant and
  drift within 0.4 m. Either the effect is below what this sim resolves, or it is not there.
- **`tony5-asis` ESC runs 16 °C over ambient vs 38 °C** for the printed frames, because the
  thermal model treats a printed frame as enclosed and a CF plate as open.
- **First mode 127 Hz (CF) vs 40 Hz (printed 215 mm).** 40 Hz = 2390 rpm sits *below* the 80 Hz
  idle, so it is not excited in flight and the check passes — but it is a softer frame that will
  ring under handling and crashes.

### 5.2 Q2 — real 5" powertrain

| | `tony5-asis` (3.5") | `tony5-5in` (5" on the 1404) | `5in-4s` | `5in-6s` |
|---|---|---|---|---|
| **Checks** | **17/18** | 15/18 | **14/18** | **14/18** |
| AUW | 228.7 g ✓ | 251.7 g ✗ | **313.7 g ✗** | **292.7 g ✗** |
| Motor power | 154 W of 225 | **917 W of 225 ✗** | **444 W of 330 ✗** | **597 W of 330 ✗** |
| Current per motor | 13.5 A | **80.4 A** | 29.2 A | 26.2 A |
| ESC at WOT vs 45 A | 54 A total | **322 A ✗** | **117 A ✗** | **105 A ✗** |
| ESC ΔT at 50 % | 16 °C | **73 °C ✗** (limit 60) | 22 °C | 21 °C |
| Motors ↔ guards | clear | clear | **foul, 205 mm³ ×4 ✗** | **foul ✗** |
| Props ↔ top plate | clear | clear | **0.0 mm ✗** | **0.0 mm ✗** |
| Guard mass | 26.0 g | 38.0 g | 44.2 g | 44.2 g |

`tony5-5in` reports thrust/weight 25.3 — that is the Ct/Cp model extrapolating a 5" disc at 1404
rpm, which the motor cannot deliver. **It is a visible model breakdown, and it is reported here
rather than hidden**; the trustworthy numbers in that column are the current, power and thermal
figures, all of which fail. The column's purpose is to show *why* you cannot simply fit 5" props.

For `5in-4s` / `5in-6s` the four failures are independent of each other:

1. **Weight.** 43–64 g over the cap, before a camera and with the cap already soft. FlyFish
   reached 248.7 g with an AIO board, bi-blades, **no guards and no Remote ID module**. Our
   stack (17 g vs an AIO ~7 g), guards (44 g) and BeeID (5 g) account for the gap.
2. **ESC.** 105–117 A at WOT against a 45 A/motor ESC. The Flywoo F722 Mini V2 stack is the part
   that *closed* the FC↔ESC pinout question in v4; a 5" powertrain retires it and reopens that.
3. **Guards.** `motor_pad_r` 12 was set to clear the 1404's Ø20.5 flange; a 2004 bell is Ø25.5,
   so the spokes intersect all four motors.
4. **Geometry.** 5" discs reach the top plate at this layout.

### 5.3 Tier B at 215 mm — the printing cost

Slicer figures (OrcaSlicer CLI, generic 0.4 mm, 3 walls / 30 % infill), like-for-like from this
session:

| Part | `base-truss` 150 mm | `printed-215` | Δ |
|---|---|---|---|
| Bottom plate | 24.9 g · 1 h 24 m · supports under 7.5 % | 32.5 g · 1 h 45 m · supports under 10.2 % | **+31 % mass, +25 % time** |
| Top plate | 11.8 g · 24 m 41 s | 11.8 g · 24 m 41 s | — |
| Guard (×4) | 7.5 g · 34 m 55 s | 7.5 g · 34 m 55 s | — |
| **Per frame** | **44.2 g · ≈ 2 h 24 m** | **51.8 g · ≈ 2 h 45 m** | **+17 %** |

For a class of ten that is roughly **24 h → 27 h** of printer time. Supports were already
required at 150 mm, so they are not a new failure mode — the overhang share grows from 7.5 % to
10.2 %.

### 5.4 Why the placeholder parts do not undermine Q2

The Q2 failures are not close calls and do not depend on the placeholder values:

- To reach the 250 g cap, `5in-4s` would have to lose **64 g** — more than its entire battery
  (78 g) minus a plausible lighter one, or all four motors' worth of the 2004-vs-1404 delta.
- The ESC overload is 2.3–2.6×, not 10 %.
- Guard fouling and prop-to-plate contact are **geometric**, driven by 5" disc diameter and
  2004 bell diameter. No mass or KV choice changes them.

A different 2004 or a smaller pack shifts these numbers. None of them flips a verdict.

---

## 6. How it was checked

Six things, in descending order of how much they constrain the result.

**1. The baseline was re-run in this session, not quoted.**
`base-truss` was rebuilt from a copy of the repo's own `bom.json` + `variants.json` and
reproduced the Sep 12 published figures exactly: AUW 218.1 g, T/W 7.00, FEA SF 8.9 / 2.3, first
mode 82 Hz, 18/18 checks. So the toolchain is deterministic on this machine and every comparison
below is like-for-like rather than across tool versions.

**2. The framework's own validation, from `cad/README.md` § method.**
The FEA is checked against a cantilever with a closed-form answer — deflection and first mode
within 15 %, and an analytic 12 × 4 mm arm at 51 Hz against 52 Hz from the solver. The exact
B-rep mass properties agree with the independent voxel generator within 2 g on the base kit.
Two generators sharing inputs but not geometry code agreeing is a real cross-check.

**3. Geometry is checked by exact intersection, not by eye.**
Fit checks are pairwise B-rep intersection volumes against a by-design whitelist (fasteners,
guard spokes on pads, wires on pads, hub on shaft). The guard-fouling and prop-to-plate failures
in `5in-4s` are reported as volumes and distances — 205 mm³, 0.0 mm — not as impressions. This is
also why they are credible despite placeholder masses: they are driven by diameters.

**4. Against an external anchor.**
FlyFish publishes 248.7 g for a Tony 5 sub-250 build (2004 + 5" bi-blade + 6S 380 mAh + AIO).
`5in-6s` models the same powertrain and returns 292.7 g. The 44 g gap is accounted for by parts
FlyFish's build does not carry: guards 44.2 g, BeeID 5 g, and a stack instead of an AIO (≈ +10 g),
less their heavier pack allowance. Agreement *after* explaining the difference is stronger
evidence than a matching number would be.

**5. Internal consistency.**
Mass by kind sums to AUW in every run (e.g. `tony5-asis` frame 48.9 + guard 26.0 = 74.9 g
frame+guards). The 215 mm motor offset was derived (215 / 2√2 = 76.0) and confirmed by the
baseline's own reported 149.9 mm from ±53. The three 3.5" variants return identical current,
power and ESC figures, as they must — they differ only in frame.

**6. What was *not* checked.**
- **Nothing has been printed or flown.** No part of this has physical confirmation.
- **No thrust stand.** All thrust and current come from the Ct/Cp model. `cad/thrust-stand.csv`
  remains the open TODO, and it is the single input that would most change § 5.2.
- **The CF variants are not the Tony 5.** Published wheelbase and material, generic plates. Its
  real plate shapes, cutouts and the 5-standoff layout are not modelled.
- **Stack mounting is not modelled.** Tony 5's stack pattern is 20×20 **M3**; ours is 20×20
  **M2**. That 1 mm of slop is question P4 to Joe, and no run here addresses it.
- **FEA is linear-elastic**, single load cases (max thrust, 10 g vertical crash on one arm tip,
  10 g lateral), reported on a p99 basis because the max sits on a clamp-edge singularity. It
  does not model layer adhesion, print defects or repeated impact.
- **The thermal model** distinguishes "enclosed" (printed) from open (CF) crudely; the 16 °C vs
  38 °C split between `tony5-asis` and `printed-215` is that switch, not a measurement.

## 7. What would change the conclusion

| Finding | Would flip if |
|---|---|
| Q1 passes | A thrust stand shows real 1404 current well above the modelled 13.5 A/motor, or the real Tony 5 plate geometry conflicts with the 20×20 M2 stack (P4) |
| Q2 fails on weight | An AIO replaced the stack *and* guards were dropped — i.e. a different course, since guards are a locked safety decision |
| Q2 fails on ESC | A larger ESC is adopted, which reopens the FC↔ESC pinout question closed in v4 |
| Tier B viable at 215 mm | A test print shows `print_solidity` is badly off, or crash SF 1.7 proves inadequate in a real crash |

## 8. Reproduce

Scratch kits are session-local and not committed. To rebuild:

```bash
# baseline, from a copy of the repo kit
mkdir -p /tmp/kit-baseline && cp assets/courses/drone-building/cad/{bom,variants}.json /tmp/kit-baseline/
cd scripts && .venv-cad/bin/python -m dronecad build -k /tmp/kit-baseline -v base-truss --fea-size 4
```

For the 215 mm variants: copy the same pair, set `front: [76.0, 76.0]` / `rear: [-76.0, 76.0]`,
and for the CF stand-ins add `material: CF`, `arm_thickness: 4`, `arm_width: 10`,
`plate_thickness: 2`. For the 5" powertrains override `components.motor`, `components.prop`,
`components.battery` and `propulsion` (`kv`, `cells`, `prop_diameter_in`, `blades`,
`motor_max_power_w`) as recorded in § 4. Each run is 40–55 s at `--fea-size 4`.

## 9. Corrections to earlier statements

Recorded because they were circulated before this report:

1. A printed 215 mm frame was estimated at crash SF 0.9–1.1. **It is 1.7** — marginal against
   the baseline's 2.3, not failing.
2. The printing cost was stated as roughly doubling (8 h → 17 h for a class of ten). That
   compared against the low end of a README range across variants. Like-for-like it is
   **+25 % on the bottom plate, +17 % per frame** — about 24 h → 27 h for ten.
3. Frame mass was compared as 74.8 g (CF) against "35–45 g" printed. Those are different
   quantities — modelled solid mass against sliced print mass. Like-for-like modelled:
   **74.8 g CF vs 64.2 g printed**.
