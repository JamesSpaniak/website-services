# Agent guide — backend

NestJS API in `backend/src/`. Monorepo-wide rules: [`docs/AGENTS.md`](../docs/AGENTS.md).

## Before editing

1. Read [`docs/tech/local-dev.md`](../docs/tech/local-dev.md) and [`docs/tech/backend-data.md`](../docs/tech/backend-data.md).
2. Match existing module patterns (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `types/*.dto.ts`).
3. Prefer minimal diffs; use `ValidationPipe({ whitelist: true })` on new DTOs.
4. Migrations live in `src/migrations/` — add a new migration for schema changes; they run on boot.

## Sensitive operations

| OK locally | Ask first / read workflow |
|------------|---------------------------|
| Edit services/controllers, run unit tests | `./pipeline.sh` deploy |
| Import questions in local DB | Bulk production DB changes |
| `npm run test` | Terraform apply |

## Keeping docs current

**Required:** when your change alters API behavior, auth, or data shape, update the canonical doc in the same PR/session — do not rely on code-only discovery.

| Area | Canonical doc |
|------|----------------|
| Endpoints, entities, guards | [`docs/tech/backend-data.md`](../docs/tech/backend-data.md) |
| Questions, exams, import | [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) |
| Unit refs / `course_units` | [`docs/tech/unit-refs-migration.md`](../docs/tech/unit-refs-migration.md) |
| Frontend contract (if response shape changes) | [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) |
| Open engineering items | [`docs/TODO.md`](../docs/TODO.md) |

Also refresh [`backend/README.md`](README.md) if setup commands or module layout changes materially.
