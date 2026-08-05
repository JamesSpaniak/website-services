# Technical documentation

Architecture, development, deployment, and product-engineering reference for TheDroneEdge.com.

| Document | Description |
|----------|-------------|
| [architecture.md](architecture.md) | **Deployed AWS infra**, request paths, per-service IAM/network/views |
| [local-dev.md](local-dev.md) | Postgres, backend, frontend local setup |
| [dependency-audit.md](dependency-audit.md) | npm vulnerability triage & fix plan (backend + frontend) |
| [backend-data.md](backend-data.md) | API routes, entities, auth, media |
| [frontend-data.md](frontend-data.md) | Next.js pages, client API, components |
| [analytics-and-attribution.md](analytics-and-attribution.md) | Event taxonomy, platform accounts, pixels vs first-party vs OTel, click-ID capture, server-side conversions, consent |
| [pwa-and-mobile-app.md](pwa-and-mobile-app.md) | Meta “app” vs mobile app; PWA plan; Capacitor vs RN; store commission (Jul 2026); what mobile changes cost the website |
| [environment-split-plan.md](environment-split-plan.md) | Dev vs prod AWS overlay audit & migration plan |
| [course-editing-roadmap.md](course-editing-roadmap.md) | Course editor UX and content model roadmap |
| [course-content-restructure-plan.md](course-content-restructure-plan.md) | FAA 107 unit rebalance, video placement, unit-level question scoping |
| [exam-generator-and-course-linking.md](exam-generator-and-course-linking.md) | Question bank and exam linking |
| [exam-weighting-plan.md](exam-weighting-plan.md) | FAA category weighting for generated exams — data model + selection algorithm proposal |
| [unit-refs-migration.md](unit-refs-migration.md) | Course unit refs migration runbook |
| [legal-and-privacy-site-sync.md](legal-and-privacy-site-sync.md) | Legal/privacy copy sync checklist |
| [app-review.canvas.tsx](app-review.canvas.tsx) | Interactive app/repo review canvas |

Workflows (deploy, content builds): [`workflows/tech/`](../../workflows/tech/)

Sales positioning that engineers need: [`docs/sales/features.md`](../sales/features.md)

Open items backlog: [`docs/TODO.md`](../TODO.md) · Completed: [`docs/TODO_COMPLETED.md`](../TODO_COMPLETED.md)
