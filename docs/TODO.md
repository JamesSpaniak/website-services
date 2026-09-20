# Open items (cross-doc tracker)

Single prioritized backlog pulled from sales, marketing, product, and engineering docs. **Update this file** when an item ships or a new gap is logged elsewhere — link back to the source doc, don't duplicate long specs here.

**Completed items:** [`TODO_COMPLETED.md`](TODO_COMPLETED.md) (dated archive — prune old rows there as needed)

**Related:** [`marketing/article-inventory.md`](marketing/article-inventory.md) (CMS status) · [`tech/app-review.canvas.tsx`](tech/app-review.canvas.tsx) (engineering findings)

### Pickup next

- **Finish the other two course tracks before initial launch** — Video & Photography (`/courses/tracks/video`) and AI & Drones (`/courses/tracks/ai`) are stub "coming soon" pages today; home page track cards link to them. Ship full course content + catalog entries before launch so the three-path hero is accurate. Part 107 remains P0 for recordings first.
- **Home page join CTAs** (after Part 107 content) — hero primary should be "Try Unit 1 free" / register; secondary purchase or preview; header Sign up — see B2C conversion backlog below.

---

## P0 — Product & course delivery

*Blocks credible Part 107 offering and school demos.*

| Item | Status | Source |
|------|--------|--------|
| **Finish video recordings for all FAA Part 107 course content** — record, upload to `media.thedroneedge.com`, set `video_url` on units/sections in course payload, redeploy | **In progress (Aug 23 2026)** — 16 Ch.1 videos uploaded/transcoded and referenced in the repo payload; admin JSON publish still required. Combined falsification/accident recording sits on u132 pending text split/combine; `night ops 7-13` under author review vs `fly at night 18` (u17 has sections u171/u172); no recording exists for u134/u136/u137/u139/u141 (recording #8 missing). Ch.2+ unrecorded | User · [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) |
| **Finish Video & Photography + AI & Drones courses** — full curriculum, questions, and track pages live before **initial launch** (home `/` promotes all three tracks) | **Open — pickup next** after Part 107 recordings | User · `drone/src/app/page.tsx` · `/courses/tracks/video` · `/courses/tracks/ai` |
| **Captions / transcripts for course video** (WCAG 1.2.2) — plan alongside or immediately after recordings | Open | [`tech/app-review.canvas.tsx`](tech/app-review.canvas.tsx) A4 · [`sales/features.md`](sales/features.md) roadmap |
| **Insert course images into Part 107 payload** — author has images ready in separate folders; upload to media bucket, set `images_url` on flagged leaves (lat/long globe, sectional chart samples, MEF, load-factor charts, airport ops, etc.) | **Partial (Jul 8 2026)** — "Pictures for Airports" done: 61 images → units 2/3; Ch.4 `u422` runway figures still missing; **admin publish of Ch.1–4 (Ch.3+4 together) still pending**; Ch.7 `u718` load-factor chart open; Ch.9 `u95` needs exact maintenance figure/title/source mapping, body callouts, image attachments, and external source links where applicable | [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) · [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) § Author content-review intake |
| **Unit 2–3 image quality replacements + unit 3–10 image sources** (Sep 14 2026) — author reports blurry text; review of all 61 live images: **16 replace-now** (small+dense text, u243 worst), 15 replace-if-better, 27 keep. Aug 15 swap candidates uploaded Sep 14 and **added alongside originals** (u22 image 3, u211 image 3) for the author's live comparison — remove losers after the pick. No Drive exports exist for the 31 blurry figures, so the CSV now has `retake_source` columns: 18 regenerable from FAA GeoTIFF chart crops, 10 from FAA PDFs (Chart Users' Guide / AKTS / d-CS), 3 need author originals — full source catalog in the review .md. **27 retakes done Sep 14** — first 3 (u333/u335/u348, Jacksonville SEC) uploaded + added alongside originals; 13 from DFW SEC + Miami SEC GeoTIFFs and FAA PDFs (AKTS legend ×5, CUG Class E, d-CS COE entry, DFW SUA-table margin, DFW airport-data/obstacle/checkpoint crops, Key West quiz figure); final 11 from author-downloaded charts (Las Vegas R-4806W, Atlanta PUJ, Charlotte Gamecock composite, DFW P-47, Washington P-40 TFR, Seattle W-237A/R-6701/SUA table, New York TRSA + Hudson corridor, Salt Lake City NSA) — all charts now in `assets/courses/faa-107/reference/sectionals/` (gitignored); **all 24 pending retakes uploaded to S3 + swapped in place in the local JSON Sep 14** (25 slots; old URLs kept in the CSV for rollback; new URLs verified 200) — u244 obstacle figure re-annotated Sep 14 (circles now match text: 1198 bldgs, 1743/1113, 1216/565; stray stadium-flag circle removed) and all 9 image-bearing unit-2 leaves plus all 22 image-bearing unit-3 leaves (38 images) got numbered image references in `text_content` (“Image N of M” + what each red callout marks — includes previously unexplained overlays on u328 E4 boxes, u33/u333 SUA boxes, u334 Gamecock row, u342 MTR route numbers, u343 P-40 caution, u345–u348 labels, and fixed text-vs-image order in u323/u327); **remaining: republish JSON via admin editor (PUT /courses/35)**, author compares the 3 appended Jacksonville pairs live, and 3 author-original rows (globe, Points A–D grid, book photo). Units 3–10 sources still in the author's Google Drive — copy into `assets/courses/faa-107/images/` per chapter, then map→upload→merge | **Open — republish JSON, author compares live; retakes can start without Drive** | [`assets/courses/faa-107/images/unit-2-3-image-quality-review.csv`](../assets/courses/faa-107/images/unit-2-3-image-quality-review.csv) · [`…review.md`](../assets/courses/faa-107/images/unit-2-3-image-quality-review.md) |
| **Sectional chart figures + interactive viewer** — Jacksonville sectional GeoTIFF received (Aug 15 2026); Phase 1: author picks areas → lat/long crop manifest → script crops → existing image pipeline into unit 2/3 leaves; Phase 2 (later): tiled pan/zoom viewer at `/tools/sectional` with deep links from course. Swap candidates uploaded Sep 14 2026 and added alongside originals for live comparison (u22 image 3, u211 image 3 — typo fixed in S3 slug; 5,500-stat drop still to confirm via the comparison) | **Planning** | [`tech/sectional-chart-experience-plan.md`](tech/sectional-chart-experience-plan.md) · [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) |
| **Part 107 post-restructure follow-ups** — leaf `ExamPlayer` removal on content-only leaves; carry over or re-tag **FINAL_EXAM** pool items (unit-level bulk has no final-exam rows yet); remaining Ch.7/9/10 author notes (Ch.1–5 + Ch.8 done; Ch.6–7 + Ch.9–10 partial Aug 5 2026; images still open; **do not combine** `u5`/`u6`) | **Open** | [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) · [`assets/courses/faa-107/faa_107_course_quality_review.md`](../assets/courses/faa-107/faa_107_course_quality_review.md) § Chapter 5–10 |
| **Rebalance spacing of last ~5–6 Part 107 units (ops + weather)** — Back half (roughly Airport Ops → Radio) is conceptually one long “operations” arc that was split because a single unit would be too long; some resulting units/leaves are now too short for a clean lesson+video. **Weather decision (Jul 27 2026):** keep `u5` WEATHER and `u6` WEATHER EFFECTS **separate** (do not combine). Plan recordable video chunks per unit (unit 6 aimed at one top-level ~10–12 min video). Remaining: ops/radio unit spacing + recording plan | **Open** | User · [`assets/courses/faa-107/faa_107_course_quality_review.md`](../assets/courses/faa-107/faa_107_course_quality_review.md) § Chapter 5–6 · [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) · P0 recordings |
| **Review open questions from unit-level bulk import** (Jul 8 2026) — 8 broken source rows excluded from `faa_107_questions_unit_level.bulk.json`: 5 with answer "D" but only 3 choices (likely missing "all of the above"-style choice; sheet rows 197, 294, 512, 584, 587) and 1 Figure 75 R-2305 question with a single choice (rows 79/164/466); fix in the author's sheet, re-run `scripts/build_unit_level_questions.py`, re-import. Also spot-check the 23 keyword-inferred mappings (`imported_inferred`) | **Open** | [`assets/courses/faa-107/questions/faa_107_questions_unit_level_review.csv`](../assets/courses/faa-107/questions/faa_107_questions_unit_level_review.csv) |
| **Honor the author's END OF UNIT QUIZ/TEST blocks in unit quizzes** (Aug 8 2026 tester feedback) — import flattens the sheet's section / end-of-section / unit-test blocks into one flat `priority: 2` pool, so the 25-Q unit quiz samples randomly across all of u1 instead of guaranteeing the designated test questions. Weighting cannot replace this (membership vs proportion). Fix: parse block markers, tag unit-test rows `priority: 1`, upgrade kept duplicates when the dropped copy was in a test block, raise unit quiz count 25 → ~35–40. Author to confirm 287→u5, 290/295→u9 | **Open** | [`tech/exam-weighting-plan.md`](tech/exam-weighting-plan.md) §6.1 · [`assets/courses/faa-107/questions/faa_107_questions_unit_level_review.csv`](../assets/courses/faa-107/questions/faa_107_questions_unit_level_review.csv) |

