# Variant comparison — exact CAD (dronecad 0.3.0)

| Variant | Arms | AUW g | Frame+guards g | CG z − prop z (mm) | T/W | Flight min | Beam SF thrust / 10 g | FEA SF thrust / 10 g crash | Mode 1 (Hz) | Gust roll ° | Print g / min | Checks |
|---|---|---:|---:|---:|---:|---:|---|---|---:|---:|---|---|
| `base-x` | solid | 217 | 63 | +1.4 | 7.0 | 16 | 11.9 / 2.1 | 7.1 / 1.6 | 52 | 0.1 | 33 / 136 | all pass |
| `base-x-lowbat` | solid | 213 | 60 | -16.3 | 7.2 | 16 | 11.9 / 2.1 | 7.1 / 1.7 | 52 | 0.3 | 31 / 130 | all pass |
| `base-stretch-x` | solid | 218 | 65 | +1.2 | 7.0 | 16 | 10.7 / 1.9 | 6.2 / 1.4 | 43 | 0.1 | 35 / 141 | all pass |
| `base-h` | solid | 218 | 64 | +1.3 | 7.0 | 16 | 7.4 / 1.3 | 5.8 / 1.0 | 27 | 0.1 | 35 / 142 | all pass |
| `base-truss` | truss | 218 | 64 | +1.6 | 7.0 | 16 | 70.4 / 12.3 | 8.9 / 2.3 | 82 | 0.1 | 32 / 140 | all pass |
| `video-x` | solid | 230 | 68 | +2.3 | 6.6 | 13 | 99.4 / 16.5 | 63.4 / 12.8 | 250 | 0.1 | 33 / 129 | FAIL: front props outside the O4 155° FOV cone |
| `video-deadcat` | solid | 231 | 69 | +2.2 | 6.6 | 13 | 87.1 / 14.4 | 57.0 / 10.6 | 198 | 0.1 | 33 / 131 | FAIL: front props outside the O4 155° FOV cone |
| `reference-fusion` | imported mesh | 222 | 68 | +0.0 | 6.9 | 15 | 4.5 / 0.8 | 4.1 / 0.8 | 36 | 0.1 | 54 / 210 | FAIL: ≥ 3 mm clearance around every prop disc (incl. wires) |
