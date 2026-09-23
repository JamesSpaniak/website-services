# Completed items (archive)

Items moved from [`TODO.md`](TODO.md) when shipped. **Each entry is dated** so you can prune old rows periodically.

---

## 2026-09-22

| Item | Notes |
|------|--------|
| **Terraform state moved to an S3 backend** | `s3://droneedge-tfstate-<account>/<project_name>/terraform.tfstate`, versioned, encrypted, TLS-only, 90-day noncurrent-version expiry. S3 **native** locking (`use_lockfile`, Terraform ≥ 1.10) instead of the DynamoDB table originally planned — one less resource, same guarantee. Key is derived from the `project_name` in the tfvars actually applied, not from `--env`, so `--tfvars prod.tfvars` cannot land in the dev state. New `terraform/bootstrap/` root module holds only the bucket, so an apply there can never touch the 128 real resources. `pipeline.sh` bootstraps + binds the backend on every run (`scripts/ensure-state-backend.sh`) and **refuses to apply** on: empty remote vs populated local, a short migration copy, or no state anywhere while the ECS cluster is live. `scripts/verify-state-backend.sh` rehearses the whole migration against a throwaway key. Removes the laptop → cloud state handoff entirely. Runbook: [`workflows/tech/terraform-state.md`](../workflows/tech/terraform-state.md) |
| **`.github/workflows/deploy.yml` rewritten** | Was red on all 15 runs and fired on every push to `main` with a no-tfvars `terraform apply`. Now `workflow_dispatch` only, wrapping `./pipeline.sh --env dev`, defaulting to `plan-only`, requiring a typed `deploy-production` confirmation, with a `concurrency` group. Still needs an OIDC role + `AWS_DEPLOY_ROLE_ARN` secret before it can run — fails at the credentials step by design until then |
| **NAT gateway replacement — verified already shipped 2026-08-13** | The `--replace` was run on Aug 13 2026 and the TODO row was never closed. Live check 2026-09-22: gateway is `nat-065c30853c561750e` (created 2026-08-13T15:03:50Z, not the `nat-06ee…` in the row), alarm `droneedge-dev-nat-no-egress` went OK at 18:46Z that day with no state change since, and the NAT has passed 110–170 MB/day outbound every day for the last week. Egress was never broken after Aug 13 |
| **Ten resources of accumulated state drift found and repaired** | The first S3-backed apply failed on `BucketAlreadyExists` and `Resource.AlreadyAssociated`: the local state was missing the Aug 13 NAT replacement (plus its SNS topic/subscription/alarm) and the ~Sep 20 analytics-archive bucket/IAM policy, so Terraform planned to **create** resources that already existed. Cause is the local state file itself — applies that reached AWS never reached this laptop's copy — i.e. exactly what the S3 migration removes. Production was never affected: the apply aborted before any ECS rollout, routing kept pointing at the live NAT, site stayed 200. Repaired by `state rm` + import of 9 resources and deleting the orphaned failed NAT `nat-052ab433525c90184`. State went 118 → 128 resources; plan now reports "No changes" |
| **Both drift gates were blind to creates** | `deploy-preflight.sh` and `verify-state-backend.sh` only flagged destroy/replace. When state *loses* a resource the signature is a **create**, so the rehearsal passed and the bad apply went ahead. Both now fail on unexpected creates too, excluding `aws_ecs_task_definition` (a new revision every apply is by design). Verified against the real drift: the fixed gate catches all 9 |
| **Post-deploy drift check added to `pipeline.sh`** | After a successful apply the plan should be empty; anything else means state and AWS diverged. Warns rather than fails, since adding a resource to the `.tf` files is a legitimate create and the rollout has already succeeded by that point. Covers every managed resource — it is a plan, not a list. Would have caught the Aug 13 divergence the same day |
| **`verify-state-backend.sh` was not as read-only as documented** | Binding a remote backend makes Terraform treat a legacy local state file as superseded: it rotates the content into `terraform.tfstate.backup` and truncates the original. The first rehearsal run emptied `terraform/terraform.tfstate` (no data lost — restored from `.backup`, 118 resources, serial 505). `TF_DATA_DIR` isolation covers `.terraform/` metadata but not the state file in the working directory; the script now saves and restores it, verified by identical md5 before and after |
| **`stripe_webhook_secret` added to `reconcile-state.sh`** | It was the one declared secret shell the reconciler did not cover. Harmless while `stripe_webhook_enabled = false`, a real gap once **PA41** turns it on. Note the reconciler handles secret *shells*: only `db_credentials` and `test_user_password` have terraform-managed *values*, so a value changed out of band on the other six is invisible to both it and `terraform plan` |
| **Committed-state exposure — re-measured, far smaller than recorded** | The P0 row claimed 276 secrets on `origin/main` across 7 commits since Feb 17. Actual: **no commit on any remote branch has ever contained a state file** (verified by scanning every commit's tree on all four remote branches, with a control file to prove the scan works). The two commits that added it (`cdbaf20`, `c588938`) are unreachable local objects orphaned by an earlier rebase; commit `6055706`, cited as the untracking commit, does not exist in this repo. No history rewrite or force-push needed — `scripts/purge-state-from-history.sh` classifies the two cases and, for orphans, does a local GC only |

## 2026-09-17

| Item | Notes |
|------|--------|
| **Right-size compute at low load** | **Deferred** — class-hour peak ~4% API CPU; options captured in [`tech/architecture.md`](tech/architecture.md) § Cost down at low traffic. Not pursuing until post-classroom WAF/login soak |

## 2026-09-15

| Item | Notes |
|------|--------|
| **U4** Mark complete & continue | Leaf lessons get a visible CTA; passing a scoped quiz (≥70) auto-marks that unit. Admin funnel adds **Quiz passed** plus exam rows that expand to who/score/when. `GET /reporting/courses/:id/exams/:examId/attempts`. |
| Manager quiz gradebook | Course Progress: Quizzes + Effort columns, lesson-grid **Q** scores, student **Quizzes** tab (`GET /organizations/:id/members/:userId/exams`). Effort = passing / trying / struggling / stopped / browsing / not_trying. Client now emits `exam_started` with exam_id. |
| Kit parts on a third-party frame mesh | `frame_stl` variants in `dronecad`: the STL becomes the frame solid (build123d `Mesher`), mount patterns / plate levels detected from the mesh, re-centred and rotated into kit axes, all components + exact checks + FEA (gmsh on the STL) + slicer run unchanged. Printed stack adapter and per-motor adapter discs added automatically when patterns differ. New `reference-fusion` variant: 20/21 checks — the kit's 3.5" props pass 2.0 mm from the Fusion frame's deck posts (frame drawn for 3" props). `dronecad compare` subcommand; voxel script skips mesh-frame variants. Existing variants verified output-identical after the `_frame_printed` / `_frame_from_mesh` / `_components` split |

## 2026-09-14

| Item | Notes |
|------|--------|
| CAD tooling on the dev Mac | OrcaSlicer 2.4 and FreeCAD 1.0 via Homebrew casks; OCP CAD Viewer 4.0.1 installed in Cursor from the GitHub VSIX (not on Open VSX) with `ocp_vscode` in `scripts/.venv-cad`. `dronecad build` now drives Orca's CLI (bundled profiles flattened through the vendor index, `from: system` so the compat check passes, totals read from the 3MF's embedded G-code) and reports real filament/time per part; `DRONECAD_ORCA_MACHINE` selects the printer. New `dronecad view -v VARIANT` pushes the labelled assembly to the viewer panel. All 7 variants regenerated |

## 2026-09-12

Drone-building CAD moved from a single script to the **`scripts/dronecad` framework** (kit-agnostic CLI; see [`cad/README.md`](../assets/courses/drone-building/cad/README.md)).

| Item | Notes |
|------|--------|
| Frame topology from the Fusion reference, parametric | `arm_style: truss` (vertical Warren truss), `truss-flat`, `keel`, `plate_cutouts`, `root_fillet`; exact arm sections (`part & slab` → I, A, c) drive the beam check; new `base-truss` variant. Reference frame kept as `cad/reference/fusion-frame-20260911.stl` and analysed by `dronecad reference` (hole-pattern recognition → 30.5 stack, Ø9 motors, 166 mm wheelbase, 23 mm clear, 42 g PETG, FEA) |
| Component fidelity | Tier-C `parts/<component>/part.step` hook, connector bodies, RF keep-outs (BeeID cone, RX antenna) with a keep-out check, tower/T antenna from `bom.json`, wires swept along splines (exact lead length, mass from volume, inside the 3 mm prop shell check) |
| Manufacturability | Per printed STL: overhang share > 45° (bed layer excluded), thin walls by 2-D opening of slices, holes < Ø2 from cylinder faces, filament g and print time from a shell/infill model; PrusaSlicer/Orca CLI hook; guard exported ring-down, all parts placed on the bed |
| Simulation | gmsh tet10 mesh of the bottom frame + numpy/scipy solver (one LU reused): max thrust, 10 g vertical / lateral crash, first 3 modes with lumped tip masses — validated on a cantilever; Betaflight 4.5 default-PID angle-mode sim with a 5 m/s side gust; thrust-stand CSV fit (Ct/Cp); ESC ΔT estimate. CalculiX not needed (not in Homebrew) |
| Tooling | `scripts/.venv-cad` gains `gmsh`, `scipy`; `build_drone_cad.py` is a wrapper; voxel script fixed for the XT30 rename; `.gitignore` tracks `reference/*/reference-report.md` + `reference.json` |

Analytics hardening + prod-clone rehearsal, then the **production deploy** of the whole analytics wave (PA34 + PA35 + PA36 in one run, 12:37 UTC).

| Item | Notes |
|------|--------|
| **PA34 deployed** | `./pipeline.sh --env dev` — frontend task def :23, backend :24 (image `df134b5-202609120833`). Migrations `1764000000000` + `1765000000000`–`1765000003000` ran on boot; verified in prod DB via a read-only `ecs run-task`: 8 new tables, 7 materialized views, partitions `y2026m08`–`y2026m12` + default, entitlements backfilled (1 admin_grant = 1 legacy row), `access_diff` = 0. First attempt hung because task def referenced the empty `stripe-webhook-secret` (see below); old task kept serving throughout, no downtime |
| **PA35 applied** | Bucket `droneedge-dev-analytics-archive`, lifecycle, policy, attachment created; `ANALYTICS_ARCHIVE_BUCKET` / `ANALYTICS_RETENTION_MONTHS=12` live on the task |
| **PA36 live** | `ENTITLEMENTS_AUTHORITATIVE=true` on task def :24 — `hasAccess` reads the ledger in prod. Rollback: `entitlements_authoritative = false`, redeploy |
| Env-var propagation fixed | Task definitions no longer `ignore_changes = [container_definitions]`; `pipeline.sh ecs_force_deploy` deploys the family's newest revision (Terraform's) instead of cloning the service's current one. Root cause of `SEED_TEST_DATA` / `STRIPE_PRO_PRICE_ID_*` never reaching prod. `seed_test_data` set **false** in `env/dev.tfvars` (prod; weak test password) |
| `STRIPE_WEBHOOK_SECRET` conditional | New `var.stripe_webhook_enabled` (default false) gates the secret reference so an empty secret cannot block task start. Flip after the Stripe endpoint + secret value exist |
| Ingest / maintenance observability | OTel `product_events.accepted{source}`, `.dropped{reason}`, `.failures{stage}`, `orders.record_failures`, `analytics.maintenance.step_ms{step,status}`, `.failures{step}`, `.lock_skipped`, gauge `analytics.reconcile.mismatches{check}` — bounded labels only. Alert rules themselves: PA39 |
| Nightly job cluster-exclusive | `pg_try_advisory_lock` around `AnalyticsMaintenanceService.runAll()`; second instance logs + counts a skip |
| Silent order loss closed | Reconciliation `paid_grant_without_order` (+ informational `legacy_purchase_without_order`, excluded from clean nights); `POST /purchases/admin/backfill-order` repairs from Stripe by PI id, user × course metadata search, or all flagged |
| PD22 gate + switch | `access_diff` reconciliation check (legacy rule ⟂ ledger rule per user × course) and `ENTITLEMENTS_AUTHORITATIVE` flag in `CourseService.hasAccess` → `EntitlementService.hasLiveAccess`; `/reporting/health` reports gate checks + flag |
| Frontend delivery guarantees | `track()` queue mirrored to `sessionStorage`, requeue + backoff on network/429/5xx (5 attempts), drop on 4xx, flush on `online` |
| PA36 flag on + trace | `entitlements_authoritative = true` in `env/dev.tfvars` (ships with PA34). Live trace on the prod clone through the real Nest services: 39 pairs identical flag off/on; admin grant → revoke, single-course purchase (no subscription), legacy-only repair, Pro upgrade → expiry, org seat all correct with the flag on. Hardening: `grantCourse`/`syncPro` rethrow when authoritative, `entitlements.write_failures{op}` counter, `purchaseCourse` / `grantCourseAccess` repair a legacy-only row instead of refusing |
| PA35 Terraform written | `terraform/analytics_archive.tf` (bucket, public-access block, versioning, AES256, Glacier IR day 0, task-role `s3:PutObject`), `ANALYTICS_ARCHIVE_BUCKET` / `ANALYTICS_RETENTION_MONTHS` / `ENTITLEMENTS_AUTHORITATIVE` env on the API task via `var.analytics_retention_months` / `var.entitlements_authoritative`. `terraform validate` clean; **apply pending** (PA35 row stays open until applied) |
| Metric cardinality fix | `page.view{path,referrer}` → `{route,channel}` (route template + direct/internal/search/social/other), `article.view`/`course.view` drop `title`, `auth.*` drop `user_id`/`username` — keeps us well inside the Grafana free tier's 10k series |
| `docs/tech/observability.md` | Free-tier capacity assessment (10k series / 50 GB / 14 d — we use ≈5–6k), instrument inventory, alert rules A1–A12 with PromQL + actions, dashboard spec, contact-point policy, runbook |
| **PA40** privacy copy | `privacy/page.tsx` § 4 (org admins see progress), § 6 (first-party analytics + anonymous id + no third-party pixels), § 7 (12-month raw retention, deletion on request); `PRIVACY_LAST_UPDATED` → 2026-09-12. `UserService.deleteUser` now also clears the FK-less `product_events`, `product_events_daily`, `exam_attempt_history` rows so the promise holds. Sales Agreement § 10 PDF still to re-sync |
| Decisions recorded | **PD7** active seat = learning activity in 30 d (contract) / 7 d (teacher) — track only, no email/offer; **MM9 / PD8** track only; **MPD2 / MP8** closed (all video self-hosted, 0 embeds in prod); **MPD3** 7 days; **PD22** flag-based flip. Manager Overview + admin Organizations relabeled "Active seats (30d)" / "Active this week" |
| First-party anonymous id + identity stitch | `localStorage['de:anon']` sent with every batch; server keeps intent events only (never `page_view`, never learning events); `identified` event from `AuthProvider` once per user per browser, skipped for org members; cookbook Q3.7 pre-signup funnel |
| Prod clone / migration rehearsal | `scripts/prod-db-clone.sh` + `prod-db-clone-restore.ts`, runbook `workflows/tech/prod-db-clone.md`. Ran 2026-09-12 against prod (PG 17.7, 13 users, 2 orgs): 5 pending migrations < 1 s, nightly job clean, all 7 reconciliation checks 0 |

