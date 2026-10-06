# Local development

Run Postgres in Docker and the API + frontend with npm. Migrations run automatically on backend boot (same as production).

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+ — run `nvm use` in the repo root (`.nvmrc` pins 20)
- `npm install` in both `backend/` and `drone/`

## 1. Start Postgres

From the repo root:

```bash
docker compose up postgres -d
```

Postgres listens on **localhost:5432**. The `blog` database is created on first boot via `backend/init_db.sql`. Data persists in `./data`.

Check status:

```bash
docker compose ps
pg_isready -h localhost -p 5432
```

**Reset the database** (wipes all local data):

```bash
docker compose down
rm -rf data
docker compose up postgres -d
```

## 2. Backend environment

Create `backend/.env` (defaults match the Docker Postgres service):

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=blog

JWT_SECRET=local-dev-secret
JWT_RESET_SECRET=local-dev-reset-secret

FRONTEND_URL=http://localhost:8080
EMAIL_ENABLED=false
```

Optional for purchase testing:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Recurring Price IDs from Stripe Dashboard (Product → Price). Required for Pro Checkout.
STRIPE_PRO_PRICE_ID_MONTHLY=price_...
# STRIPE_PRO_PRICE_ID_YEARLY=price_...
# Stripe as merchant of record on every Checkout Session (matches dev.tfvars)
STRIPE_MANAGED_PAYMENTS=true
FRONTEND_URL=http://localhost:8080
```

Frontend (`drone/.env`): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (only the legacy Card Element path uses it; hosted Checkout does not).

Use the **Drone Edge sandbox** keys (`stripe login` → pick the sandbox). Webhook locally — the current CLI requires `--events`:

```bash
stripe listen \
  --events payment_intent.succeeded,checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed,charge.refunded \
  --forward-to localhost:3000/purchases/webhook
```

The signing secret is stable per machine (`stripe listen --print-secret`) → `STRIPE_WEBHOOK_SECRET`. Run **one** listener; two forward every event twice. Full sandbox test matrix: [`stripe-sandbox-test-plan.md`](stripe-sandbox-test-plan.md).

See [`purchase-flows.md`](purchase-flows.md).

Optional admin seed overrides (migration `1760500000000-seed-admin-user.ts`):

```bash
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_PASSWORD=password
```

## 3. Start the API

```bash
cd backend
npm install
npm run build          # required once — migrations load from dist/**/migrations/**
npm run start:dev      # http://localhost:3000, watch mode
```

On startup you should see:

- `Running pending database migrations...`
- `Migrations complete.`

Migrations are applied two ways (same as prod):

- `migrationsRun: true` in `TypeOrmModule.forRoot`
- Explicit `dataSource.runMigrations()` in `main.ts`

**Default admin user** (unless overridden above): `admin` / `password`

- Swagger: http://localhost:3000/api

## 4. Start the frontend

In a second terminal:

```bash
cd drone
npm install
npm run dev    # http://localhost:8080
```

Create `drone/.env` or `drone/.env.local`:

```bash
API_INTERNAL_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # optional, for checkout UI
```

The browser calls `/api/*`; Next.js proxies to the backend (`drone/src/app/api/[...path]/route.ts`), including HttpOnly auth cookies.

## Smoke test

| What | URL |
|------|-----|
| Frontend | http://localhost:8080 |
| API / Swagger | http://localhost:3000/api |
| Login | `admin` / `password` |
| Courses | http://localhost:8080/courses |
| Public course page | http://localhost:8080/courses/35/preview |

## Full stack in Docker (optional)

`docker-compose.override.yml` enables hot-reload for API and frontend:

```bash
docker compose up --build
```

Caveats:

- `api_server` depends on `nginx`, which mounts a host cert path (`/Users/jamesspaniak/certs`) that may not exist on your machine.
- Inside Docker, the API uses `DB_HOST=postgres` (already set in compose).

For day-to-day development, **Postgres-only Docker + native npm** is simpler.

## Running tests

- Unit tests: `cd backend && npm test` (no DB needed).
- E2E tests: `cd backend && npm run test:e2e` — suites run in parallel, each Jest worker on its own copy of **`blog_test`** (`blog_test_1`, `blog_test_2`, …; created from `blog_test` as a template on first use, then migrated — `test/jest-e2e.db-*.ts`), so your dev `blog` data is safe and suites can't truncate each other's tables. `blog_test` must exist and nothing may be connected to it while a worker DB is first created. After a schema change, run `npm run build` first (migrations load from `dist/`); the worker DBs pick up new migrations automatically. To start fresh, drop the `blog_test_N` databases. Never point `DB_NAME` at `blog` (the setup refuses).

## Manual migrations (debugging only)

Boot normally handles migrations. If needed:

```bash
cd backend
npm run build
npm run typeorm:run      # apply pending
npm run typeorm:revert   # undo last
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `connect ECONNREFUSED 5432` | `docker compose up postgres -d` |
| No migrations run | Run `npm run build` in `backend/` first |
| Frontend auth fails | Backend must be on `:3000`; check `API_INTERNAL_BASE_URL` |
| Empty DB after reset | Restart backend — migrations and admin seed run on boot |
| `ReferenceError: crypto is not defined` on boot | You're on Node < 19 (check `node --version`) — run `nvm use` for Node 20. `main.ts` also polyfills WebCrypto as a fallback |
| `npm run build` fails in `drone/` with Node version error | Same fix — Next.js requires Node 18.18+ |

## Related docs

- [Backend data model & routes](./backend-data.md)
- [Unit refs migration deploy order](./unit-refs-migration.md)
- [Environment split plan](./environment-split-plan.md)
