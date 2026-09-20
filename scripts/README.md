# Scripts index

Scripts stay in this flat directory. See [`docs/SKILLS.md`](../docs/SKILLS.md) for task → script mapping.

## Sales / outreach

| Script | Purpose |
|--------|---------|
| `collect_school_contacts.py` | Scrape public district pages → `outreach/contact-candidates.csv` |
| `import_district_research.py` | Normalize `outreach/DroneEdge School District Research.xlsx` → `school-district-research-contacts.csv` (+ optional merge into candidates) |
| `draft_contact_emails.py` | Generate draft emails from approved contacts |
| `contact_sources.yaml` | Seed URLs for PA district collection |

## Marketing / content

| Script | Purpose |
|--------|---------|
| `build_news_article_json.py` | Convert `assets/articles/drafts/*.txt` → import JSON |
| `brand_story11_images.py` | Branded hero images (`assets/visuals/Logo`, `assets/articles/images/`) |
| `brand_school_article_images.py` | School article heroes (P0 B2B outreach) |
| `build_merch_art.py` | T-shirt print files + tee mockups from brand SVGs → `assets/visuals/Assets/Merch/` (needs `fonttools` venv, Google Chrome, brand TTFs) |

## Course / instructional

| Script | Purpose |
|--------|---------|
| `build_faa_107_questions.py` | Question bank generation → `assets/courses/` (legacy sub-unit scoping) |
| `build_unit_level_questions.py` | Author's sorted CSV → unit-level bulk import + review CSV |
| `course_question_mapper.py` | Map questions to course units |
| `course_images.py` | Bulk course images: map folder→units, upload to media S3, merge `images_url` (see [`workflows/tech/course-images.md`](../workflows/tech/course-images.md)) |
| `export_general_operations_review.py` | Ops-category review export |
| `build_drone_model.py` | Drone-building kit: 1 mm voxel 3-D layout models + physics (STL/OBJ, sketches, mass/CG/inertia, thrust/hover, beam check, hover sim) from `assets/courses/drone-building/cad/{bom,variants}.json` → `cad/generated/`. Pure stdlib; `--png` needs Google Chrome. See [`cad/README.md`](../assets/courses/drone-building/cad/README.md) |
| `dronecad/` (`python -m dronecad`) | **Exact-CAD framework** for drone kits (build123d + gmsh + scipy in `scripts/.venv-cad`): `build` a kit's variants → STEP for Onshape, printable `print/*.stl`, glTF + `viewer.html`, exact interference / prop-shell / keep-out checks, swept wires, mass properties, section beam check, **tet10 FEA** (thrust, 10 g crash, first modes), Betaflight-default PID sim with gust, ESC thermal, print checks (overhangs, thin walls, holes, filament/time — real figures via the OrcaSlicer/PrusaSlicer CLI when installed); `view -v VARIANT` pushes the labelled bodies into the OCP CAD Viewer panel; `reference FRAME.stl` analyses a third-party frame against the kit (hole patterns, wheelbase, fit, FEA); a variant with `frame_stl` mounts the whole kit on an imported frame mesh (adapters printed where mounts differ); `compare` rewrites the comparison table; `-k DIR` for other kits. `build_drone_cad.py` is a thin wrapper. See [`cad/README.md`](../assets/courses/drone-building/cad/README.md) |
| `refactor_course_goals.py` | One-off: merge unit descriptions into goals |
| `plaintext_course_text_content.py` | One-off: strip markdown from unit bodies |

## Infra / devops

| Script | Purpose |
|--------|---------|
| `bulk-upload-videos.sh` | S3 raw video bulk upload |
| `upload-faa-107-videos.sh` | Upload reviewed FAA 107 filename→unit mappings with canonical keys and optional MediaConvert verification |
| `reconcile-state.sh` | Terraform state reconciliation (sourced by pipeline) |
| `deploy-preflight.sh` | Read-only pre-deploy gate: toolchain, AWS identity, state freshness, `--plan` destroy check (see [`workflows/tech/deploy-from-cloud.md`](../workflows/tech/deploy-from-cloud.md)) |
| `cloud-setup.sh` | Source of truth for the Claude Code cloud environment **Setup script** field (installs AWS CLI + Terraform); not run from the repo |
| `cloud-session-start.sh` | SessionStart hook (`.claude/settings.json`) — starts `dockerd` in cloud sessions, no-ops locally |
| `generate-api-types.sh` | Regenerate frontend types from OpenAPI |
| `prod-db-clone.sh` (+ `prod-db-clone-restore.ts`) | **Migration rehearsal.** `dump`: one ephemeral Fargate task (current prod task definition, read-only SELECTs, PII scrubbed in flight) → CloudWatch → `/tmp/proddump/tables/*.json`. `restore`: local Postgres 17 with prod's schema + data, then runs every migration pending in this checkout and the nightly analytics job, printing reconciliation. Creates nothing in AWS. See [`workflows/tech/prod-db-clone.md`](../workflows/tech/prod-db-clone.md) |

## Analysis (adhoc)

| Script | Purpose |
|--------|---------|
| `analyze_fulllogs.py` | VPC flow log summary (`assets/archive/fulllogs.csv`) |

Removed: `rebuild_unit*.py` (superseded by editing `assets/courses/faa-107/faa_107_course.json` directly).
