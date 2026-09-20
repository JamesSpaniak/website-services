# Prod DB clone — migration rehearsal

Rebuild production's database locally (schema + scrubbed data), then run every migration pending in the current checkout the way the next deploy will, and the nightly analytics job. Use before any deploy that carries a migration, and whenever you need prod-shaped data for a query or a dashboard check.

Script: [`scripts/prod-db-clone.sh`](../../scripts/prod-db-clone.sh) (+ `prod-db-clone-restore.ts`). Facts about the stack: [`docs/tech/architecture.md`](../../docs/tech/architecture.md).

## What it does — and does not — touch

- **Prod:** read-only `SELECT`s, executed by one ephemeral Fargate task that uses the *currently deployed* task definition (so the DB password never leaves Secrets Manager and the code that runs is the code already in prod). The task exits when the dump is written; nothing is created, changed, or left behind in AWS. RDS is private with no bastion or ECS Exec, which is why the dump runs *inside* the VPC.
- **Data:** scrubbed in flight before it reaches CloudWatch — passwords / tokens / secrets blanked, every email column hashed to `e<md5>@example.test`, `users.first_name` / `last_name` nulled, usernames replaced by `user<id>`, IP / user-agent nulled, `audit_logs.details` stripped of `email` / `username` / `ip`. IDs, roles, org membership, progress, exams and Stripe ids are kept so joins and reconciliation behave like prod. **Do not weaken the scrub** — the dump transits the API log group (L1: PII in logs).
- **Local:** a throw-away Postgres 17 container (`de-prodlike`, port 55432). Dump files live in `/tmp/proddump` — outside the repo, delete when done.

## Steps

1. Prerequisites: `aws sts get-caller-identity` works, Docker running, Node 20 (`export PATH=~/.nvm/versions/node/v20.19.4/bin:$PATH`), `backend/node_modules` installed.
2. Dump (≈ 1 min):
   ```bash
   ./scripts/prod-db-clone.sh dump
   ```
   Prints the task id, its status until `STOPPED` (exit code must be 0), then per-table row counts. If the pull says *incomplete dump*, wait a minute and rerun `dump` — CloudWatch can lag the task exit.
3. Restore + rehearse (≈ 20 s):
   ```bash
   ./scripts/prod-db-clone.sh restore
   ```
   Output to read, in order:
   - **A. schema at prod state** — the migrations prod has applied, replayed in prod's order (its `migrations` table is the source; legacy `backend/migrations` and `src/migrations` interleave).
   - **B. import prod data** — row counts must match the dump or the script aborts.
   - **C. pending migrations (deploy order)** — the exact list `migrationsRun: true` will execute on the next boot, one at a time with timings. **Any failure here is a deploy blocker.**
   - **D. nightly maintenance + reconciliation** — `AnalyticsMaintenanceService.runAll()` on the migrated data, key row counts, and one row per reconciliation check. Gate checks must be 0 (see [`docs/tech/analytics-queries.md`](../../docs/tech/analytics-queries.md) Q0.2).
4. Poke at it if needed: `psql postgres://postgres:postgres@localhost:55432/blog`, or point a local backend at it (`DB_PORT=55432`) to click through admin analytics with real shapes.
5. Clean up:
   ```bash
   docker rm -f de-prodlike && rm -rf /tmp/proddump
   ```

## When it fails

| Symptom | Meaning | Do |
|---------|---------|----|
| `run-task failed` / task exit code ≠ 0 | IAM, networking, or the dump script | Read the task's stream in `/ecs/droneedge-dev/api-server` (`DUMP_ERROR …`). |
| Phase A error | A legacy migration is not idempotent on an empty DB | Fix the migration; this is also what a fresh environment would hit. |
| Phase C error | **The next deploy would crash-loop.** | Fix the migration and rerun `restore` (no new dump needed). |
| Phase D non-zero gate check | Ledger and legacy access disagree on real data | Inspect `detail` in the output; fix the backfill or write path before deploying. |

## Related

- [`deploy.md`](deploy.md) — the deploy itself
- [`docs/tech/analytics-implementation-plan.md`](../../docs/tech/analytics-implementation-plan.md) § 2.7, § 8 — the reconciliation gate this rehearses
- [`docs/tech/backend-data.md`](../../docs/tech/backend-data.md) — migrations and entities
