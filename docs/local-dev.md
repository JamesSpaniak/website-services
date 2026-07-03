# Local development

Run Postgres in Docker and the API + frontend with npm. Migrations run automatically on backend boot (same as production).

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+
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
```

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

## Related docs

- [Backend data model & routes](./backend-data.md)
- [Unit refs migration deploy order](./unit-refs-migration.md)
- [Environment split plan](./environment-split-plan.md)
