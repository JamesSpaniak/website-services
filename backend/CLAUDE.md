# Claude / agent instructions — backend

Pointer only. Rules for this folder live in [`AGENTS.md`](AGENTS.md); human quick start and doc map in [`README.md`](README.md). Monorepo-wide rules: [`../docs/AGENTS.md`](../docs/AGENTS.md).

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — before-editing checklist, sensitive operations, change → doc table.
2. [`../docs/tech/local-dev.md`](../docs/tech/local-dev.md) and [`../docs/tech/backend-data.md`](../docs/tech/backend-data.md) — stack layout, API, data model.
3. [`README.md`](README.md) — `npm install` / `npm run start:dev` on port 3000, `.env` variable list.

## Non-negotiables

- Match existing module patterns (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `types/*.dto.ts`); minimal diffs; `ValidationPipe({ whitelist: true })` on new DTOs.
- Schema changes get a new migration in `src/migrations/` — they run on boot. Never run bulk production DB changes or `./pipeline.sh` unless asked.
- API behavior, auth, or data-shape changes update the canonical doc in the same session — see **Keeping docs current** in [`AGENTS.md`](AGENTS.md).