---

## P1 — Drone-building course (draft, not in catalog)

*Outline is v3.4 and drafting is unblocked. Canonical: [`assets/courses/drone-building/outlines/drone-building-course-outline-v3.md`](../assets/courses/drone-building/outlines/drone-building-course-outline-v3.md) (draft from this) · [`…/outlines/drone-building-course-review-v2.md`](../assets/courses/drone-building/outlines/drone-building-course-review-v2.md) (rationale) · [`…/reference/parts-list-draft-v4.md`](../assets/courses/drone-building/reference/parts-list-draft-v4.md) (parts, costs, SKUs; v3/v2/v1 alongside keep split-ESC desk check / market note / materials/goggles). No payload, questions, or homepage track until Part 107 P0 is published. Joe owns hardware facts on `branch-joe`; we fold and bump.*

### Joe — hardware confirmations (blocking final numbers)

| Item | Status | Source |
|------|--------|--------|
| ~~Compatibility pass on the GetFPV quote (v1)~~ · ~~Joe's Sep 9 list (v2)~~ · ~~Joe's Sep 11 list (v3, split FC/ESC)~~ · **Compatibility pass on Joe's Sep 12 list (v4)** | **Desk-checked Sep 12 2026**: matched Flywoo F722 Mini V2 45 A stack restored ($90); Explorer 1000 3S LiHV XT30UP; XR2 Nano; **Tony 5 still rejected — 5" frame** | parts list v4 § 1 |
| **Video-kit 3.5" frame** — Tony 5 is a 5" frame (FlyFish: 5" props, 215 mm). Not a sibling for 1404 + 3525. A wind-capable 5" Video kit would be a different BOM | **Parked Sep 12** — ship Base first; revisit Video later | parts list v4 § 7a |
| ~~**FC↔ESC pinout**~~ → matched Flywoo 45 A stack | **Closed Sep 12** | parts list v4 § 3 |
| ~~**XT30 pigtail**~~ — the stack **ships XT30**; the "box includes XT60" note was wrong | **Closed Sep 18 2026** | parts list v4 § 3 |
| ~~**Smoke stopper**~~ → SpeedyBee dual XT30/XT60, $10; classroom XT30 only, 1 A, props off | **Closed Sep 12** | parts list v4 § 1, § 3 |
| **Weigh one Base and one Video build** — per component and complete with battery, props, BeeID; hover current and flight time; component photos for Unit 2 | Open | parts list v4 § 6 |
| **In-person checks** — BeeID harness pitch vs GPS socket, XR2 CRSF vs RX socket, capacitor value, Setup-tab alignment on first flash, battery fit, VTC5A in Pocket; confirm 20-joint tally | Open | parts list v4 § 8 |
| **Stock-frame CAD** with `arm_thickness` and `hole_clearance` variables; STL for print-and-ship | Open — **parametric CAD + checks + FEA framework done Sep 12 2026** (`scripts/dronecad`, regenerated from the v4 `bom.json`; see TODO_COMPLETED). Decision pending: `base-x` (solid arms, simplest print) vs `base-truss` (vertical truss arms + keel: 7.5× arm stiffness, crash SF 2.3 vs ~1, first mode 82 vs 52 Hz); the Sep 11 Fusion print itself is ruled out as-is for the kit (`reference-fusion`, Sep 15: 3.5" props 2 mm from its deck posts, needs stack + motor adapters). Tooling on the dev Mac since Sep 14: OrcaSlicer (the framework drives its CLI — bottoms slice to 18 g `base-x` / 25 g `base-truss`), FreeCAD, OCP CAD Viewer (`dronecad view`). Still needed: thrust-stand numbers (`cad/thrust-stand.csv`), a test print of both bottoms to calibrate `print_solidity` (set `DRONECAD_ORCA_MACHINE` to the actual printer first), then the Onshape stock frame from the STEP. **Extensions (not started):** plant card + URDF for BF SITL, DXF 2.5D plates (CAM G-code is a blocker), TPU canopy, viewer-fly; Isaac Lab only after the plant card — see [`cad-sim-extensions.md`](../assets/courses/drone-building/reference/cad-sim-extensions.md) § 8 | parts list v1 § 9 · outline Unit 5 · `cad/README.md` · parts list v4 § 1 · cad-sim-extensions |
| Re-price at order time; swap superseded parts | Open | parts list v4 § 5 |

### Ours — curriculum drafting (can start now)

| Item | Status | Source |
|------|--------|--------|
| **Unit 1 Safety** — 2 sessions, shop-cert checklist, **LiHV charge profile** for the Explorer pack; per-unit safety briefs for Units 2–8; radio/goggles charging in the LiPo routine | Not started | outline Unit 1 |
| **Unit 4 Physics** — materials (with the parts-list v1 § 3 density/Tg table as the worked example), heat transfer, battery mechanics (no chemistry), AUW worksheet | Not started | outline Unit 4 |
| **Unit 3 Laws** — cut from `faa-107` `u1`: Part 107 path, register every aircraft with its BeeID serial, **VO required for FPV flights**; fleet-registration workflow (one account, per-aircraft entries) | Not started | outline Unit 3 · parts list v1 § 5 |
| **Unit 8** — bench checklist (BeeID broadcasting + GPS lock; VO assigned for FPV), maiden protocol, post-flight rubric; **add crew roles (RPIC/VO/safety/logger) and a sim-proficiency gate before maiden** (borrow from PCS Drone Pathways; pick a third-party sim — do not use FLEX) | Not started | outline Unit 8 · [`sales/competitor-analysis.md`](sales/competitor-analysis.md) §12 |
| **45-minute teacher scripts** for the school edition (objectives, timed blocks, materials, key terms, extensions) — Lesson 12 in the PCS sample is the quality bar | Not started | [`sales/competitor-analysis.md`](sales/competitor-analysis.md) §12.6 |
| **Google Earth / mission-planning leaf** — site brief + imagined hazards; label as thought experiment, not job qualification | Not started | outline Unit 3/8 · PCS sample Lesson 12 |
| **Unit 5** — CAD fundamentals stem, design brief with 20×20 stack, 12×12 motors, BeeID pocket, **Explorer 1000 tray 58 × 24.5 × 23.5 mm**, XR2 keep-out, **material-profile slicer table** (PLA/PETG/ASA/nylon/TPU rows), critique rubric | Not started | outline Unit 5 · parts list v1 § 9 · v4 § 1 |
| **Unit 2 + Unit 6 text** from parts list v4, Unit 6 in two variants (Solder / Pre-soldered); photos wait on hardware | Not started | outline Units 2, 6 |
| **Unit 7** leaves against the GOKU F722 Mini V2 (`FLYWOOF722PROV2`, baro, OSD, GPS UART5 → GPS Rescue as safety net, telemetry warnings); screenshots wait on hardware, Betaflight 2026.6 | Not started | outline Unit 7 |
| **Weather leaf** — review variant for 107 grads + expanded variant for others | Not started | outline Unit 4 · `faa-107` `u5`/`u6` |
| **Unit draft template** — one markdown skeleton per unit (stems → leaves → labs/clips → checkpoint) so drafts land in a consistent shape before JSON | Not started | outline § 5 |
| **Parts-list template** for future kit revisions | **Done Sep 8 2026** — [`reference/parts-list-template.md`](../assets/courses/drone-building/reference/parts-list-template.md) | — |
| **Course 2 / Drone Repair and Custom Builds** — decide whether to pursue (semester-2 elective or club block; soldering-first; consumes the fleet's crash spares); depends on v1 sales | Proposal, not started | [`reference/soldering-lab.md`](../assets/courses/drone-building/reference/soldering-lab.md) § 6 |
| **CAD plant exporter + DXF plates + BF SITL** — one `plant.json` / URDF from `cad.json` (shared by viewer, SITL, later Isaac); layered DXF for top + flattened bottom (not G-code); SITL hover of the stock plant. Print-first / CNC-later / canopy materials decided in the note; do not install Isaac until this lands | Not started | [`reference/cad-sim-extensions.md`](../assets/courses/drone-building/reference/cad-sim-extensions.md) § 8 |

### Ours — ops, sales, frontend

| Item | Status | Source |
|------|--------|--------|
| **Sim pick for Unit 8 gate** — Velocidrone / Liftoff / RealFlight / other; must run on school devices, not locked to FLEX UAV. RadioMaster Pocket trainer-mode SOP for class TX. Separate from BF SITL of *our* plant ([`cad-sim-extensions.md`](../assets/courses/drone-building/reference/cad-sim-extensions.md) § 5–6): commercial sim = stick time; SITL = this airframe | Not started | [`sales/competitor-analysis.md`](sales/competitor-analysis.md) §12.6 |
| **Kit one-pager for sales** — Base ~$275 per aircraft (Video ~$465 parked until a real frame); Solder vs Pre-soldered SKU (+$25–40); class items (radios + 18650s, M4AC chargers, N3 goggles $230, SpeedyBee smoke stoppers); class-of-10 Base landed ~$3.8k vs PCS $26k, DroneBlocks $10–13k; material choice as a kit-order option with the enclosure/ventilation qualification question | Base unblocked; Video line parked | parts list v4 § 5, § 7a · v1 § 8, § 9 · [`sales/packages.md`](sales/packages.md) |
| **Pre-soldered SKU design** — ours to solder (no vendor service exists at scale); confirm ~25 min/kit vs Joe's build time; price inside +$25–40 (+$15–20 cost); QA (motor order/direction test before shipping); practice-board lab for the soldering leaf | Not started | parts list v2 § 3 · soldering-lab § 5 |
| **Soldering lab kit list → kit one-pager / sales qualification** — "do you own irons?" question; budget ($1,200) / standard ($2,000) / top-up ($20–60) tiers for a 6-station lab, consumables ~$100–150/semester, lead-free SAC305, ≤ 6 irons per adult, SDS + shop cert + hazard analysis handed to the CTE director | Not started | soldering-lab § 1–3 · [`sales/packages.md`](sales/packages.md) |
| **Goggles tier per school** — N3 default, Goggles 3 for the RPIC; teacher view = N3 phone mirror to the room display; VO rule in the flight-day guidance | Decided; write into one-pager | parts list v1 § 8 |
| **Frontend: step-clip video pattern** — Units 6–8 want several 1–2 min clips per leaf; course UI renders one `video_url` per node today. Decide: one node per step vs content-block gallery | Not started | [`tech/frontend-data.md`](tech/frontend-data.md) · `drone/src/app/ui/components/unit.tsx` |
| **Confirm BeeID V1.1 on the FAA DOC list (RID000001995) and its serial format** at first purchase | Open | parts list v2 § 1 |

---

## P1 — Sales & GTM (schools)

*Rep can outreach; close gaps before scaled pipeline.*

| Item | Status | Source |
|------|--------|--------|
| **Import & publish P0 articles** — `school-01-part-107-cte-classroom`, `school-02-funding-drone-programs` (heroes ready) | Ready in repo → prod CMS | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Approve B2B price bands** (Pilot / Classroom / Program) — replace placeholders in quotes | Open | [`sales/packages.md`](sales/packages.md) |
| **School one-page PDF** for post-reply email | Not started | [`sales/rep-handoff.md`](sales/rep-handoff.md) · [`sales/go-to-market-review.md`](sales/go-to-market-review.md) |
| **Manager dashboard screenshots** in articles / deck (optional until live demo login) | Open | [`sales/go-to-market-review.md`](sales/go-to-market-review.md) |
| **Fill prod article IDs** in inventory after CMS import | Open | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Sync prod CMS status** for all repo story/advance articles (`_confirm_` rows) | Open | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **First outreach campaign** — 100 contacts, tracker, reply/objection log | Not started | [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) |
| **UTM params on consultation links** when CRM ready | Open | [`sales/go-to-market-review.md`](sales/go-to-market-review.md) |
| **Quote/contract package docs** (`review-1year.md`, Appendix A templates in repo) | Not in repo | [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) |

### Money model — offer ladder decisions and surfaces

*Canonical: [`sales/money-model.md`](sales/money-model.md) § 8–9. Gap list there; this table is the backlog. **MM9** already decided (track only).*

| Item | Status | Source |
|------|--------|--------|
| **Approve MM1–MM8 + MM10** — bundle **> $129** (D10; $69–79 retired), Pro price + benefit list, kit protection plan, 3-year discount/terms, sponsor tiers, visit day rate, parts fulfilment, B2C→school referral, Pro pause vs downsell-to-course | Open | [`sales/money-model.md`](sales/money-model.md) § 8 |
| **Post-purchase upsell page** — Pro / next-course on PaymentIntent thank-you; completion-screen next step (next course, kit, "bring this to your school") | Not started | [`sales/money-model.md`](sales/money-model.md) § 6 · **T16**/**T17** |
| **Checkout decline path** — after a "no" only: Pro monthly, payment plan (Affirm/Klarna), practice-exam pack. Never on first view | Not started | [`sales/money-model.md`](sales/money-model.md) § 3.1 · 9 |
| **Practice-exam-only pack SKU** — $29–39 draft; question bank + mocks, no lessons. Downsell only | Not started; needs price | [`sales/money-model.md`](sales/money-model.md) § 3.1 |
| **Free 3.5" parts-list PDF as lead magnet + kit downsell** on `/courses/tracks/building` (email capture — **S5**/**D7**) | Not started | [`sales/money-model.md`](sales/money-model.md) § 3 · parts list v4 |
| **Pro benefit list beyond "all courses"** — unlimited mocks / category drill, regulation updates, 24-month recurrent (say FAA recurrent is free), parts discount | Not started | [`sales/money-model.md`](sales/money-model.md) § 3.3 |
| **Fill quote optional lines** — 3-year, seat/satisfaction guarantee, kit protection, visit, soldering lab. Stubs added Sep 17; do not send dollar amounts until MM3/MM4/MM6 | Partial — stubs in template | [`sales/quote-template.md`](sales/quote-template.md) · [`sales/money-model.md`](sales/money-model.md) § 4.2–4.3 |
| **`/schools/kits` page** — Base/Video, Solder/Pre-soldered, soldering-lab qualification, better materials, creativity options, visits, protection plan | Blocked on Joe's 3.5" frame pick | [`sales/money-model.md`](sales/money-model.md) § 4 |
| **`/sponsors` page** — sponsor-a-classroom tiers, impact-report sample (dashboard numbers only), content package, event workshop; no named partners until agreements | Not started; needs one real school | [`sales/money-model.md`](sales/money-model.md) § 5.1 |
| **Employer (workforce) quote path** — seats + 24-month recurrent; no self-serve B2B checkout | Not started | [`sales/money-model.md`](sales/money-model.md) § 5.2 |
| **Event / nonprofit partner outreach** — workshop block only after a conversation; do not list partners on the site first | Not started | [`sales/money-model.md`](sales/money-model.md) § 5.1 |
| **Print-and-ship service design** — student Unit 5 frames, colors, turnaround, failed-print policy | Not started | Building-course ops row · money-model § 4 |
| **Course 2 — Repair and Custom Builds** — year-2 continuity; proposal only | Proposal | [`assets/courses/drone-building/reference/soldering-lab.md`](../assets/courses/drone-building/reference/soldering-lab.md) § 6 |
| **Post-purchase / completion / 24-month email sequences** | Blocked on **D7** ESP | [`sales/money-model.md`](sales/money-model.md) § 6 |
| **Rewrite B2C article C** — slug/title still "$29 vs ground school"; course is $129 | Open | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Upsell/downsell analytics events** — `upsell_shown/accepted/declined`, `downsell_*`, `kit_lead` | Not started | [`sales/money-model.md`](sales/money-model.md) § 6 · **T3** |

### Sales collateral (buyer asks)

| Item | Status | Source |
|------|--------|--------|
| Public B2B price sheet | Not started | [`sales/rep-handoff.md`](sales/rep-handoff.md) |
| Downloadable pacing guide / standards PDF | Blocked — see P2 pilot | [`sales/rep-handoff.md`](sales/rep-handoff.md) |
| Customer logos / case studies | Blocked — see P2 pilot | [`sales/rep-handoff.md`](sales/rep-handoff.md) |
| VPAT / formal DPA packet | Not started | [`sales/rep-handoff.md`](sales/rep-handoff.md) · [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) |
| Calendly embed on `/consultation` | Optional | [`sales/rep-handoff.md`](sales/rep-handoff.md) |

---

## P1 — Marketing & content

*Shareable `/articles` + schools cross-links.*

| Item | Status | Source |
|------|--------|--------|
| **Resources block on `/schools`** — link P0 articles after prod import | Not started | [`workflows/marketing/outreach-content-calendar.md`](../workflows/marketing/outreach-content-calendar.md) |
| **Expand & publish P1 school articles** — pilot vs full-year, kits vs curriculum, hybrid/async | Draft JSON in repo | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Expand & publish B2C articles** — study guide (A), practice questions (B), **rewrite C at $129** (draft still titled $29 vs ground school) | Draft JSON in repo; C stale | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Resolve Hidden "AI & Drones" article** in prod — publish, merge, or retire | Open | Prod admin · [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Replace `hero-default.svg`** on older story/advance articles where still default | Open | [`assets/articles/import/manifest.json`](../assets/articles/import/manifest.json) |
| **SEO/GEO cadence** — Search Console, monthly GEO query log | Ongoing | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) |

### Paid acquisition — creative & campaign work

*Strategy, budget plan, and creative concepts: [`marketing/paid-acquisition.md`](marketing/paid-acquisition.md). Engineering items are in **P1 — Paid acquisition build** below. Campaign steps: [`workflows/marketing/paid-ads.md`](../workflows/marketing/paid-ads.md).*

**Decided (Jul 2026):** $2,500 budget + owned drone gear · GA4 + Meta ads first, Google Search second · no group funnel (participate in existing communities) · no native app (PWA instead).

| Item | Type | Status | Source |
|------|------|--------|--------|
| **Film demonstration creative** — 5–6 variants: sample question / sectional on screen, 3s aerial B-roll hook, free-unit CTA | Creative | Not started | [`marketing/paid-acquisition.md`](marketing/paid-acquisition.md) § Creative production |
| **Film safety-procedure shorts** — correct procedure only; **no staged hazards**, no illegal ops on camera | Creative | Not started | Same § Compliance |
| **Recorded `/schools` walkthrough** (5–8 min, chaptered, captioned) — forwardable to a purchase committee | Creative | Not started | Same § Video sales assets |
| **B2C product demo video** (60–90s) on the offer page — inline click-to-play, no autoplay modal | Creative | Not started | Same |
| **Publish footage to YouTube + communities** — reuse every clip organically, not just as ads | Creative | Not started | [`marketing/seo-geo-strategy.md`](marketing/seo-geo-strategy.md) |
| **Join & participate in existing drone / Part 107 communities** — named disclosed accounts, answer questions, no pitching | Marketing | Not started | [`marketing/paid-acquisition.md`](marketing/paid-acquisition.md) § Group funnel |
| **Meta test campaign** — ~$900 over 6 weeks, optimize `signup_completed`, target ~$5/signup | Campaign | Blocked on build | [`workflows/marketing/paid-ads.md`](../workflows/marketing/paid-ads.md) |
| **Google Search B2B test** — ~$900 over 6 weeks, exact/phrase CTE keywords → `/schools/funding`, optimize `consultation_submitted` | Campaign | Blocked on Meta test | Same |
| **Article-to-offer retargeting** — ads to existing `/articles`, retarget readers with the offer | Campaign | Blocked on build | [`marketing/paid-acquisition.md`](marketing/paid-acquisition.md) § Funnel shapes |

---

## P1 — Paid acquisition build (tech)

*Canonical detail: [`tech/analytics-and-attribution.md`](tech/analytics-and-attribution.md) and [`tech/pwa-and-mobile-app.md`](tech/pwa-and-mobile-app.md). Phases are ordered — each blocks the next. **No ad dollar is spent until Phase 2 is done.***

### Phase 0 — accounts to sign up for

*All free. Roughly half a day total. Blocks everything below.*

| # | Item | Type | Status |
|---|------|------|--------|
| **G1** | Google Analytics 4 property + web data stream; record measurement ID | Signup | Not started |
| **G2** | Google Search Console verified (may already exist) | Signup | Not started |
| **G3** | Google Ads account created (zero spend for now — conversion history accrues) | Signup | Not started |
| **G4** | Link GA4 ↔ Google Ads ↔ Search Console (three separate links) | Signup | Not started |
| **G5** | YouTube channel for drone footage | Signup | Not started |
| **M1** | Facebook Page (mandatory — ads run *from* a Page) | Signup | Not started |
| **M2** | Meta Business Manager; claim Page + ad account into it | Signup | Not started |
| **M3** | Instagram business account linked to the Page | Signup | Not started |
| **M4** | Meta ad account + payment method + account-level spend cap | Signup | Not started |
| **M5** | Meta dataset/Pixel in Events Manager; record pixel ID | Signup | Not started |
| **M6** | Meta domain verification for `thedroneedge.com` — **TXT record via Terraform Route 53, not the console** | Build | Not started |
| **M7** | Meta for Developers app + System User + CAPI token → Secrets Manager via Terraform. **This is the only "app" Meta needs — not a mobile app** | Build | Not started |
| **M8** | Aggregated Event Measurement — rank the 8 web events (purchase → signup → preview → checkout → rest) | Config | Not started |
| **O1** | LinkedIn company Page (B2B credibility) | Signup | Not started |
| **O2** | Named Reddit / Discord identities for community participation | Signup | Not started |

### Phase 1 — close the measurement gaps

*Worth doing even if no ad ever runs.*

| # | Item | Type | Status |
|---|------|------|--------|
| **T1** | Handle `exam_start` / `exam_submit` in `AnalyticsController` — currently sent by the client and silently dropped | Build | Open |
| **T2** | Write the `EXAM_SUBMITTED` audit row — enum and admin SQL exist, nothing calls `auditService.log` | Build | Open |
| **T3** | Add funnel events: `signup_started`, `signup_completed`, `preview_started`, `checkout_started`, `purchase_completed`, `consultation_submitted` (**S10**) | Build | Open |
| **T4** | Harden `POST /analytics/event` + `POST /logs` (**M4**) — spoofed conversions poison ad bidding | Build | Open |
| **T5** | Grafana alerts: zero `purchase_completed` during active spend; Stripe webhook error rate; 5xx on paid landing routes | Build | Not started |

### Phase 2 — attribution plumbing (before the first ad dollar)

| # | Item | Type | Status |
|---|------|------|--------|
| **T6** | Consent banner + Google Consent Mode v2, default denied; sync `drone/src/app/privacy/page.tsx` | Build | Not started |
| **T7** | Click-ID / UTM capture in `drone/src/middleware.ts` → first-party `HttpOnly` cookie (first-touch wins, ~90d) | Build | Not started |
| **T8** | `marketing_attribution` table + persist on register / checkout / consultation | Build | Not started |
| **T9** | GA4 via `@next/third-parties/google`, consent-gated, `afterInteractive` | Build | Not started |
| **T10** | Meta Pixel, consent-gated, sharing one `eventId` per event with the server-side call | Build | Not started |
| **T11** | Single `track()` abstraction in `lib/analytics.ts` fanning out to first-party + pixels | Build | Not started |

### Phase 3 — server-side signal (once spend is live)

| # | Item | Type | Status |
|---|------|------|--------|
| **T12** | Meta CAPI off the Stripe webhook — idempotent, out of band, SHA-256 hashed PII, never blocks fulfillment | Build | Not started |
| **T13** | Google Ads conversion tag / Enhanced Conversions | Build | Not started |
| **T14** | Offline conversion import for B2B qualified leads and won deals against stored `gclid` | Build | Not started |
| **T15** | Blended CAC query over `audit_logs` + `marketing_attribution`, surfaced in the admin analytics tab | Build | Not started |

### Phase 4 — offer & PWA

| # | Item | Type | Status |
|---|------|------|--------|
| **T16** | **Three-course bundle SKU in Stripe** — blocked on **D10 / MM1**. Price **must exceed $129**; $69–79 draft retired | Build | Not started |
| **T17** | Productize `PRO_UPGRADE` as purchasable monthly Stripe subscription | Build | **Partial** — Checkout + portal + webhooks in code; set `STRIPE_PRO_PRICE_ID_MONTHLY` + Dashboard portal/webhook events to enable |
| **T18** | PWA manifest (`app/manifest.ts`) + maskable icons from the brand kit | Build | Not started |
| **T19** | PWA service worker (Serwist) — **exclude signed media domain and `/api/*` from caching**; keep protected routes out of precache | Build | Not started |
| **T20** | Install prompt for logged-in learners only (do not prompt paid traffic mid-conversion) | Build | Not started |

*Prerequisites already tracked elsewhere:* free Unit 1 without verify friction (**S6**), public pricing page (**S2**), home join CTAs (**S3**), email capture / lead magnet (**S5**), dead social links (**S7**), P0 course video.

### Paid-acquisition discoveries — research spikes, resolve before building

| # | Question | Blocks | Status |
|---|----------|--------|--------|
| **D1** | Current App Store policy on external purchase links for digital content (US) | Any native app decision | **Answered Jul 2026** — US link-out commission 0% under Epic contempt remedy (SCOTUS pending); still hide in-app Stripe / use link-out. Detail: [`tech/pwa-and-mobile-app.md`](tech/pwa-and-mobile-app.md) § Store commission. Re-verify at submit. |
| **D2** | Does offline lesson access change completion or retention? | Native app case | Open |
| **D3** | Do push notifications lift completion enough to justify spending the permission prompt? | T20 scope | Open |
| **D4** | Can the free Unit 1 work offline for anonymous users (PWA as top-of-funnel)? | T19 scope | Open |
| **D5** | Keyword volume and CPC for B2B CTE terms (Google Keyword Planner) — is there enough search volume to spend $900 against? | Google Search test | Open |
| **D6** | Meta audience size and cost estimate for the B2C targeting | Meta test sizing | Open |
| **D7** | Email sending for marketing sequences — reuse existing transactional setup or separate ESP/subdomain? **Do not send marketing from the transactional domain**; deliverability damage hits password resets and verification | **S5** lead magnet, nurture sequence, **PA13** | Open |
| **D8** | Consent banner — build in-house vs. off-the-shelf CMP | T6 | Open |
| **D9** | Refund / access policy wording — required for paid-traffic trust and for Stripe disputes | Paid launch | Open |
| **D10** | Bundle price — **must sit above the $129 single course**. Old $69/$79 options were the $29-era leftover and would undercut the live SKU. Also: does a correctly priced bundle cannibalize singles? | T16 / MM1 | Open |
| **D11** | Public marketing video hosting — reuse signed CloudFront HLS or a separate public path? Signed URLs expire and break social embeds | Creative distribution | Open |
| **D12** | Attach-rate reality check — validate the 20% / 10% course-2/course-3 assumptions once there is data | All CAC targets · **PA10** | Open |

---

## P1 — Product analytics (usage × entitlement × revenue)

*Canonical design: [`tech/product-analytics.md`](tech/product-analytics.md). **Build plan (schema, endpoints, screens, phases, backfill): [`tech/analytics-implementation-plan.md`](tech/analytics-implementation-plan.md).** Serves the offer ladder in [`sales/money-model.md`](sales/money-model.md) § 7b. **Not** Grafana/OTel — user-level analysis is a Postgres/ledger concern; OTel stays ops-only.*

**Tooling decision:** Postgres + SQL views now · extend `/admin/analytics` · Metabase only when a non-engineer needs self-serve · PostHog only for B2C marketing surfaces if at all (never org members) · no warehouse, no Segment.

*Phases 1–3 and MP1–MP7 shipped 2026-09-11 (see [`TODO_COMPLETED.md`](TODO_COMPLETED.md)); query cookbook: [`tech/analytics-queries.md`](tech/analytics-queries.md). Remaining follow-ups from that wave:*

| # | Item | Type | Status |
|---|------|------|--------|
| **PA41** | **Enable Stripe webhooks** — Stripe dashboard → add endpoint `https://thedroneedge.com/api/purchases/webhook` with `payment_intent.succeeded`, `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`; store the signing secret via Terraform (add a `stripe_webhook_secret` sensitive var + `aws_secretsmanager_secret_version`, same pattern as `test_user_password` — not `put-secret-value`); set `stripe_webhook_enabled = true`; deploy. Until then: one-time course purchases work (server-side `confirm-payment`), but Pro checkout never fulfils, renewals/failed payments/refunds are not recorded, and `/purchases/webhook` answers 400. Also blocks any Pro launch (`STRIPE_PRO_PRICE_ID_*` are empty in tfvars) | Ops | Not started |
| **PA39** | **Create the Grafana alert rules A1–A12, contact point, notification policy and health dashboard** per [`tech/observability.md`](tech/observability.md) (click-ops runbook § 6, ~45 min, after PA34 so the metrics exist). Free tier verified sufficient (10k series; we use ≈5–6k); first step is reading actual active series in Billing → Usage. Then export rule group + dashboard JSON to `docs/tech/grafana/` | Ops | Doc ready — PA34 shipped 2026-09-12, metrics now flowing; do now |
| **PA7** | Money-model offer events `upsell_*` / `downsell_*` / `kit_lead` / `pricing_viewed` / `checkout_started` from the purchase flow and pricing pages via `track()` (names are already in the allow-list; only the call sites are missing) (**T3**) | Build | Not started |
| **PA5b** | Remaining audit rows: `EXAM_SUBMITTED` is still only a product event, not an `audit_logs` row (**T2**). Pro cancel / expiry audit rows shipped | Build | Not started |
| **PA37** | Wire `signup_started` / `signup_completed` / `login` / `email_verified` / `invite_sent` / `invite_redeemed` / `class_created` product events from their server paths (today only audit rows exist for these) | Build | Not started |
| **PA38** | Sort manager progress table quietest-first by default and add the watch-% ring in the summary row (the lesson grid shows % per unit already) | Build | Not started |

### Manager progress visibility — follow-ups

*Plan: [`tech/manager-progress-visibility.md`](tech/manager-progress-visibility.md). MP1–MP7 shipped 2026-09-11.*

| # | Item | Type | Status |
|---|------|------|--------|
| **MP8** | YouTube / Vimeo embed instrumentation via player SDKs — **N/A**: every video in prod is self-hosted on `media.thedroneedge.com` (0 embeds in the 3 course payloads, checked 2026-09-12). Reopen only if an embed is ever added to a paid course | Build | Closed — **MPD2** |
| **MP9** | Per-class **teacher** role (manager scoped to a class) for districts with more than one teacher | Build | Deferred — **MPD5** |

| # | Question | Blocks | Status |
|---|----------|--------|--------|
| **MPD1** | Auto-complete a section at 90% video watched, or keep completion a learner action and show watch % beside it? Recommendation: manual for v1 — "watched but not completed" is a signal, not noise | MP4 | Open |
| **MPD2** | Instrument embedded YouTube/Vimeo players? — **Decided 2026-09-12: nothing needed.** Content is self-hosted; embeds would only ever be free/marketing clips and get `lesson_viewed` + heartbeats like any page | MP8 | Closed |
| **MPD3** | Teacher "inactive" threshold — **Decided 2026-09-12 with PD7:** 7 days for the classroom view ("Active this week"), 30 days contractual ("Active seats (30d)"); same query, two constants | MP5 | Closed |
| **MPD4** | Present heartbeat minutes to teachers rounded ("~20 min in course") or hide until **PD4** is settled? | MP5 | Open |
| **MPD5** | Do we need a class-scoped teacher role before the second multi-teacher school? | MP9 | Open |

### Phase 4 — act on it

| # | Item | Type | Status |
|---|------|------|--------|
| **PA13** | Trigger jobs for the signal→offer map (stalled purchaser, inactive Pro, completion upsell, low-utilization org) — blocked on ESP decision **D7** | Build | Blocked |
| **PA14** | Cohort/retention reporting; re-evaluate whether Metabase is warranted | Build | Not started |

### Phase 5 — store / physical goods (only when hardware demand is proven)

*Design: [`tech/product-analytics.md`](tech/product-analytics.md) § 9. Sequencing follows money-model § 3.2 — affiliate links first, inventory last. **Do not build a store**; Stripe Checkout first, Shopify only if it outgrows that, and either way orders must land in the `orders` table or every metric silently breaks.*

| # | Item | Type | Status |
|---|------|------|--------|
| **PA15** | `outbound_vendor_click` on the free parts list — the demand test, no store needed. Carry vendor, part, course context; reconcile monthly against affiliate statements (lossy by nature) | Build | Not started |
| **PA16** | `products` / `product_variants` catalog with **`related_course_id`** — the field that links hardware to learning (attach rate, offer placement, kit-owner completion lift) | Build | Not started |
| **PA17** | Stripe Checkout with shipping rates + Stripe Tax; orders and line items written through the existing webhook path | Build | Not started |
| **PA18** | Fulfillment state machine (separate from payment status), returns, `warranty_claim_filed` with part SKU | Build | Not started |
| **PA19** | `unit_cost_cents` (COGS at time of sale) on every order line; margin columns on `v_user_revenue` | Build | Not started |
| **PA20** | `v_sku_performance` + `v_course_hardware_attach` views | Build | Not started |
| **PA21** | `placement` on all offer events (`checkout_bump`, `post_purchase`, `in_lesson`, `completion_screen`, `profile`, `cart`, `email`) — turns "the upsell converts at 6%" into where to put it | Build | Not started |
| **PA22** | `cart_abandoned` + recovery trigger — a funnel stage that does not exist for one-click course purchase | Build | Not started |
| **PA23** | Manual PO orders (`payment_method = 'po'`) for school kit and seat deals, or the entire B2B hardware business is invisible | Build | Not started |
| **PA24** | `product_components` BOM — kit COGS computed from part costs, warranty claims map to a component, spares and kit parts share one catalog. Carry `joint_count` (already a decided BOM field) and `revision` on own-designed parts | Build | Not started |
| **PA25** | **Assembly-track metrics** — order mix by Solder / Pre-soldered / Plug-in, warranty + completion rate per track. Tests the ~50–70% no-solder market estimate against our actual buyers | Build | Not started |
| **PA26** | **Lost-deal reason on the quote record** (esp. "soldering") — cheapest signal in the hardware business, needs no engineering | Sales ops | Not started |

### Product-analytics discoveries

| # | Question | Blocks | Status |
|---|----------|--------|--------|
| **PD1** | Backfill historical revenue from the Stripe API into `transactions`, or start clean from launch? | PA1 | Open |
| **PD2** | FERPA / COPPA / state student-privacy obligations as a service provider — what must the DPA commit to for retention, deletion, and no-targeted-advertising? | PA6, VPAT/DPA packet | Open |
| **PD3** | `product_events` retention + rollup policy (raw rows pruned at 12–18 months?) | PA6, DPA | Open |
| **PD4** | Is dwell time from heartbeats trustworthy enough to quote to schools, or report sessions/lessons instead? | PA8 | Open |
| **PD5** | Grafana Postgres datasource — worth Private Data Source Connect (Aurora is private-subnet), or skip straight to Metabase later? | PA11 | Open |
| **PD6** | Aurora reader endpoint for BI/materialized-view refresh so analysis never hits the writer | PA10 | Open |
| **PD7** | "Active seat" — **Decided 2026-09-12:** a member with any learning event or progress write in the last **30 days** (contract wording); teacher view uses **7 days**. Login alone does not count. Surfaced as "Active seats (30d)" / "Active this week" on manager Overview and admin Organizations. **Track only for now — no email, no offer** attached to the number | PA12, quote template | Decided — quote-template wording still to write |
| **PD8** | Proactive utilization outreach (**MM9**) — **Decided 2026-09-12: track only.** Low-utilization orgs stay a `/reporting/signals` row + admin Signals tab; no nudge email, no renewal script yet. Revisit after the first renewal conversation | PA12 | Decided — no action |
| **PD9** | **Sales-tax nexus** — which states does selling physical goods create registration obligations in, and does Stripe Tax cover calc + filing? Digital course sales may be treated differently | PA17 | Open |
| **PD10** | **LiPo hazmat** (UN3480/3481) — can we ship batteries at all, or must they be dropshipped / customer-sourced? Determines whether a kit order splits across fulfillment sources | PA17, kit one-pager | Open |
| **PD11** | Print-on-demand vendor for merch, and does merch margin justify the dashboard noise? (Likely brand marketing, not a revenue line) | PA16 | Open |
| **PD12** | Returns / RMA policy for hardware — distinct from the digital refund policy (**D9**); restocking, damage, who pays return shipping | PA18 | Open |
| **PD13** | **Protection-plan pricing is actuarial** (**MM3**) — needs crash/replacement rate per part per class-year from warranty claims. First cohort is priced on a guess; cap the downside | PA18 | Open |
| **PD14** | Shopify trigger point — what SKU count / fulfillment complexity justifies a second system of record, given the order-sync cost? | PA17 | Open |
| **PD15** | Does kit ownership measurably lift Building-course completion? If yes it is a school sales argument backed by our own data | PA20 | Open |
| **PD16** | **Does removing soldering teach less?** Completion and build-outcome rate by assembly track. It is entirely possible no-solder sells more kits *and* teaches worse — measure both rather than assuming the commercial answer is the curricular one | PA25 | Open |
| **PD17** | Custom clip/connector parts — is designing our own worth it vs. the Pre-soldered SKU (~$15–20 our cost)? Compare joint-count reduction against per-unit cost, tooling, and failure rate per `revision` | PA24, kit one-pager | Open |
| **PD18** | Refund → revoke access? Recommendation: full refund revokes that line's entitlements (state change + audit row, never a delete); partial refund changes only the money | PA2, PA27 | Open |
| **PD19** | **Attribution when one user holds several entitlements to the same course** (own purchase + Pro + org seat). Recommendation: most specific paid wins — purchase/bundle > pro > org_seat > free; tie → earliest. Reporting rule only; `hasAccess` unchanged. Org utilization counts members regardless of attribution | PA10, PA27 | Open |
| **PD20** | Materialize org seats as `entitlements` rows, or derive from members × org courses in the view? Recommendation: derive — avoids fan-out writes when a course is attached to an org | PA27 | Open |
| **PD21** | Bundle revenue allocation per course — proportional to standalone price (recommended) or equal split? Computed at grant time, never recomputed | PA27, T16 | Open |
| **PD22** | When does `hasAccess` switch to `entitlements`? — **Decided:** behind `ENTITLEMENTS_AUTHORITATIVE`, enabled in the PA34 deploy (14-night wait waived on the strength of the prod-clone trace; `access_diff` keeps running nightly as the post-hoc gate). Granting access is unaffected: purchase, admin grant, signup link, Pro and org seats all keep working (they already write the ledger); only the *read* changes | PA27 | Decided → PA36 |
| **PD23** | Archive org-member raw events to S3 at the 12-month boundary, or delete? Recommendation: **delete** unless the DPA covers the archive and user deletion reaches S3; archive B2C partitions; keep rollups for everyone with cascade-on-delete | PA31, PD2 | Open |

---

## P2 — Blocked on first school pilot

| Item | Status | Trigger | Source |
|------|--------|---------|--------|
| **Case study article** (`school-06-case-study-template`) | Blocked | Pilot semester complete + written permission | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Pacing guide PDF + intro article** (`school-07`) | Blocked | Pilot year debrief | [`workflows/marketing/outreach-content-calendar.md`](../workflows/marketing/outreach-content-calendar.md) |

---

## P1 — B2C & conversion

*Open items only — shipped work in [`TODO_COMPLETED.md`](TODO_COMPLETED.md).*

| Item | Status | Source |
|------|--------|--------|
| **Public pricing page** (`/pricing`) | Not started | **S2** · GTM review |
| **Reduce signup friction for freemium** — defer email verify for Unit 1 preview only | Open | **S6** (partial) · Wave 2 |
| **Home page join CTAs** — Try Unit 1 free primary, purchase/preview secondary, header Sign up | Not started | **S3** · Wave 2 |
| **Testimonials / social proof** | Not started | **S4** |
| **Email capture / lead magnet** (e.g. free practice exam) | Not started | **S5** |
| **Fix or remove dead social links** (footer `#` hrefs; JSON-LD `sameAs`) | Open | **S7** |
| **Conversion funnel analytics** — signup_started, purchase_completed, consultation_submitted | Partial | **S10** — exam events sent but dropped by backend; signup/purchase missing · [`tech/analytics-and-attribution.md`](tech/analytics-and-attribution.md) Phase 1 |
| **Creative / STEM tracks** | **Pre-launch** — finish both tracks (P0) | **S11** (partial — track stubs exist) |

---

## P2 — Platform & engineering

*Wave sequencing:* [`tech/wave-1-2-implementation-plan.md`](tech/wave-1-2-implementation-plan.md). Full finding list: [`tech/app-review.canvas.tsx`](tech/app-review.canvas.tsx). **Done items archived in [`TODO_COMPLETED.md`](TODO_COMPLETED.md).**

| Item | Status | Source |
|------|--------|--------|
| **Replace dead NAT gateway `nat-06ee536000f46e33b`** — all external egress (Gmail SMTP 587, Stripe/Grafana 443) black-holed since Mar 24 2026 20:00 UTC; NAT reports "available" but CloudWatch `ConnectionAttemptCount`/`BytesOutToDestination` are zero while SYNs hit its ENI. Breaks register/password-reset (SMTP hang → CloudFront 504), Stripe, OTLP. Ship via pipeline (not a hand apply): `./pipeline.sh --env dev --backend-only --replace aws_nat_gateway.nat` — keeps EIP `52.7.240.103`. Same apply creates alarm `droneedge-dev-nat-no-egress` + SNS email to `james@thedroneedge.com` (confirm the AWS subscription mail). Then smoke-test one email + one Stripe call | **Open — P0, pipeline `--replace` + alarm wired (Aug 13 2026); awaiting deploy** | Register 504 investigation · `pipeline.sh` · `terraform/vpc.tf` · `terraform/alarms.tf` |
| **Verify prod video signing end-to-end** — smoke-test HLS after first video | Open | Wave 2 · P0 recordings |
| **Classroom / shared-IP rate limits** — WAF raised to 20k/5 min (Sep 17 2026) after Chichester NAT `50.227.29.34` got 403s. Nest still keys anonymous login/register/`POST /logs` by IP (30/min global, 10/min logs). A 30-student lab on one NAT will 429 at bell (login) and at the hour-mark (expired access JWT → IP fallback); quiet video playback is fine (per-user after login). **Proposed Nest pass first** (do not raise the global 30; do not start with a school IP-set): (1) `UserThrottlerGuard` verify with `ignoreExpiration: true` so expired cookies still key `user:${sub}`; (2) login/register **120/min/IP** plus **8/10 min per normalized username-or-email**, refresh **120/min/IP**; (3) stop shipping expected 401/429 to `/logs` (optionally raise `/logs` to 30/min once per-user). WAF path exclusions / school allowlist stay later — coffee shops and 1:1 NAT are the same class of problem. Do **not** just "tighten `/logs`" (M4). Detail below. | Open | Sep 17 classroom 403 review · `terraform/cloudfront_frontend.tf` · `UserThrottlerGuard` · `logging.controller.ts` |
| **Tighten `POST /logs`** — DTO done; throttle is **not** "make it stricter" (see classroom rate-limits row). Remaining: fold into that item — expired-JWT user key + don't POST expected 401/429; keep payload cap; auth on `/logs` still deferred | Open | Wave 1 · **M4** · classroom rate limits |
| **Analytics, pixels, attribution, PWA** — see **P1 — Paid acquisition build** above (T1–T20, D1–D12) | Sequenced | [`tech/analytics-and-attribution.md`](tech/analytics-and-attribution.md) · [`tech/pwa-and-mobile-app.md`](tech/pwa-and-mobile-app.md) |
| **Prod/dev environment split** | Planning only | [`tech/environment-split-plan.md`](tech/environment-split-plan.md) |
| **SSO / SAML, Google Classroom, LTI, roster sync** | Roadmap | [`sales/features.md`](sales/features.md) |
| **Course editor** — exam visual edit, preview pane, validation | Enhancement | [`tech/course-editing-roadmap.md`](tech/course-editing-roadmap.md) |
| **FAA category weighting in exam generation** — `exam_blueprint_buckets` table + `exams.blueprint_snapshot`, largest-remainder apportionment in `ExamGeneratorService`; today's unweighted draw gives ~24% Operations vs FAA 35–45% floor. Blocked on author confirming u4 bucket mapping | Proposed | [`tech/exam-weighting-plan.md`](tech/exam-weighting-plan.md) |
| **Course lesson list / markdown rendering** — `text_content` only does `\n` → `<br />`; markdown `-`/`*` bullets do not become lists. HTML `<ul><li>` works today via `prose` + `dangerouslySetInnerHTML` (used in Ch.5 Surface Obs). Add a small markdown→HTML (or sanitized rich-text) path so authors can write lists without raw HTML; keep sanitization in mind (**A8**) | Open | Ch.5 content pass · `drone/src/app/ui/components/unit.tsx` · `section.tsx` |

#### Classroom / shared-IP — 30-user notes (Sep 17 2026)

WAF 20k/5 min is already live. Remaining pain is **Nest IP buckets** on a shared NAT (school, coffee shop, 1:1). Do not raise the global 30/min (that is the per-user cap after login).

| Moment | Shared bucket | 30-user reality |
|--------|----------------|-----------------|
| Bell — everyone signs in | login **30/min / IP** | 30 clean logins = full. One typo / double-click / email-vs-username retry → room **429**. |
| Hour mark — access JWTs expire together | refresh + API retries fall back to **IP** (`jwt.verify()` throws on expiry) | 30 × (failed API + refresh + retry) ≈ **90** vs 30/min. |
| Quiet video lesson | per-user 30/min + analytics 120/min | Fine. Video bytes are CloudFront, not Nest. |
| `POST /logs` | **10/min / IP** if JWT missing/expired | Fine during playback. Overflows if many tabs error at once. |

**Proposed ship order**

1. **`UserThrottlerGuard`:** `verify` with `ignoreExpiration: true` (signature still required). Expired access cookie stays `user:${sub}` — fixes hour-mark stampede and most `/logs` IP collapse.
2. **Login/register** `@Throttle` **120/min/IP** (not the global 30) + **8/10 min per normalized username-or-email** (same `findForLogin` key). Stops one-account spray without punishing the lab. Keep login UI: disable submit while loading; existing shared-network 429 copy.
3. **`POST /auth/refresh` 120/min/IP** (refresh has no access JWT by design). Optional: single-flight refresh in `api-client`; proactive refresh at ~50 min later.
4. **`POST /logs`:** do not ship expected classroom noise (login 401, "Session expired", 429). Optionally raise to 30/min once per-user. Keep 8 KB context cap. Requiring auth on `/logs` stays deferred (login-page errors still useful).

**Defer:** school IP-set allowlist and WAF path exclusions (`/api/logs`, `/api/analytics/event`, `/_next/static`, favicon). Same class of problem exists off-campus; Nest pass is enough for 30.

### App Review — open / partial only

| ID | Item | Status |
|----|------|--------|
| **C3** | Hardcoded DB password in `terraform/database.tf` | **Open** — rotate + Secrets Manager / `random_password` |
| **H1** | Access/refresh tokens in localStorage + JS-readable cookie | **Open** — move to HttpOnly cookies (larger auth refactor) |
| **M1** | DB TLS `rejectUnauthorized: false` | **Open** — ship RDS CA bundle |
| **M2** | Unlimited exam retries; answer key via `GET …/attempt` | **Partial** — `sanitizeAnswers` strips keys on read; unlimited retries remain |
| **M3** | `GET /users/:username` returns email + role to any logged-in user | **Open** — return `UserSlim` or restrict to self/admin |
| **M4** | Unauthenticated `/logs` + `/analytics/event` ingestion | **Partial** — analytics DTO validated; `/logs` DTO exists; throttle still IP-keyed at 10/min (classroom 429s Sep 17 — see **Classroom / shared-IP rate limits**) |
| **L1** | SQL logging in prod; PII in logs; open Swagger `/api` | **Open** |
| **H2** | Orphaned question links in bulk JSON | **Partial** — import validates refs against `course_units`; reconcile bulk artifact orphans |
| **L1** | `Exam.question_ids` silent filter; deprecated `image_url` | **Partial** — `images_url` migration done; silent filter still by design |
| **A4** | Videos without captions/transcripts | **Open** — also P0 |
| **A5** | Primary CTA contrast fails in light theme | **Open** — `--brand-primary-contrast` token |
| **A6** | Form labels missing `htmlFor`/`id` in editors | **Open** |
| **A8** | Lesson HTML via `dangerouslySetInnerHTML` unsanitized | **Open** — DOMPurify |
| **D7** | Bare spinners; error component no retry | **Open** |
| **U1** | Unit pages are navigational dead ends | **Open** — breadcrumb + prev/next lesson |
| **U2** | Deep unit tree invisible (sidebar top-level only) | **Partial** — `CourseOutlineSidebar` with expand/collapse; no prev/next |
| **U3** | No overall course progress bar | **Open** |
| **U6** | Exam drafts lost on in-app navigation | **Partial** — `sessionStorage` + `beforeunload`; not `localStorage` / nav guard |
| **MA1** | Backend/frontend types drift | **Open** — generate from Swagger or shared package |
| **MA2** | Content tooling (outline→JSON ingest, repo↔DB sync) | **Open** — rebuild scripts removed; need parameterized pipeline |
| **MA3** | Docs drift from code | **Partial** — `frontend-data.md` refreshed Jul 2026; exam generator + course-editing roadmap stale |
| **MA4** | Test coverage near zero on risky paths | **Partial** — `exam-generator.service.spec.ts`, `course.service.spec.ts`; no e2e for import/submit/progress |
| **MA5** | Repo hygiene (stray files, duplicate Next config) | **Open** |
| **R1** | snake_case vs camelCase by module | **Open** — low priority |
| **R2** | Dead/broken code accumulating | **Open** — audit `course.controller`, mapper scripts |
| **R3** | `CourseService.updateCourse` fragile | **Open** |

### Tech plan — sequenced (Jul 2026)

**Detailed plan:** [`tech/wave-1-2-implementation-plan.md`](tech/wave-1-2-implementation-plan.md).

**Wave 1 — correctness**
1. **`POST /logs` classroom-safe ingest** (Sec M4) — not a stricter IP throttle; fold into **Classroom / shared-IP rate limits**.

**Wave 2 — launch-blocking product surface**
2. **Home page join CTAs** (Sales **S3**) — see P1 B2C.
3. **Reduce signup friction** — defer email verify for Unit 1 (Sales **S6**).
4. **Verify prod video signing** — HLS smoke test after first recording.

**Wave 3 — polish and hygiene**
5. **Frontend UX** — unit breadcrumbs/prev-next (**U1**), course progress bar (**U3**), exam draft nav guard (**U6** partial).
6. **Security hygiene** — TF DB password (**C3**), `/users/:username` slim profile (**M3**), DB TLS (**M1**).
7. **Docs drift** (MA3) — refresh exam generator + course-editing roadmap.
8. **Test coverage** (MA4) — import, exam submit, progress merge e2e.

**Wave 4 — post-launch / roadmap**
9. **Prod/dev environment split**
10. **Course editor** enhancements
11. **SSO / SAML, LTI, roster sync**
12. **HttpOnly auth cookies** (Sec H1) — larger refactor

---

## P3 — Automation & ops (when volume justifies)

| Item | Status | Source |
|------|--------|--------|
| Consultation form → CRM / tracker sync | Future | [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) |
| Mail-merge + follow-up reminders | Future | [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) |
| Contact collection scripts at scale | Planned | [`docs/sales/contact-collection.md`](sales/contact-collection.md) |

---

## How to add an item

1. Add a row under the right **priority + group** with `Open` / `Draft` / `Blocked` / `In progress`.
2. Link the **source doc** (not a chat thread).
3. When done, move to [`TODO_COMPLETED.md`](TODO_COMPLETED.md) with the ship date and delete the row here.

*Last reviewed: Sep 17 2026 — money-model gaps listed as TODO; $29-era CAC / $69 bundle retired (retail is $129). Sep 12: SpeedyBee smoke stopper; Video SKU parked. Sep 11: parts list v3. Sep 10: Money model. Sep 9: parts list v2.*
