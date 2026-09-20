/**
 * Restore half of scripts/prod-db-clone.sh (run through it, not directly).
 *
 *   A. replay the migrations prod has applied, in prod's order (from its
 *      `migrations` table) — legacy backend/migrations and src/migrations
 *      interleave, so groups are run in the same sequence prod saw them
 *   B. load the scrubbed rows, restore sequences
 *   C. run every migration pending in this checkout, one at a time, timed —
 *      the same set `migrationsRun: true` will apply on the next deploy
 *   D. run AnalyticsMaintenanceService.runAll() and print reconciliation +
 *      key row counts, so the PD22 gate can be judged on real data
 *
 * Env: OUT (dump dir, default /tmp/proddump), PGPORT (default 55432).
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { defaultConnection } from '../backend/src/config/app.config';
import { AnalyticsMaintenanceService } from '../backend/src/product-events/analytics-maintenance.service';

const ROOT = path.resolve(__dirname, '..');
const L = path.join(ROOT, 'backend/migrations') + '/';
const S = path.join(ROOT, 'backend/src/migrations') + '/';
const D = (process.env.OUT || '/tmp/proddump') + '/';
/** Legacy migrations at/after this timestamp were applied after the src/ ones in prod. */
const LEGACY_SPLIT = 1762600000000;

const ts = (f: string) => Number(path.basename(f).split('-')[0]);
const conn = {
  ...defaultConnection,
  host: 'localhost',
  port: Number(process.env.PGPORT || 55432),
  username: 'postgres',
  password: 'postgres',
  database: 'blog',
  ssl: undefined,
  logging: ['error', 'warn'],
} as Record<string, unknown>;

async function runMigrations(files: string[], label: string): Promise<void> {
  if (!files.length) return;
  const ds = new DataSource({ ...conn, migrations: files } as never);
  await ds.initialize();
  const t0 = Date.now();
  const ran = await ds.runMigrations();
  console.log(`[${label}] ${ran.map((m) => m.name).join(', ')} (${Date.now() - t0} ms)`);
  await ds.destroy();
}

async function main(): Promise<void> {
  const prodMigrations: { id: number; name: string }[] = JSON.parse(
    fs.readFileSync(D + 'tables/migrations.json', 'utf8'),
  );
  const applied = new Set(prodMigrations.map((m) => m.name));
  const legacy = fs.readdirSync(L).filter((f) => f.endsWith('.ts')).sort();
  const src = fs.readdirSync(S).filter((f) => f.endsWith('.ts')).sort();
  const className = (f: string) => /export class (\w+)/.exec(fs.readFileSync(f, 'utf8'))?.[1] ?? '';
  const isApplied = (f: string) => applied.has(className(f));

  console.log('== A. schema at prod state ==');
  await runMigrations(legacy.filter((f) => ts(f) < LEGACY_SPLIT && isApplied(L + f)).map((f) => L + f), 'legacy (early)');
  await runMigrations(src.filter((f) => isApplied(S + f)).map((f) => S + f), 'src');
  await runMigrations(legacy.filter((f) => ts(f) >= LEGACY_SPLIT && isApplied(L + f)).map((f) => L + f), 'legacy (late)');

  console.log('== B. import prod data ==');
  const ds = new DataSource({ ...conn, migrations: [] } as never);
  await ds.initialize();
  await ds.query(`SET session_replication_role = replica`);
  const tables = fs
    .readdirSync(D + 'tables')
    .map((f) => f.replace('.json', ''))
    .filter((t) => t !== 'migrations');
  // Truncate everything up front — a CASCADE mid-loop would wipe already-loaded FK children.
  await ds.query(`TRUNCATE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`);
  for (const t of tables) {
    const rows = JSON.parse(fs.readFileSync(`${D}tables/${t}.json`, 'utf8'));
    if (!rows.length) continue;
    await ds.query(`INSERT INTO "${t}" SELECT * FROM json_populate_recordset(NULL::"${t}", $1::json)`, [
      JSON.stringify(rows),
    ]);
  }
  for (const t of tables) {
    const expected = JSON.parse(fs.readFileSync(`${D}tables/${t}.json`, 'utf8')).length;
    const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM "${t}"`);
    if (n !== expected) throw new Error(`${t}: imported ${n} of ${expected}`);
  }
  for (const s of JSON.parse(fs.readFileSync(D + 'seq.json', 'utf8'))) {
    if (s.v != null) await ds.query(`SELECT setval($1, $2::bigint)`, [s.s, s.v]);
  }
  await ds.query(`SET session_replication_role = DEFAULT`);
  console.log(`imported ${tables.length} tables`);
  await ds.destroy();

  console.log('== C. pending migrations (deploy order) ==');
  const pending = [
    ...legacy.filter((f) => !isApplied(L + f)).map((f) => L + f),
    ...src.filter((f) => !isApplied(S + f)).map((f) => S + f),
  ].sort((a, b) => ts(a) - ts(b));
  console.log(pending.length ? pending.map((p) => path.basename(p)).join(', ') : '(none)');
  for (const p of pending) await runMigrations([p], path.basename(p));

  console.log('== D. nightly maintenance + reconciliation ==');
  const ds2 = new DataSource({ ...conn, migrations: [] } as never);
  await ds2.initialize();
  const report = await new AnalyticsMaintenanceService(ds2).runAll();
  console.log(JSON.stringify(report, null, 1));
  const counts = await ds2.query(`
    SELECT 'users' t, count(*)::int n FROM users
    UNION ALL SELECT 'user_courses_purchased', count(*) FROM user_courses_purchased
    UNION ALL SELECT 'entitlements', count(*) FROM entitlements
    UNION ALL SELECT 'orders', count(*) FROM orders
    UNION ALL SELECT 'progress', count(*) FROM progress
    UNION ALL SELECT 'exam_attempt_history', count(*) FROM exam_attempt_history
    UNION ALL SELECT 'v_entitlement_utilization', count(*) FROM v_entitlement_utilization
    UNION ALL SELECT 'v_org_utilization', count(*) FROM v_org_utilization
    UNION ALL SELECT 'v_course_funnel', count(*) FROM v_course_funnel
    UNION ALL SELECT 'product_events partitions', count(*) FROM pg_inherits i JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'product_events'`);
  console.table(counts);
  const recon = await ds2.query(
    `SELECT DISTINCT ON (check_name) check_name, mismatches, detail
     FROM analytics_reconciliation WHERE check_name <> 'views_refreshed' ORDER BY check_name, ran_at DESC`,
  );
  console.table(recon.map((r: { check_name: string; mismatches: number }) => ({ check: r.check_name, mismatches: r.mismatches })));
  const bad = recon.filter((r: { mismatches: number }) => r.mismatches > 0);
  if (bad.length) console.log('mismatch detail:', JSON.stringify(bad, null, 1));
  await ds2.destroy();
}

main().catch((e) => {
  console.error('FAILED:', e.message ?? e);
  process.exit(1);
});
