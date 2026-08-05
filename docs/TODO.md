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
| **Insert course images into Part 107 payload** — author has images ready in separate folders; upload to media bucket, set `images_url` on flagged leaves (lat/long globe, sectional chart samples, MEF, load-factor charts, airport ops, etc.) | **Partial (Jul 8 2026)** — "Pictures for Airports" done: 61 images → units 2/3; Ch.4 `u422` runway figures still missing; **admin publish of Ch.1–4 (Ch.3+4 together) still pending**; Ch.7 `u718` load-factor chart open; Ch.9 `u95` needs exact maintenance figure/title/source mapping, body callouts, image attachments, and external source links where applicable | [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) · [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) § Author content-review intake |
| **Part 107 post-restructure follow-ups** — leaf `ExamPlayer` removal on content-only leaves; carry over or re-tag **FINAL_EXAM** pool items (unit-level bulk has no final-exam rows yet); remaining Ch.7/9/10 author notes (Ch.1–5 + Ch.8 done; Ch.6–7 + Ch.9–10 partial Aug 5 2026; images still open; **do not combine** `u5`/`u6`) | **Open** | [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) · [`assets/courses/faa_107_course_quality_review.md`](../assets/courses/faa_107_course_quality_review.md) § Chapter 5–10 |
| **Rebalance spacing of last ~5–6 Part 107 units (ops + weather)** — Back half (roughly Airport Ops → Radio) is conceptually one long “operations” arc that was split because a single unit would be too long; some resulting units/leaves are now too short for a clean lesson+video. **Weather decision (Jul 27 2026):** keep `u5` WEATHER and `u6` WEATHER EFFECTS **separate** (do not combine). Plan recordable video chunks per unit (unit 6 aimed at one top-level ~10–12 min video). Remaining: ops/radio unit spacing + recording plan | **Open** | User · [`assets/courses/faa_107_course_quality_review.md`](../assets/courses/faa_107_course_quality_review.md) § Chapter 5–6 · [`tech/course-content-restructure-plan.md`](tech/course-content-restructure-plan.md) · P0 recordings |
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
| **T16** | **Three-course bundle SKU in Stripe** — highest-leverage economic change; roughly doubles affordable CAC | Build | Not started |
| **T17** | Productize `PRO_UPGRADE` as a purchasable SKU (currently admin-comp only) | Build | Not started |
| **T18** | PWA manifest (`app/manifest.ts`) + maskable icons from the brand kit | Build | Not started |
| **T19** | PWA service worker (Serwist) — **exclude signed media domain and `/api/*` from caching**; keep protected routes out of precache | Build | Not started |
| **T20** | Install prompt for logged-in learners only (do not prompt paid traffic mid-conversion) | Build | Not started |

*Prerequisites already tracked elsewhere:* free Unit 1 without verify friction (**S6**), public pricing page (**S2**), home join CTAs (**S3**), email capture / lead magnet (**S5**), dead social links (**S7**), P0 course video.

### Discoveries — research spikes, resolve before building

| # | Question | Blocks | Status |
|---|----------|--------|--------|
| **D1** | Current App Store policy on external purchase links for digital content (US) | Any native app decision | **Answered Jul 2026** — US link-out commission 0% under Epic contempt remedy (SCOTUS pending); still hide in-app Stripe / use link-out. Detail: [`tech/pwa-and-mobile-app.md`](tech/pwa-and-mobile-app.md) § Store commission. Re-verify at submit. |
| **D2** | Does offline lesson access change completion or retention? | Native app case | Open |
| **D3** | Do push notifications lift completion enough to justify spending the permission prompt? | T20 scope | Open |
| **D4** | Can the free Unit 1 work offline for anonymous users (PWA as top-of-funnel)? | T19 scope | Open |
| **D5** | Keyword volume and CPC for B2B CTE terms (Google Keyword Planner) — is there enough search volume to spend $900 against? | Google Search test | Open |
| **D6** | Meta audience size and cost estimate for the B2C targeting | Meta test sizing | Open |
| **D7** | Email sending for marketing sequences — reuse existing transactional setup or separate ESP/subdomain? **Do not send marketing from the transactional domain**; deliverability damage hits password resets and verification | **S5** lead magnet, nurture sequence | Open |
| **D8** | Consent banner — build in-house vs. off-the-shelf CMP | T6 | Open |
| **D9** | Refund / access policy wording — required for paid-traffic trust and for Stripe disputes | Paid launch | Open |
| **D10** | Bundle pricing point ($69? $79?) and whether it cannibalizes single-course sales | T16 | Open |
| **D11** | Public marketing video hosting — reuse signed CloudFront HLS or a separate public path? Signed URLs expire and break social embeds | Creative distribution | Open |
| **D12** | Attach-rate reality check — validate the 20% / 10% course-2/course-3 assumptions once there is data | All CAC targets | Open |

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
| **Verify prod video signing end-to-end** — smoke-test HLS after first video | Open | Wave 2 · P0 recordings |
| **Tighten `POST /logs`** — DTO + stricter throttle (Sec **M4**) | Open | Wave 1 · also **T4** in the paid build |
| **Analytics, pixels, attribution, PWA** — see **P1 — Paid acquisition build** above (T1–T20, D1–D12) | Sequenced | [`tech/analytics-and-attribution.md`](tech/analytics-and-attribution.md) · [`tech/pwa-and-mobile-app.md`](tech/pwa-and-mobile-app.md) |
| **Prod/dev environment split** | Planning only | [`tech/environment-split-plan.md`](tech/environment-split-plan.md) |
| **SSO / SAML, Google Classroom, LTI, roster sync** | Roadmap | [`sales/features.md`](sales/features.md) |
| **Course editor** — exam visual edit, preview pane, validation | Enhancement | [`tech/course-editing-roadmap.md`](tech/course-editing-roadmap.md) |
| **FAA category weighting in exam generation** — `exam_blueprint_buckets` table + `exams.blueprint_snapshot`, largest-remainder apportionment in `ExamGeneratorService`; today's unweighted draw gives ~24% Operations vs FAA 35–45% floor. Blocked on author confirming u4 bucket mapping | Proposed | [`tech/exam-weighting-plan.md`](tech/exam-weighting-plan.md) |
| **Course lesson list / markdown rendering** — `text_content` only does `\n` → `<br />`; markdown `-`/`*` bullets do not become lists. HTML `<ul><li>` works today via `prose` + `dangerouslySetInnerHTML` (used in Ch.5 Surface Obs). Add a small markdown→HTML (or sanitized rich-text) path so authors can write lists without raw HTML; keep sanitization in mind (**A8**) | Open | Ch.5 content pass · `drone/src/app/ui/components/unit.tsx` · `section.tsx` |

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

*Last reviewed: Jul 26 2026 — added P0 item for back-half unit spacing / weather 5+6 combine vs video splits.*
