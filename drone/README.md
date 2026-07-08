# Frontend — Next.js (drone)

Next.js 15 App Router app for **TheDroneEdge.com**: courses, exams, articles, schools, checkout, manager/admin tools.

| Topic | Doc |
|-------|-----|
| Local dev | [`docs/tech/local-dev.md`](../docs/tech/local-dev.md) |
| Pages, data flow, API client | [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) |
| Deploy | [`workflows/tech/deploy.md`](../workflows/tech/deploy.md) |
| Agent guide | [`AGENTS.md`](AGENTS.md) |

## Quick start

```bash
cd drone
npm install
npm run dev    # http://localhost:8080 — proxies /api to backend
```

Backend must be running on port 3000 (see [`docs/tech/local-dev.md`](../docs/tech/local-dev.md)).

## Layout

```
drone/src/app/
├── courses/        Course player, units, exams, preview
├── articles/       CMS articles
├── schools/        B2B landing pages
├── manager/        Org dashboard
├── admin/          Course/question editors
├── lib/            api-client, types, auth, course-tree
└── ui/components/  Shared React components
```

Public assets: `drone/public/`. Site copy synced from docs for legal/privacy — see [`docs/tech/legal-and-privacy-site-sync.md`](../docs/tech/legal-and-privacy-site-sync.md).

## Keeping docs current

Update reference docs when you change this folder:

| You change… | Update… |
|-------------|---------|
| Routes, layouts, user flows | [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) |
| API client calls or shared types | [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) · consider `scripts/generate-api-types.sh` |
| Course/exam UI behavior | [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) if assessment UX changes |
| Legal/privacy pages | [`docs/tech/legal-and-privacy-site-sync.md`](../docs/tech/legal-and-privacy-site-sync.md) |
| Product-facing pages or CTAs | [`docs/sales/features.md`](../docs/sales/features.md), [`docs/TODO.md`](../docs/TODO.md) if backlog item |
| Shipped backlog item | [`docs/TODO.md`](../docs/TODO.md) → [`docs/TODO_COMPLETED.md`](../docs/TODO_COMPLETED.md) with date |
