# Agent guide — frontend (drone)

Next.js app in `drone/src/app/`. Monorepo-wide rules: [`docs/AGENTS.md`](../docs/AGENTS.md).

## Before editing

1. Read [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) for routes and data flow.
2. Use existing components under `ui/components/` before adding new ones.
3. API calls go through `lib/api-client.tsx` — keep types in `lib/types/`.
4. Match theme tokens in `globals.css`; avoid hardcoded light-only colors (see app-review D1/D2/D4).

## Conventions

- App Router: server components by default; `"use client"` only when needed.
- Auth: `auth-context.tsx`, `auth-guard.tsx`, `auth-redirect.ts` for purchase/login flows.
- Course tree: `lib/course-tree.ts` — string unit refs (`u1`, `u1.2`), not numeric ID math.

## Keeping docs current

**Required:** when you add or change a user-facing route, flow, or API integration, update [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) in the same session.

| Area | Canonical doc |
|------|----------------|
| Pages, components, client data | [`docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) |
| Exam/course UX tied to backend scopes | [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) |
| B2C conversion / schools copy | [`docs/sales/features.md`](../docs/sales/features.md), marketing workflows |
| Open UX backlog (app-review IDs) | [`docs/TODO.md`](../docs/TODO.md) |

Also refresh [`drone/README.md`](README.md) if dev commands or top-level layout changes.
