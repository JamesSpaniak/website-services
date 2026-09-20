# drone-building (draft)

Initial **build / assembly** course intake. Not in the catalog. No `*_course.json`, questions, images, or videos yet.

**Current version: v3.4.** Drafting works from the v3 outline. Joe pushes hardware/build changes to `branch-joe`; we fold them in and bump the version.

| File | Version | Purpose |
|------|---------|---------|
| [`outlines/drone-building-course-outline-v3.md`](outlines/drone-building-course-outline-v3.md) | **v3.4 — draft from this** | Terms, locked decisions, tree, per-unit stems/leaves/labs/gates, kits, assessments, open items |
| [`reference/parts-list-draft-v4.md`](reference/parts-list-draft-v4.md) | **parts v4 — current** | Joe's Sep 12 list: matched F722 Mini V2 45 A stack ($90); Explorer XT30 pack, XR2, M4AC, SpeedyBee smoke stopper; Tony 5 / Video SKU parked; costs recast |
| [`reference/parts-list-draft-v3.md`](reference/parts-list-draft-v3.md) | parts v3 (superseded for parts) | Sep 11 split FC + HGLRC ESC desk check; Explorer pack and XR2 still stand |
| [`reference/parts-list-draft-v2.md`](reference/parts-list-draft-v2.md) | parts v2 (superseded for parts) | Sep 9 desk check; Solder/Pre-soldered market note |
| [`reference/build-steps-joe-v1.md`](reference/build-steps-joe-v1.md) | **build v1, Sep 12** | Joe's bench build of the v4 electronics, transcribed. First build rather than a plan: confirms the 20-joint tally and the Pre-soldered SKU boundary; adds a **fault-isolation tree** Unit 6 lacks. Conflicts C1–C7 (Tony 5 frame, XT60 pigtail, assembly order) in § 3; parts to confirm in § 4; photo/diagram shot list in § 7. Figures: [`reference/build-figures/`](reference/build-figures/README.md) — **vendor art, internal only** |
| [`reference/soldering-lab.md`](reference/soldering-lab.md) | research note, Sep 9 | Classroom soldering station cost (budget/standard/top-up tiers), class sizing, safety and published guidance, iron time, kit options A–D with the Pre-soldered SKU derivation, and the **course 2 "Drone Repair and Custom Builds" proposal (not locked)** |
| [`reference/cad-sim-extensions.md`](reference/cad-sim-extensions.md) | research note, Sep 16 | Print vs CNC, DXF vs CAM blocker, canopy materials, kit-pack markup context, Isaac Lab vs FreeCAD vs Betaflight SITL (shared plant, not shared brain), Unit 5/8 / course 2 hooks; continue from § 8 |
| [`reference/parts-list-draft-v1.md`](reference/parts-list-draft-v1.md) | parts v1 (superseded for parts) | Still current: frame material table, Part 107 module rules, goggles options, material-choice mechanism, v1 desk check |
| [`reference/getfpv-quote-2026-09-08.pdf`](reference/getfpv-quote-2026-09-08.pdf) | source | Joe's quote (six lines, $364.91) |
| [`reference/parts-list-template.md`](reference/parts-list-template.md) | template | Blank parts list for future kit revisions |
| [`cad/`](cad/README.md) | **cad 0.3 (Sep 12)** | Exact CAD framework (`scripts/dronecad`) regenerated from the v4 `bom.json`: 7 variants incl. `base-truss`, fit checks, FEA, Betaflight sim, print checks; Fusion reference frame analysed in `cad/generated/reference/` |
| [`cad/frame-215mm-study.md`](cad/frame-215mm-study.md) | **study, Sep 18** | Tony 5 / 215 mm frame decision record: 6 variants, input provenance, validation, corrections. **Q1 215 mm + current 3.5" powertrain passes (228.7 g); Q2 real 5" powertrain fails four ways.** Cited by parts v5 / outline v3.5 when folded |
| [`outlines/drone-building-course-review-v2.md`](outlines/drone-building-course-review-v2.md) | v2 review + v3 answers | Rationale, technical-value review, verified facts, Betaflight/sensor options, readiness |

Superseded files removed Sep 8 2026 (in git history at `8183817`): v0 `joe-drone-building-outline.txt` (Joe's Aug 5 topic list), v1 `drone-building-course-draft.md` (our first expansion), and v2 `joe-drone-build-feedback-v2.md` (Joe's Sep 6 feedback). Joe's originals remain on `origin/branch-joe` under `docs/building/`. Everything they decided is carried in the v3 outline and the review.

Open work is tracked in [`docs/TODO.md`](../../../docs/TODO.md) § Drone-building course.

Do not publish or add a homepage track from this folder. Part 107 remains canonical in [`faa-107/`](../faa-107/).
