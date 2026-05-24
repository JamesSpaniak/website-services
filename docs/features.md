# Product features — implemented, roadmap, and school positioning

This document summarizes **what the platform does today** (from [`frontend-data.md`](./frontend-data.md) and [`backend-data.md`](./backend-data.md)), **what we are strengthening in parallel** (question bank scale and instructional quality), and **differentiators we can build** against typical drone-education competitors (see [`competitor-analysis.md`](./competitor-analysis.md)).

---

## For school administrators — why this course

### Introduction

Drone Edge is a **web-native learning platform** built around **FAA Part 107–aligned** courseware, structured **units and nested sections**, **progress tracking**, **media-rich lessons** (video, image galleries, HTML content), and **assessment** where courses define exams. We are **from the drone community**: we care about safe, competent operators and honest preparation—not just checking a box. We **support the industry’s mission** (professionalism, safety, responsible expansion of commercial UAS) and **understand the culture** of builders, pilots, educators, and program leads who live where regulation meets real operations.

We want to **push this knowledge to a wider audience**: career switchers, CTE classrooms, early STEM pathways, and districts that need **credible content** without cobbling together random videos and PDFs.

### Business pitch (procurement / curriculum lead)

1. **Outcome clarity** — Courses are authored as structured **units → sub-units → media → optional unit exams**; learners see **progress** at course and unit level. You are not buying a loose folder of files—you are buying a **coherent pathway** you can align to pacing and accountability.

2. **Built for real delivery** — **Stripe** checkout for retail learners; **organization** accounts can **assign courses** to members; **managers** can view **org-wide progress** and per-course detail. That matches how schools and training partners actually run programs.

3. **Security and roles** — **JWT** sessions with refresh, **email verification**, password reset, **admin** vs **user** vs **pro** access, **org manager** vs **member**. Course content is **access-controlled** (purchase, org assignment, or active Pro where applicable).

4. **Modern learner experience** — Responsive UI, **dark/light theme**, **signed URLs** for course video where applicable, **image galleries** for figures, **articles** for ongoing industry reading, **comments** on articles for engagement.

5. **Operational honesty** — We are **actively growing our question bank** and tightening instructional quality so claims match preparation depth—aligned with how serious competitors are judged (hours, item counts, modality). See **Roadmap** below for items that close gaps vs “big workbook + YouTube” bundles.

6. **Partner posture** — We aim to be **easy to work with**: contact flows, admin tooling for content, analytics hooks for usage visibility. For **district-scale** needs (SSO, roster sync, standards mapping documents), see **Roadmap / competitive improvements**.

---

## Implemented features (current stack)

### Platform & delivery

| Area | Capability |
|------|------------|
| **Frontend** | Next.js App Router (`drone/`), same-origin **`/api/*` proxy** to Nest backend |
| **Theming** | Global theme (e.g. `ThemeProvider`), settings page, light/dark preference |
| **SEO / metadata** | Sitemap, robots, Open Graph / Twitter images, JSON-LD on key pages |
| **Analytics** | Client page/article/course view events → **`POST /analytics/event`** (OTLP metrics on backend); optional **Umami** script |

### Identity & access

| Area | Capability |
|------|------------|
| **Auth** | Register, login, logout, **refresh tokens**, **email verification**, forgot/reset password |
| **Profile** | **`GET/PATCH /users/me`**, profile picture via **presigned upload** |
| **Authorization** | Global roles **user / pro / admin**; **Edge middleware** + route guards (**AuthGuard**, **AdminGuard**, **ManagerGuard**) |
| **Sessions** | Refresh sessions in DB; **`token_version`** invalidates tokens on security-sensitive changes |

### Courses & learning

| Area | Capability |
|------|------------|
| **Course model** | JSON **`CourseDetails`** in `courses.payload`: title, description, **units**, nested **`sub_units`**, **video_url**, **`images_url`** galleries (course + units), **exams** on units |
| **Media migration** | **`migrateCoursePayloadImages`** merges legacy **`image_url`** → **`images_url`** on read/write |
| **Catalog** | **`GET /courses`** public list (summary; **sub_units stripped** for list view) |
| **Full course** | **`GET /courses/:id`** with JWT — progress merge, access enforcement (**purchase / Pro / org / admin**) |
| **Progress** | Per user+course **Progress** row: status, unit completion, **exam scores**, summary columns |
| **Unit progress** | **`PATCH`** course or unit progress; **signed video URL** for course media when applicable |
| **Learner UI** | Course overview, unit list, **unit page** with sections, **image strips**, video, **local exam practice UI** |
| **Paywall** | **`has_access`**; **Stripe PaymentIntent** + webhook fulfillment for purchases |

