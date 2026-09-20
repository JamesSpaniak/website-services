# Technical documentation

Architecture, development, deployment, and product-engineering reference for TheDroneEdge.com.

| Document | Description |
|----------|-------------|
| [architecture.md](architecture.md) | **Deployed AWS infra**, request paths, per-service IAM/network/views |
| [local-dev.md](local-dev.md) | Postgres, backend, frontend local setup |
| [dependency-audit.md](dependency-audit.md) | npm vulnerability triage & fix plan (backend + frontend) |
| [backend-data.md](backend-data.md) | API routes, entities, auth, media |
| [frontend-data.md](frontend-data.md) | Next.js pages, client API, components |
| [purchase-flows.md](purchase-flows.md) | Course one-time vs Pro monthly Stripe flows + permission gaps |
| [analytics-and-attribution.md](analytics-and-attribution.md) | Event taxonomy, platform accounts, pixels vs first-party vs OTel, click-ID capture, server-side conversions, consent |
| [product-analytics.md](product-analytics.md) | User-level usage × entitlement × revenue; tooling choice, schema gaps, signal→offer map, student-data rules |
| [analytics-implementation-plan.md](analytics-implementation-plan.md) | **Build plan** for product analytics + progress visibility: `products` → `orders` → `entitlements` → usage data model (many packages, one course), manager / company / learner APIs, admin + manager screens, phases, backfill, acceptance |
| [observability.md](observability.md) | Grafana Cloud free-tier capacity, exported OTel instruments + cardinality rules, alert rules A1–A12, health dashboard, click-ops runbook (**PA39**) |
| [analytics-queries.md](analytics-queries.md) | **Query cookbook** for the analytics store: every table / materialized view, ~45 SQL queries with what each returns and which admin/manager screen it feeds, snapshot-report recipe (run top to bottom to produce a PDF / dashboard), interpretation table |
| [manager-progress-visibility.md](manager-progress-visibility.md) | What a teacher/org manager sees of student progress today, gaps (video watch, last active, unit grid), and the plan — teacher read path over the product-analytics event source |
| [pwa-and-mobile-app.md](pwa-and-mobile-app.md) | Meta “app” vs mobile app; PWA plan; Capacitor vs RN; store commission (Jul 2026); what mobile changes cost the website |
| [environment-split-plan.md](environment-split-plan.md) | Dev vs prod AWS overlay audit & migration plan |
| [course-editing-roadmap.md](course-editing-roadmap.md) | Course editor UX and content model roadmap |
| [assets-and-drive-storage-plan.md](assets-and-drive-storage-plan.md) | Git `assets/` + Google Drive dual store: canonical tree, merge map, rclone rules, move plan |
| [course-content-restructure-plan.md](course-content-restructure-plan.md) | FAA 107 unit rebalance, video placement, unit-level question scoping |
| [exam-generator-and-course-linking.md](exam-generator-and-course-linking.md) | Question bank and exam linking |
| [exam-weighting-plan.md](exam-weighting-plan.md) | FAA category weighting for generated exams — data model + selection algorithm proposal |
| [unit-refs-migration.md](unit-refs-migration.md) | Course unit refs migration runbook |
| [legal-and-privacy-site-sync.md](legal-and-privacy-site-sync.md) | Legal/privacy copy sync checklist |
| [app-review.canvas.tsx](app-review.canvas.tsx) | Interactive app/repo review canvas |

Workflows (deploy, content builds): [`workflows/tech/`](../../workflows/tech/)

Sales positioning that engineers need: [`docs/sales/features.md`](../sales/features.md)

Open items backlog: [`docs/TODO.md`](../TODO.md) · Completed: [`docs/TODO_COMPLETED.md`](../TODO_COMPLETED.md)
