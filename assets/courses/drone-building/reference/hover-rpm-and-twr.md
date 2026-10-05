# Hover RPM vs thrust-to-weight — Unit 4 note

Source material for Unit 4, Sessions 4–5 (drone power). **Status:** to look at. This is not a drafted leaf yet. The numbers are sim estimates from [`cad/generated/base-x/report.md`](../cad/generated/base-x/report.md), not thrust-stand data. Replace them with measured AUW and hover current once Joe weighs and flies a build.

## The question it answers

"With a 5:1 thrust-to-weight ratio, the blades can spin slower." **Only partly true.** Hover RPM is set by the weight each prop carries and by prop size. T/W is the result of those choices. It doesn't cause the blades to slow down.

Terminology: **thrust-to-weight (T/W)** = max thrust ÷ weight. Power-to-weight is W/kg, a different number.

## The math

Thrust from a fixed prop scales with RPM squared (and prop diameter to the 4th):

```
T ∝ n² · D⁴
```

In hover, total thrust = weight. Put max thrust at max RPM next to hover thrust at hover RPM:

```
T_hover / T_max = (n_hover / n_max)²
1 / (T/W)       = (n_hover / n_max)²

n_hover ≈ n_max / √(T/W)
```

Hover throttle (as a fraction of thrust) ≈ 1 / (T/W).

Ideal power to hover (momentum theory) shows why weight and disc area matter more than motor size:

```
P_hover ≈ W^1.5 / √(2 · ρ · A)      A = total prop disc area, ρ ≈ 1.225 kg/m³
```

Halve the disc loading (W/A) and hover power falls by ~30 %. RPM falls too, and so does noise, which scales roughly with tip speed to the 5th–6th power (see [`quiet-drone-research.md`](quiet-drone-research.md)).

## Three ways to raise T/W — only two slow the blades

| How T/W goes up | Hover RPM | Quieter? |
|---|---|---|
| Lighter drone, same motors and props | Drops | Yes |
| Bigger prop, motor sized to turn it | Drops (same thrust at lower RPM) | Yes |
| Hotter motor (more KV / power), same prop and weight | **Unchanged.** It hovers at a lower throttle %, same RPM | No |

## Worked example — our Base kit (sim estimate)

XILO 1404 4500KV · Gemfan 3525 · 3S 1000 mAh · AUW ~218 g.

| Quantity | Value |
|---|---|
| Max thrust | 382 g/motor at ~40,000 rpm → 1528 g total |
| T/W | 1528 / 218 ≈ **7.0 : 1** |
| Predicted hover RPM | 40,000 / √7 ≈ **15,100 rpm** |
| Sim hover RPM | 252 Hz × 60 ≈ 15,100 rpm ✔ |
| Hover thrust fraction | 1/7 ≈ 14 % (sim: 14 %) ✔ |
| Video kit (232 g) | T/W ≈ 6.6, hover ≈ 15,600 rpm |

Takeaway for students: the Base kit is already above 5:1. Swapping to smaller motors to get "only" 5:1, with the same props and weight, leaves hover at ~15,000 rpm. The only effect is less headroom for wind and recoveries.

## Things to look at in class

1. **Hand calc:** students compute hover RPM from the motor chart and their own AUW worksheet, then check it with RPM telemetry (Betaflight bidirectional DShot) on the first hover.
2. **Weight budget:** what does removing 30 g (e.g. thinner guards) do to hover RPM, current and flight time? It ties straight into the Unit 5 AUW budget.
3. **Prop-size trade:** the same calculation with a 4" prop on a lower-KV motor. Why it needs a bigger frame, and why 5" props on a 1404 overheat it ([`parts-list-draft-v4.md`](parts-list-draft-v4.md) §Tony 5).
4. **Compare classes (typical, not measured by us):** consumer camera drones ~2:1, cinewhoops ~3–5:1, 5" freestyle ~8–12:1. Ask why each class picks its ratio.
5. **Optional sim run:** `scripts/build_drone_model.py` with a 4" prop / lower-KV variant to show the hover-RPM drop. Not run yet.
