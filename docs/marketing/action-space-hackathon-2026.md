# Action Space — Boston C-UAS hackathon (Oct 23–25, 2026)

Event-day brief for Drone Edge. Official hackathon is **Sat Oct 24 – Sun Oct 25, 2026** in Boston (venue TBD). Treat **Fri Oct 23** as travel / kit setup / last dry-run. Facts below are from [action-space.pages.dev](https://action-space.pages.dev/) and [Luma](https://luma.com/xl77cp4v) as of mid-September 2026 — re-check the week of the 17th (approvals close Oct 17).

**Do not invent FAA pass rates, student counts, or product claims** if talking to organizers or teams. Product language: [`docs/sales/features.md`](../sales/features.md).

---

## 1. What this weekend is

Boston’s first **anti-drone swarm defense** hackathon. Theme: **C-UAS** (counter-unmanned aircraft systems) — detect, track, defeat. Hold a mock commercial site (data center / campus) against an inbound swarm. Not a 1v1 dogfight.

**Stated main goal (organizers):** grow the local robotics / physical-AI community and get work **off sketches onto hardware**. Competition is secondary. Practically, table-side judges reward, in this order:

1. A real drone that moved on purpose on Sunday.
2. A clear detect → track → defeat story in two minutes.
3. A sim clip that shows the learning piece was not decorative.

**Who:** Jaime A. Romero (Penn GRASP MSE Robotics, WHOOP Sensor Intelligence, ex-GM AV fleet; PPO drone racing + Isaac Lab sim-to-real). Co-hosts on Luma: Sebastian Romero, Savi Kendre, Harris Stolzenberg. Judges TBA.

**Constraints that shape everything:**

- 18+, teams of **four**, approval required (rolling; **final approvals Oct 17**). At least one person who knows software, hardware, or robotics.
- Hardware seats limited. They pair NVIDIA-GPU laptops with teams that don’t have one.
- **Saturday = sim only.** **Sunday = two shared flight windows** on **10 DJI/Ryze Tellos** (nobody owns a drone all weekend). One Intel RealSense for the room. Nets allowed as “defeat.”
- Submission: GitHub + project docs + **one-minute video** by 5:15 Sun.
- Prizes: more than $1,000; food included; grand prize TBA.
- Page is a Revolute-hackathon template — **no published judging rubric, no rule on pre-built code, no list of allowed frameworks.** Ask Jaime by email: *“Can we bring a pre-built Tello stack and a starter Isaac Lab env?”* Assume yes unless told otherwise; keep repo history honest (pre-work committed before Oct 24).

**Apply:** [luma.com/xl77cp4v](https://luma.com/xl77cp4v). Questions / sponsor offers: **jaromero3rd@gmail.com**.

---

## 2. Drone Edge angle + food sponsorship (open)

This is the audience the company already teaches: students and builders who want to fly autonomously, not just pass Part 107. Useful even if we do not field a competitive team.

| Option | What we get | Cost / effort | Status |
|--------|-------------|---------------|--------|
| **Sponsor food** (or a meal block: Sat lunch, Sat dinner, or Sun lunch) | Name/logo on site + opening remarks; table talk with every team; “Drone Edge fed the room” is the kind of exposure this community actually remembers | Organizers are soliciting food, hardware, compute, prizes, venue. Ask Jaime what a meal costs and what logo placement they give | **May do — not committed.** Email offer only with explicit approval (no unsupervised outreach) |
| Sponsor a few extra Tello batteries / USB Wi-Fi dongles | Practical help Sunday; brand on the charging table | Low $; they said compute is the bigger ask | Optional add-on |
| Wear / hand merch | 20 event tees already planned | [`merch.md`](merch.md) | Independent of food |
| Field a team | Full technical brief below | 4 people, ~12–16 h each pre-event | Separate decision |
| Content after | “How to fly a Tello autonomously in Python” article / course unit; sim-to-real write-up | Fits content vision; don’t invent claims | After the weekend |

**If we sponsor food, ask for (draft — do not send until approved):**

- Logo on the event page + opening slide.
- One sentence from the stage: who we are (FAA 107 + drone education, thedroneedge.com) — no invented school counts.
- A small table or charger station, not a hard pitch.
- Recap photo rights for a post.
- Intro to Jaime / any school or lab contacts who ask about curriculum.

**If we only attend:** still useful. The room is Boston robotics + physical AI; organizer wants the community grown.

---

## 3. Weekend clock

Subject to change. Venue TBA — confirm housing / parking once Luma unlocks the address (after registration).

### Friday Oct 23 — travel / prep (not official)

- Arrive Boston. Charge every Tello battery and spare.
- Unpack: overhead camera + tripod, tags, tape, USB Wi-Fi dongles, labeled laptops.
- One last M4-style intercept in a hotel room / empty hall if possible.
- Confirm GPU laptop boots Isaac Lab without network.
- Print one-pager architecture diagram for the table.

### Saturday Oct 24 — sim only

| Time | Block |
|------|--------|
| 10:00 | Opening |
| 10:30 | Isaac Lab + PPO lesson; start training defender policies in sim |
| 13:00 | Lunch + office hours; **form / finalize teams**; GPU pairing |
| 14:00 | Hacking continues (sim only) |
| 18:30 | Dinner |
| 22:00 | Hacking ends for the day |

### Sunday Oct 25 — 12:00–18:00

| Time | Block |
|------|--------|
| 12:00 | Doors |
| 12:15–14:00 | **Live C-UAS window 1** — shared Tellos, nets, mixed stacks |
| 14:00 | Lunch |
| 14:45–16:30 | **Live C-UAS window 2** |
| 16:30 | Demos, judges table-to-table |
| 17:15 | Final submissions (GitHub, docs, 1-min video) |
| 17:30 | Awards |
| 18:00 | End |

**Air-time budget:** 10 Tellos × two ~100-minute windows, all teams. Plan on **15–25 minutes** of actual flight. Every flight is scripted; first flight is not a test.

---

## 4. Hardware on site

### Tello (Ryze Tello + DJI flight stack)

80 g toy quad, ~$100 (EDU ~$130). A **cheap safe actuator with a camera**, not an autonomous robot. You supply brain + positioning.

- **Link:** drone is a Wi-Fi AP (`TELLO-xxxxxx`). Laptop joins it; UDP text commands to `192.168.10.1:8889`. Python: `djitellopy`. State ~10 Hz on 8890; 720p H.264 on 11111.
- **Commands that matter:** `command`, `takeoff`, `land`, `emergency` (motor cut — it drops), `rc a b c d` (left/right, fwd/back, up/down, yaw, −100..100 — **velocity channel**, send 10–20 Hz), `go x y z speed` (relative cm waypoint).
- **Sensing:** forward 5 MP / 720p stream (latency, drops). Downward cam + IR used *internally* for hover. **No GPS, no usable compass, no obstacle sense, no position out.** EDU adds mission pads (~±10 cm over a printed pad) and **station mode** (`ap <ssid> <pass>` → joins *your* router so one laptop can address many IPs).
- **Perf:** ~13 min battery / **~10 usable**; ~8 m/s peak, **1–2 m/s indoors**; drift 0.5–1 m over 20 s of dead-reckoning; command latency 100–300 ms; video 200–500 ms behind; Wi-Fi drops of seconds.
- **One radio = one standard Tello.** Multi-drone: USB Wi-Fi dongles (bind sockets to each NIC; Linux easier than macOS) **or** EDU station mode **or** a Pi/Jetson per drone as a local relay.

### Intel RealSense (D435 / D455 class)

USB **depth camera**: stereo IR + projector → per-pixel distance + RGB, 30–90 fps. Indoor useful range ~0.3–3–4 m for something as small as a Tello. Software: `pyrealsense2`.

**One camera for the whole room.** Treat as a bonus cone over the mock site, not the plan. Tags + overhead RGB are the reliable path.

### Isaac Lab + GPUs

NVIDIA robot-learning stack on Isaac Sim (PhysX on GPU, thousands of parallel envs). Needs **RTX, ~8 GB+ VRAM**, Ubuntu 22.04/24.04 or Windows, **30+ GB** install. Versions move fast — bring a known-good env, don’t clone the workshop repo cold.

### Nets

Allowed as the defeat step. A human “tag-along” with a net plus a tracker cue on a phone is in-rules (“mixed stack”).

---

## 5. Concepts you will hear Saturday

**PPO (proximal policy optimization).** Workhorse RL (2017). A small net maps observation → action; you collect (obs, action, reward) and update so high-reward actions get likelier. “Proximal” = each update is clipped so the policy cannot jump and collapse. On-policy → wants millions of steps → GPU-parallel sim. You will actually touch: **reward** (breach penalty, intercept bonus, collision), observation norm, episode length, entropy. Multi-agent: same net on every defender (MAPPO / shared PPO). Output is a file (`.pt` / ONNX): `obs → action` in &lt;1 ms on CPU.

**Isaac Lab.** The Saturday classroom. Parallel copies of an arena; PPO trains a defender policy. Sim quadrotor ≠ Tello (no Wi-Fi delay, no 720p camera). Smart use: policy outputs a **target or “which intruder”**, not motor commands. Classical velocity controller flies the real drone.

**Control levels (any drone):**

| Level | You send | Who closes the loop | Rate | Here |
|-------|----------|---------------------|------|------|
| Motor / rate | thrusts, rates | you | 200–1000 Hz | No — not over Wi-Fi |
| Attitude | roll/pitch/yaw/thrust | drone holds attitude | 50–100 Hz | Rare |
| **Velocity** | vx, vy, vz, yaw-rate | drone holds attitude + altitude | 10–30 Hz | **Sweet spot** — PPO and pursuit both emit this |
| Waypoint | go to x,y,z | drone | on event | Scripted moves |
| Task | “patrol zone B” | your software → one of the above | seconds | Agent / tasking |

**Abstraction to write once:** `send_velocity(id, vx, vy, vz, yaw_rate)` + `get_state(id)` with three backends: Isaac Lab, a 2-D stub, `djitellopy`. Saturday→Sunday is a one-line switch.

**Safety:** bind `land` and `emergency`; watchdog → `rc 0 0 0 0` then `land` if no tracker update / no command for ~1 s.

**If they surprise you with other airframes:** PX4/ArduPilot = MAVLink Offboard (`MAVSDK` / pymavlink) at ≥2 Hz, usually a companion computer; Crazyflie = Crazyradio + `cflib` / crazyswarm2 (indoor lab favorite); DJI Mini-class = phone Mobile SDK only — not a two-day autonomy project.

---

## 6. What other teams will build

Five archetypes. Edge is **#2 with a thin slice of #1**, interfaces clean enough to swap the brain.

### 1 — Pure RL

Beautiful Isaac Lab multi-agent PPO; often never flies, or oscillates on first Tello. Wins “best sim” if that prize exists.

- **Breaks on:** reward (hover on the perimeter, crash into friends), Saturday hours, obs gap (perfect sim positions vs noisy tracker), dynamics gap (latency + drift).
- **Smart version:** high-level policy; heuristic flies; show the learning curve.

**Team of 4 (~8–12 h each pre-event)**

| Seat | Must already know | Owns |
|------|-------------------|------|
| RL lead | PPO, reward shaping, PyTorch, reading curves | Training; 3–4 reward variants Sat; one real-drone try Sun |
| Sim engineer | Python, frames, Isaac Lab / USD | Env installer, spawn, termination, domain rand, eval video |
| Controls / bridge | Quadrotor frames, UDP | Tello harness, obs adapter, velocity clamp, **fallback heuristic** |
| Data / docs | Plots, video, writing | Curves, 1-min video, submission |

Without a real RL person and a fallback flyer, skip this vision. Three people idle Sunday if the bridge seat is empty.

### 2 — Classical robotics (most likely to intercept)

Overhead camera or RealSense → state (even a low-pass + finite-diff velocity) → guidance: **pure pursuit** (fly at the target), **proportional navigation** (null line-of-sight rate — wins at ~1:1 speed), or **breach-point intercept** (fly to where they cross the ring). Assign defenders with nearest or Hungarian. 20–50 Hz Python.

- **Breaks on:** bad homography, lighting vs tags, 300–800 ms loop delay (predict or keep gains low), 2.4 GHz soup.
- **Smart version:** big tags, taped perimeter, state machine patrol → commit → intercept → return, hard velocity clamp.

**Team of 4 (~10–15 h each)**

| Seat | Must already know | Owns |
|------|-------------------|------|
| Flight lead | Hand-fly Tello, `djitellopy`, kill discipline | Every flight, go/no-go, e-stop |
| Perception | OpenCV, ArUco, calibration | Camera, tags, 20–30 Hz publisher |
| Guidance | Vectors, PN, filters | Law + assignment; retune radius to the room |
| Systems / ops | Wi-Fi dongles, logs, video | Batteries, dashboard, submission |

Skill floor is moderate: three seats can be solid engineers who did the mirror projects; perception needs prior OpenCV.

### 3 — Perception

YOLO-nano / color on Tello 720p or RealSense RGB; depth blobs; ByteTrack/SORT IDs; sometimes Wi-Fi sniff as a gimmick. Radar UI.

- **Breaks on:** Tello is ~20 px at 3 m; COCO weights miss it; forward camera loses the target on a turn; RealSense depth on props is noisy; **detection is not defeat**.
- **Smart version:** tags first; learned detector as upgrade; feed vision 2’s controller.

**Team of 4 (~10–14 h each)** — CV/ML lead (real fine-tune experience), tracking/depth (`pyrealsense2`), integration/flight (bearing-follow at minimum), UI/docs. Weak integration seat = judges stop at “we found it.”

### 4 — Nets + humans (in-rules mixed stack)

Manual fly + net + tracker cues. Judges like physicality. Pair with a tracker, not instead of software.

### 5 — Agentic / LLM (“Claude runs the op”)

The page says Claude. LLM reads tracker JSON, calls tools (`dispatch`, `patrol`, `handoff_to_net`), narrates, maybe writes code live.

- **Breaks on:** seconds of latency vs a five-second crossing; non-determinism; hallucinated tools; judges ask “what did this do that nearest-defender wouldn’t?”
- **Smart version:** **real-time = classical.** Agent owns slow calls: priority when outnumbered, battery re-task, net handoff, English narration. Log every decision vs the rule baseline. Use agents **before** the event for boilerplate (env, harness, docs).

**Team of 4 (~10–14 h each)** — agent architect (real tool-calling, not chat), flight lead (same as vision 2, non-negotiable), tracker/state, narrative/console. Two seats *are* vision-2 seats.

### Combined stack (recommended if we field a team)

Same four people as vision 2:

- Flight lead — most important person Sunday.
- Perception — tags first; RealSense as stretch.
- Guidance / brains — PN is the product; thin Isaac Lab PPO for high-level tasking; fallback comparison.
- Systems + narrative — networking, logs, optional Claude tasking/narration, video.

Interface everything as **intruder positions in → defender velocity out**, pluggable brain (heuristic | PPO | Claude). Sunday surprise = swap the brain, not the plumbing.

---

## 7. Mirror projects (build before Oct 23)

Do in order. Stop where time runs out. **M1, M2, M4** alone beat most of the room.

| # | Project | ~Time | Intuition |
|---|---------|-------|-----------|
| **M1** | 2-D pursuit sandbox (pygame): spawn intruders, patrol ring, chase vs PN vs breach-point. Log breach rate vs defender count / speed ratio | 1 evening | Interception at Tello ~1:1 is geometry, not AI. PN beats chase. 2v3 is assignment |
| **M2** | One Tello scripted: takeoff, hold, `rc` vectors, land, e-stop, battery/temp, video. Fly a timed square; measure drift | 1 evening + a Tello | Ceiling: drift, latency, 10 min battery, Wi-Fi. Everything else sits on these numbers |
| **M3** | Overhead tracker: webcam on tripod, ArUco or color tags, homography to floor, 20–30 Hz x,y. Close the loop: Tello holds / follows a tag | 1–2 evenings | External positioning is what makes Tellos usable; lighting and cal will fail |
| **M4** | Human or scripted intruder vs autonomous defender (M1 PN + M3 tracker). Defeat = within 0.5 m for 1 s. 10 trials | 1 weekend | The Sunday demo. Also two drones / two radios |
| **M5** | Isaac Lab: stock quad example, then N defenders / M scripted intruders, same obs/action as M4. PPO better than random | 2–3 evenings, RTX | Install pain now; how long a run takes; reward traps (hover, never intercept) |
| **M6** | Export M5 policy onto M4 stream with velocity clamp | 1 evening | It will misbehave (jitter, saturate). Decide now: policy = tasking only |
| **M7** | YOLO-nano or color on Tello 720p | 1 evening | Why the fixed camera wins |
| **M8** | README, diagram, 60 s video from M4, table pitch | 1 evening | Submission is a last-hour killer |

Same `observe() → act()` interface on all of them so a stranger paired at Sat lunch can contribute in an hour.

---

## 8. Surprises to expect

- **Flight time is tiny and shared.** Script every attempt.
- **Wi-Fi chaos.** Ten Tello APs + laptops on 2.4 GHz. Reconnect path from M2; bring your own USB adapters.
- **No OptiTrack** unless they surprise you. Overhead camera + tags + tape is the plan.
- **Room geometry is unknown** until Sunday (ceiling, nets, cardboard “data center”). M1 lets you retune radius in minutes.
- **The inbound is undefined** — scripted Tellos, a person-flown Tello, or a thrown foam. “Defeat = proximity for N seconds” adapts; a net-only plan may not.
- **Isaac Lab workshop repo may not match your install.** Bring yours.
- **They pair strangers** (GPU / no-GPU) at lunch. Clean interface or they sit idle.
- **Someone will fly into someone.** Hardware-independent kill; expect a mid-day max-alt or no-fly line.

---

## 9. Packing (if we attend or field)

- RTX laptop with Isaac Lab already training; offline cache of the env.
- Spare laptop for tracker / docs.
- 1–2 Tellos of our own for Fri practice (event Tellos stay shared).
- Extra batteries + USB charger that can do several packs.
- USB Wi-Fi dongles (Linux host preferred for multi-drone).
- Webcam or phone + tripod; printed ArUco / high-contrast tags; gaffer tape; printed floor-radius marks.
- Prop guards, spare props if we own airframes.
- Ethernet / USB-C hubs, power strip, long extension.
- Merch tees if the event batch is done ([`merch.md`](merch.md)).
- One-pager: architecture, kill procedure, Wi-Fi join steps.
- Offline copies of this file + repo README.

---

## 10. Day-of run (if we field)

**Sat morning:** do not install Isaac Sim from scratch. Sit the lesson, then train *your* env. Form the four seats at lunch; give the paired stranger the `observe`/`act` file and the dashboard.

**Sat afternoon:** one PPO run that is visibly better than random; export ONNX/pt. Replay tracker logs against PN in the 2-D stub. Cut sim clips for the video. Freeze the real-time controller — no new guidance Sunday morning.

**Sun window 1:** first 5 min = tape perimeter, hang camera, cal homography, one hover + one `rc` pulse, land. Then scripted intercepts only. Rotate batteries on a timer.

**Lunch:** look at logs; change radius / gains only.

**Window 2:** best attempt for judges; record every flight.

**16:00:** one person leaves the flight line to finish the 60 s video + README. Do not still be flying at 17:00.

---

## 11. Open decisions (need a call)

| # | Decision |
|---|----------|
| S1 | Apply / attend at all? Approvals close **Oct 17**. |
| S2 | Field a team of four, attend as observers, or sponsor-only? |
| S3 | **Food sponsorship** — email Jaime for a meal-block quote + logo placement? (Draft only until you say send.) |
| S4 | Add batteries / dongles / compute as a second sponsor line? They asked for compute especially. |
| S5 | Confirm with Jaime: pre-built Tello + Isaac Lab env allowed? |
| S6 | Venue / housing once Luma shows the address. |

---

## 12. Links

| What | URL |
|------|-----|
| Event site | https://action-space.pages.dev/ |
| Registration (approval) | https://luma.com/xl77cp4v |
| Organizer | jaromero3rd@gmail.com |
| Inspired-by format | https://revolutehack.com/ |
| DE product claims | [`docs/sales/features.md`](../sales/features.md) |
| Event tees | [`docs/marketing/merch.md`](merch.md) |