## 2026-09-11

Product analytics + manager progress visibility wave. Design: [`tech/analytics-implementation-plan.md`](tech/analytics-implementation-plan.md) · queries: [`tech/analytics-queries.md`](tech/analytics-queries.md). **Not yet deployed** — see PA34/PA35 in `TODO.md`.

| Item | Notes |
|------|--------|
| **PA1 · PA28 — `orders` / `order_items` / `products`** | Migration `1765000002000`; catalog seeded (COURSE_{id}, PRO_MONTHLY/YEARLY, SEATS_*); orders written from `payment_intent.succeeded` / `invoice.paid` idempotently on Stripe ids; `unit_cost_cents`, `placement`, `offer_id` on lines. `backend/src/commerce/` |
| **PA2 — Pro renewals, refunds, failed payments** | `invoice.paid` → Pro order + `pro_started`/`pro_renewed`; `invoice.payment_failed` → `pro_payment_failed`; `charge.refunded` → `OrderService.applyRefund` (full refund revokes entitlements + legacy rows, bumps `token_version`, `REFUND_ISSUED` audit) |
| **PA3 — Manual / PO orders** | `POST /orders/manual` (admin; card·invoice·po·comp) grants courses / bundles (proportional price allocation) / Pro / seats; `GET /orders`, `/orders/:id`, `/orders/products`, `GET /users/me/entitlements` |
| **PA27 — `entitlements` ledger** | Dual-written from purchase, admin grant/revoke, signup link, Pro upgrade/sync/cancel/expiry; backfilled from `user_courses_purchased` + Pro users; partial unique indexes; nightly reconciliation (4 checks) logged to `analytics_reconciliation`. `hasAccess` unchanged (PD22 gate) |
| **PA4 — `progress` timestamps** | `created_at`, `completed_at`, `last_activity_at`, `unit_completed_at` jsonb; backfilled from audit rows (migration `1765000000000`); `course_units.has_video` |
| **PA5 (partial) — Pro audit rows** | `PRO_EXPIRED`, `PRO_CANCELLED`, `ORDER_RECORDED`, `REFUND_ISSUED` audit actions. `EXAM_SUBMITTED` audit row still open (PA5b) |
| **PA6 · MP3 — `product_events` + write path** | Monthly RANGE partitions, default partition, `ensure_product_events_partition()`; `POST /analytics/event` accepts single or `{events:[…≤50]}`, `OptionalJwtAuthGuard`, 120/min per user; server stamps org/class/entitlement source, drops course-scoped events the user cannot access; server-side events from progress, exams, purchases, Pro lifecycle. `backend/src/product-events/` |
| **PA8 · MP4 — heartbeat + video tracking** | `useLessonHeartbeat` (30 s, visible + not idle 5 min or video playing) → `lesson_viewed` / `lesson_heartbeat`; `video.tsx` tracks watched ranges (seek-aware), `video_started` / `video_progress` 25·50·75 / `video_completed` ≥ 90 % / `video_position`; `video_progress` table upserted server-side; `track()` batches (5 s / 20 events / pagehide via sendBeacon) |
| **PA33 — Video resume** | `GET /courses/:id/units/:ref/media` returns `{ video_url, resume }`; hls.js `startPosition`; "Resume from m:ss · Start over" chip; `localStorage` mirror every 5 s as fallback |
| **PA9 — Exam attempt history** | `exam_attempt_history` append-only with `attempt_no`, `section_breakdown`; seeded from `exam_attempts`; `exam_submitted` + per-section `exam_category_scored` events |
| **PA10 · PA30 — Materialized views** | `v_user_entitlements` → `v_user_course_usage` → `v_entitlement_utilization` → `v_user_revenue`, `v_org_utilization`, `v_course_funnel`, `v_cohort_retention` (migration `1765000003000`), unique indexes for `CONCURRENTLY`; refreshed by `AnalyticsMaintenanceService` at 00:30 UTC |
| **PA31 — Partitions, rollup, archive** | Cron: partitions 3 months ahead → `product_events_daily` rollup (last 2 days) → expire Pro entitlements → refresh views → reconcile → archive partitions older than `ANALYTICS_RETENTION_MONTHS` to `s3://$ANALYTICS_ARCHIVE_BUCKET/product_events/*.ndjson.gz` (non-org rows only, PD23), DETACH + DROP. No-op until the bucket exists (PA35). `POST /reporting/refresh` runs it on demand |
| **PA32 — Per-user throttling** | `UserThrottlerGuard` keys by JWT `sub` (cookie or Bearer) else IP; global limit unchanged at 30/min; `/analytics/event` 120/min |
| **PA11 — Admin reporting** | `backend/src/reporting/` (`/reporting/overview·activation·utilization·revenue·pro·organizations·organizations/:id·courses/:id/funnel·cohorts·signals·health·export/:report.csv`); `/admin/analytics` sub-tabs Overview · Revenue · Courses · Organizations · Pro · Signals · Activity with CSV links and a "Refresh views" button |
| **PA29 — User 360** | `GET /reporting/users/:id`; `User360Panel` inline on `/admin/users` (expanded row) and as a drawer from Signals / Pro rows |
| **PA12 — Manager overview** | `/manager/overview` (new default tab): live seat utilization (`GET /organizations/:id/utilization`), class-time bars + per-student engagement (`GET /organizations/:id/engagement?days&classId`), stalled badge (14 d) |
| **MP1 — Unit × student grid** | `/manager/progress` renders the lesson grid from the detailed endpoint: status glyph + video % per unit, completion tooltip |
| **MP2 · MP5 — Summary columns** | `MemberCourseProgressSummary` + `started_at`, `completed_at`, `last_activity_at`, `minutes_7d`, `videos_completed/total`, `exams_taken`; Videos / Time 7d / Last active columns; course header shows active-this-week and class hours |
| **MP6 — Learning timeline** | `GET /organizations/:id/members/:userId/timeline` (30 d, no heartbeats); manager activity panel toggles Learning (30d) / Account |
| **MP7 — CSV export** | `GET /organizations/:id/progress/export.csv?classId=` + Export button; emits `org_progress_exported`; `manager_dashboard_viewed` on overview/progress |
| **Query cookbook** | [`tech/analytics-queries.md`](tech/analytics-queries.md): every table/view, ~45 queries with what each returns and which screen it feeds, snapshot-report recipe, interpretation table |

