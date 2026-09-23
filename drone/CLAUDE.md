# Claude / agent instructions — frontend (drone)

Pointer only. Rules for this folder live in [`AGENTS.md`](AGENTS.md); human quick start and doc map in [`README.md`](README.md). Monorepo-wide rules: [`../docs/AGENTS.md`](../docs/AGENTS.md).

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — before-editing checklist, conventions, change → doc table.
2. [`../docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) — routes, data flow, API client, product events.
3. [`README.md`](README.md) — `npm run dev` on port 8080, proxies `/api` to the backend on 3000.

## Non-negotiables

- App Router: server components by default, `"use client"` only when needed. Reuse `ui/components/` before adding new ones; API calls go through `lib/api-client.tsx` with types in `lib/types/`.
- Use theme tokens from `globals.css` — no hardcoded light-only colors. Course tree uses string unit refs (`u1`, `u1.2`), never numeric ID math.
- New or changed user-facing route, flow, or API integration updates [`../docs/tech/frontend-data.md`](../docs/tech/frontend-data.md) in the same session. Tracked event names must exist in `backend/src/product-events/types/product-event.dto.ts`.
