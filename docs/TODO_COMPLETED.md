# Completed items (archive)

Items moved from [`TODO.md`](TODO.md) when shipped. **Each entry is dated** so you can prune old rows periodically.

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