---

## 2026-09-01

| Item | Notes |
|------|--------|
| **Organization classes (periods)** | One org can now hold multiple classes (e.g. "Period 2" / "Period 5") under one teacher: `organization_classes` table + nullable `class_id` on members/invites/class exams (migration `1762600000000`); class CRUD + member-class endpoints; class-aware invites (single/bulk, email + register page show class), progress filter, class-targeted exams; admin classes panel, manager classes/filters, **manager bulk invite panel**. Design: [`tech/organization-classes-plan.md`](tech/organization-classes-plan.md) |

---

## 2026-07-08

| Item | Notes |
|------|--------|
| **Deploy current application code to production** | Latest backend + frontend stack live |
| **Deploy restructured FAA Part 107 course** | `faa_107_course_restructured.json` uploaded to prod (171 nodes, unit rebalance, author text edits, markdown cleanup) |
| **Update Part 107 question bank on course** | Unit-level bulk import deployed (`faa_107_questions_unit_level.bulk.json`) |
| **Deploy latest course + question JSON** | Prod course payload + question bank aligned with unit-refs migration |
| **Question bank unit-level scoping** | Scoped quizzes use unit refs; sub-unit coverage model retired for Part 107 |

---

## 2026-07-05

App Review canvas reconciled into grouped tracker.

