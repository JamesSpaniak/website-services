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
| **Finish video recordings for all FAA Part 107 course content** — record, upload to `media.thedroneedge.com`, set `video_url` on units/sections in course payload, redeploy | **Open** — 197 unit/section nodes, **0** with video today | User · [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) |
| **Finish Video & Photography + AI & Drones courses** — full curriculum, questions, and track pages live before **initial launch** (home `/` promotes all three tracks) | **Open — pickup next** after Part 107 recordings | User · `drone/src/app/page.tsx` · `/courses/tracks/video` · `/courses/tracks/ai` |
| **Captions / transcripts for course video** (WCAG 1.2.2) — plan alongside or immediately after recordings | Open | [`tech/app-review.canvas.tsx`](tech/app-review.canvas.tsx) A4 · [`sales/features.md`](sales/features.md) roadmap |
| **Insert course images into Part 107 payload** — author has images ready in a separate folder; upload to media bucket, set `images_url` on flagged leaves (lat/long globe, sectional chart samples, MEF, load-factor charts, airport ops, etc.) | **Open** — see per-unit image list | [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) § Author content-review intake |
| **Part 107 post-restructure follow-ups** — leaf `ExamPlayer` removal on content-only leaves; carry over or re-tag **FINAL_EXAM** pool items (unit-level bulk has no final-exam rows yet); unit 5 author notes | **Open** | [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) |
| **Review open questions from unit-level bulk import** (Jul 8 2026) — 8 broken source rows excluded from `faa_107_questions_unit_level.bulk.json`: 5 with answer "D" but only 3 choices (likely missing "all of the above"-style choice; sheet rows 197, 294, 512, 584, 587) and 1 Figure 75 R-2305 question with a single choice (rows 79/164/466); fix in the author's sheet, re-run `scripts/build_unit_level_questions.py`, re-import. Also spot-check the 23 keyword-inferred mappings (`imported_inferred`) | **Open** | [`assets/courses/faa_107_questions_unit_level_review.csv`](../assets/courses/faa_107_questions_unit_level_review.csv) |

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
| **Expand & publish B2C articles** — study guide (A), practice questions (B), $29 vs ground school (C) | Draft JSON in repo | [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Resolve Hidden "AI & Drones" article** in prod — publish, merge, or retire | Open | Prod admin · [`marketing/article-inventory.md`](marketing/article-inventory.md) |
| **Replace `hero-default.svg`** on older story/advance articles where still default | Open | [`assets/news/articles/manifest.json`](../assets/news/articles/manifest.json) |
| **SEO/GEO cadence** — Search Console, monthly GEO query log | Ongoing | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) |

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
| **Conversion funnel analytics** — signup_started, purchase_completed, consultation_submitted | Partial | **S10** — exam events exist; signup/purchase missing |
| **Creative / STEM tracks** | **Pre-launch** — finish both tracks (P0) | **S11** (partial — track stubs exist) |

---

## P2 — Platform & engineering

*Wave sequencing:* [`tech/wave-1-2-implementation-plan.md`](tech/wave-1-2-implementation-plan.md). Full finding list: [`tech/app-review.canvas.tsx`](tech/app-review.canvas.tsx). **Done items archived in [`TODO_COMPLETED.md`](TODO_COMPLETED.md).**

| Item | Status | Source |
|------|--------|--------|
| **Verify prod video signing end-to-end** — smoke-test HLS after first video | Open | Wave 2 · P0 recordings |
| **Tighten `POST /logs`** — DTO + stricter throttle (Sec **M4**) | Open | Wave 1 |
| **Prod/dev environment split** | Planning only | [`tech/environment-split-plan.md`](tech/environment-split-plan.md) |
| **SSO / SAML, Google Classroom, LTI, roster sync** | Roadmap | [`sales/features.md`](sales/features.md) |
| **Course editor** — exam visual edit, preview pane, validation | Enhancement | [`tech/course-editing-roadmap.md`](tech/course-editing-roadmap.md) |

### App Review — open / partial only

| ID | Item | Status |
|----|------|--------|
| **C3** | Hardcoded DB password in `terraform/database.tf` | **Open** — rotate + Secrets Manager / `random_password` |
| **H1** | Access/refresh tokens in localStorage + JS-readable cookie | **Open** — move to HttpOnly cookies (larger auth refactor) |
| **M1** | DB TLS `rejectUnauthorized: false` | **Open** — ship RDS CA bundle |
| **M2** | Unlimited exam retries; answer key via `GET …/attempt` | **Partial** — `sanitizeAnswers` strips keys on read; unlimited retries remain |
| **M3** | `GET /users/:username` returns email + role to any logged-in user | **Open** — return `UserSlim` or restrict to self/admin |
| **M4** | Unauthenticated `/logs` + `/analytics/event` ingestion | **Partial** — analytics DTO validated; `/logs` still open (Wave 1) |
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
| **U4** | Completion hidden behind kebab menu | **Open** — "Mark complete & continue" at lesson end |
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
1. **Tighten `POST /logs`** (Sec M4) — DTO + throttle.

**Wave 2 — launch-blocking product surface**
2. **Home page join CTAs** (Sales **S3**) — see P1 B2C.
3. **Reduce signup friction** — defer email verify for Unit 1 (Sales **S6**).
4. **Verify prod video signing** — HLS smoke test after first recording.

**Wave 3 — polish and hygiene**
5. **Frontend UX** — unit breadcrumbs/prev-next (**U1**), course progress bar (**U3**), mark-complete CTA (**U4**), exam draft nav guard (**U6** partial).
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

*Last reviewed: Jul 8 2026 — prod deploy: app code, restructured Part 107 course, unit-level question bank.*
