# Backend — NestJS API

REST API for TheDroneEdge: auth, courses, questions/exams, articles, purchases (Stripe), organizations, media signing, analytics.

| Topic | Doc |
|-------|-----|
| Local dev | [`docs/tech/local-dev.md`](../docs/tech/local-dev.md) |
| API & data model | [`docs/tech/backend-data.md`](../docs/tech/backend-data.md) |
| Exam generator & questions | [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) |
| Deploy | [`workflows/tech/deploy.md`](../workflows/tech/deploy.md) |
| Agent guide | [`AGENTS.md`](AGENTS.md) |

## Quick start

```bash
cd backend
npm install
# create backend/.env — variable list in docs/tech/local-dev.md § Backend environment
npm run start:dev      # http://localhost:3000
```

Postgres must be running (`docker compose up postgres -d` from repo root). Migrations apply on boot.

## Layout

```
backend/src/
├── auth/           JWT, sessions, guards
├── courses/        Course payload, progress, units
├── questions/      Question bank, exams, attempts
├── purchases/      Stripe checkout & webhooks
├── organizations/  Schools, classes, assignments
├── media/          S3 / CloudFront signed URLs
└── migrations/     TypeORM migrations
```

## Keeping docs current

Update reference docs when you change this folder:

| You change… | Update… |
|-------------|---------|
| Routes, DTOs, entities, auth rules | [`docs/tech/backend-data.md`](../docs/tech/backend-data.md) |
| Exam generation, question import, scopes | [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) |
| Env vars or local setup | [`docs/tech/local-dev.md`](../docs/tech/local-dev.md) |
| Deploy / infra touchpoints | [`workflows/tech/deploy.md`](../workflows/tech/deploy.md), [`docs/tech/architecture.md`](../docs/tech/architecture.md) |
| Product-facing capability | [`docs/sales/features.md`](../docs/sales/features.md) if user-visible |
| Shipped backlog item | [`docs/TODO.md`](../docs/TODO.md) → move to [`docs/TODO_COMPLETED.md`](../docs/TODO_COMPLETED.md) with date |