| Item | Notes |
|------|--------|
| **Exam scope reuse (DM H3)** | Scope-ref set equality in generator reuse query · `exam-generator.service.spec.ts` |
| **Class exam student flow (G2)** | `GET /exams/class/assigned`, hub section, `/exams/assigned/[examId]`, org access without purchase |
| **Org dashboard payload perf** | `course_units` counts + stripped skeleton · `organization.service.ts` |
| **npm vulnerability fixes** | 0 vulns both apps · [`tech/dependency-audit.md`](tech/dependency-audit.md) |
| **CloudFront paid video auth** | HLS signed cookies; prod fail-closed · `signed-url.service.ts` |
| **App Review security — C1** | `ValidationPipe({ whitelist: true })` + `UpdateUserDto` excludes `role` |
| **App Review security — C2** | `assertManagesOrg(orgId)` on every manager call |
| **App Review security — H2** | Prod fail-closed signing in `SignedUrlService` |
| **App Review DM — H1, H4, H5** | String refs + `course_units`; sparse `unit_statuses`; single `ProgressService` |
| **App Review DM — H3** | Exam reuse scope equality (see above) |
| **App Review DM — M1, M2, M3, M4** | `figure_ref` export/import; string `UnitData.id`; `latest_exam_score` fix; legacy embedded-exam removal |
| **App Review frontend — A1, A2** | Keyboard-accessible section accordions + status menu |
| **App Review frontend — D1, D2, D4** | Token-based manager dashboard; theme-aware prose; Stripe dark mode |
| **App Review frontend — U5, U7** | Exam question palette; `AuthGuard` on unit pages |