### Commerce

| Area | Capability |
|------|------------|
| **Stripe** | Create payment intent, client confirm card, webhook grants access |
| **Manual grant** | Admin **`POST /purchases/course`** for comps / support |
| **Pro** | Admin path for Pro membership assignment (testing / comp) |

### Content (articles)

| Area | Capability |
|------|------------|
| **Articles** | List + detail, **HTML body** and/or **content blocks** (text/image/video), moderation |
| **Comments** | Threaded comments, upvotes, edit/delete own or admin |
| **Admin** | CRUD articles (including hidden), **media upload** to S3 |

### Organizations (schools / partners)

| Area | Capability |
|------|------------|
| **Orgs** | Create orgs (admin), **members**, **invite codes** (single + bulk), **assign courses** to org (admin) |
| **Manager dashboard** | Progress summaries, member activity, invite management |
| **Registration** | Invite code on signup for org affiliation |

### Administration

| Area | Capability |
|------|------------|
| **Admin dashboard** | Articles, courses, organizations, **analytics overview/daily** |
| **Course editor** | Visual + JSON modes; **hero + unit image lists**, **sub-units**; edit loads **`getCourseById`** for full tree |
| **Media** | Presigned uploads, list, delete, **orphan scan/delete** (admin) |

### Backend cross-cutting

| Area | Capability |
|------|------------|
| **API** | Swagger at **`/api`**, throttling on sensitive auth routes, request IDs, HTTP logging |
| **Email** | Contact form, broadcast (admin), transactional auth email |
| **Audit** | User activity logs, admin analytics |
| **Observability** | OpenTelemetry bootstrap optional |
| **Health** | **`GET /health`** |

### Known gaps / partial implementations (documented in code)

| Item | Notes |
|------|--------|
| **Client logs** | **`POST /logs`** is public — tighten for production abuse (rate limit / auth). |

---

## In progress (parallel work)

| Focus | Intent |
|--------|--------|
| **Question bank size & quality** | Expand categorized, validated items; align to ACS-style domains; avoid “thin” prep that competitors are criticized for in market notes. |
| **Instructional quality** | Review pacing, modality (async + teacher-led notes), clarity of outcomes; keep **honest** mapping from seat time to exam readiness. |

---

## Roadmap — features to improve competitive position

These are **not all implemented**; they address typical gaps vs larger curriculum vendors (see [`competitor-analysis.md`](./competitor-analysis.md)).

| Theme | Idea |
|--------|------|
| **Assessment** | Wire **server-side exam submit** end-to-end in the app; per-attempt history; optional question banks per standard. |
| **School IT** | **SSO / SAML**, **Google Classroom** or **LMS LTI** export, **roster sync**. |
| **Admin & trust** | Public **standards alignment** PDFs, **pacing guides**, **syllabus** downloads for admins. |
| **Instructional design** | **Printable workbook** export, **downloadable slide** packs where licensing allows, **instructor guides**. |
| **Accessibility** | WCAG pass on reader UI, captions pipeline for video, keyboard-first navigation in course tree. |
| **Localization** | Separate SKUs or labels for **non-US** (non–Part 107) vs US FAA track. |
| **Enterprise** | Volume **seat licensing**, **invoice / PO** flow, **district agreements**. |
| **Analytics** | Deeper **funnel** and **cohort** reports for org managers; export CSV. |
| **Content ops** | **Versioning** of course payloads, **staging** before publish, **diff** for curriculum updates. |

---

## Related docs

- [`frontend-data.md`](./frontend-data.md) — routes, client API map, guards.  
- [`backend-data.md`](./backend-data.md) — entities, permissions, REST map.  
- [`competitor-analysis.md`](./competitor-analysis.md) — market segments and competitor patterns.  
- [`course-editing-roadmap.md`](./course-editing-roadmap.md) — course admin UI depth.

---

*Keep this file updated when major features ship or when go-to-market positioning changes.*