---

## 2026-07 (B2C conversion wave)

| Item | Notes |
|------|--------|
| **Public course marketing page** | `/courses/[id]/preview` — SEO, FAQ, price badge, outline (**S1**, **S8**, **S9**) |
| **Price on catalog cards** | Preview-first + try free / purchase CTAs (**S2**) · `course-preview.tsx` |
| **Login redirect + purchase intent** | `?redirect=`, sessionStorage, reconcile (**S6**) |
| **Login page conversion panel** | `login-conversion-panel.tsx` |
| **Preview page dual CTAs** | `course-preview-actions.tsx` |
| **Purchase reconcile endpoint** | `POST /purchases/confirm-payment` |
| **Freemium preview + $29 retail path** | Preview page + sitemap (**S1**/**S2**/**S8**/**S9**) |
| **B2C conversion funnel (core)** | Register redirect, purchase reconcile, preview/catalog CTAs |

---

## 2026-07 (earlier)

| Item | Notes |
|------|--------|
| Sales playbooks | `go-to-market-review`, `phone-scripts`, `delivery-runbook`, outreach calendar |
| P0 article JSON + heroes | `school-01`, `school-02` ready in repo |
| Email Part 107–first alignment | `email-drafts.md`, `outreach.md` follow-up |
| Unit refs / `course_units` migration | App Review DM H1/H4/H5 · [`tech/unit-refs-migration.md`](tech/unit-refs-migration.md) |
