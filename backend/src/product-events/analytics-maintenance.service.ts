import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { metrics } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import { gzipSync } from 'zlib';

/** Refresh order matters — later views read earlier ones. */
export const ANALYTICS_VIEWS = [
  'v_user_entitlements',
  'v_user_course_usage',
  'v_entitlement_utilization',
  'v_user_revenue',
  'v_org_utilization',
  'v_course_funnel',
  'v_cohort_retention',
] as const;

const PARTITIONS_AHEAD = 3;
const ROLLUP_LOOKBACK_DAYS = 2;
const HEARTBEAT_MINUTES = 0.5;
/** Cluster-wide mutex so two API tasks never run the nightly job concurrently. */
const MAINTENANCE_LOCK_KEY = 7461_0001;

/**
 * Nightly analytics housekeeping (docs/tech/analytics-implementation-plan.md § 7 Phase 3, § 12.4).
 * Runs at 00:30 so UserService.handleExpiredProMemberships (midnight) has finished.
 *
 *  1. keep product_events partitions PARTITIONS_AHEAD months ahead
 *  2. roll up the last ROLLUP_LOOKBACK_DAYS into product_events_daily (idempotent upsert)
 *  3. expire Pro entitlements whose ends_at has passed
 *  4. refresh the materialized views CONCURRENTLY, in dependency order
 *  5. reconcile entitlements vs. the legacy access tables → analytics_reconciliation
 *  6. archive + drop partitions older than ANALYTICS_RETENTION_MONTHS when
 *     ANALYTICS_ARCHIVE_BUCKET is set (bucket is Terraform-owned; see plan § 12.4)
 *
 * Every step is independent; a failure is logged, counted in OTel
 * (`analytics.maintenance.failures{step}`) and the next step still runs. Step
 * durations go to `analytics.maintenance.step_ms{step,status}` and the latest
 * reconciliation counts to the `analytics.reconcile.mismatches{check}` gauge —
 * all bounded label sets (analytics-and-attribution.md § three-layer model).
 *
 * A Postgres advisory lock makes the run cluster-wide exclusive: if the API
 * ever scales past one task, the second task's 00:30 tick is a no-op instead
 * of a colliding REFRESH … CONCURRENTLY.
 */
@Injectable()
export class AnalyticsMaintenanceService {
  private readonly logger = new Logger(AnalyticsMaintenanceService.name);
  private running = false;

  private readonly meter = metrics.getMeter('droneedge');
  private readonly stepDuration = this.meter.createHistogram(
    'analytics.maintenance.step_ms',
    { description: 'Nightly analytics step duration', unit: 'ms' },
  );
  private readonly stepFailures = this.meter.createCounter(
    'analytics.maintenance.failures',
    { description: 'Nightly analytics steps that threw' },
  );
  private readonly lockSkips = this.meter.createCounter(
    'analytics.maintenance.lock_skipped',
    { description: 'Runs skipped because another instance held the lock' },
  );
  private readonly lastMismatches = new Map<string, number>();

  constructor(private readonly dataSource: DataSource) {
    this.meter
      .createObservableGauge('analytics.reconcile.mismatches', {
        description:
          'Rows disagreeing between the entitlement ledger and legacy access tables (latest run)',
      })
      .addCallback((result) => {
        for (const [check, n] of this.lastMismatches) {
          result.observe(n, { check });
        }
      });
  }

  @Cron('30 0 * * *')
  async nightly(): Promise<void> {
    await this.runAll();
  }

  /** Exposed for the admin "refresh now" action and tests. */
  async runAll(): Promise<Record<string, string>> {
    if (this.running) return { status: 'already running' };
    this.running = true;

    // The advisory lock is session-scoped, so hold one connection for the run.
    const lockConn = this.dataSource.createQueryRunner();
    try {
      const lock: { locked: boolean }[] = await lockConn.query(
        `SELECT pg_try_advisory_lock($1) AS locked`,
        [MAINTENANCE_LOCK_KEY],
      );
      if (!lock[0]?.locked) {
        this.lockSkips.add(1);
        this.logger.warn(
          'analytics maintenance skipped: another instance holds the lock',
        );
        return { status: 'locked by another instance' };
      }
      return await this.runSteps();
    } finally {
      try {
        await lockConn.query(`SELECT pg_advisory_unlock($1)`, [
          MAINTENANCE_LOCK_KEY,
        ]);
      } catch {
        /* connection is released below; the lock dies with the session */
      }
      await lockConn.release();
      this.running = false;
    }
  }

  private async runSteps(): Promise<Record<string, string>> {
    const report: Record<string, string> = {};
    const steps: [string, () => Promise<string>][] = [
      ['partitions', () => this.ensurePartitions()],
      ['rollup', () => this.rollupDaily(ROLLUP_LOOKBACK_DAYS)],
      ['pro_expiry', () => this.expireProEntitlements()],
      ['views', () => this.refreshViews()],
      ['reconcile', () => this.reconcile()],
      ['archive', () => this.archiveOldPartitions()],
    ];
    for (const [name, fn] of steps) {
      const started = Date.now();
      try {
        const detail = await fn();
        const ms = Date.now() - started;
        report[name] = `${detail} (${ms} ms)`;
        this.stepDuration.record(ms, { step: name, status: 'ok' });
        this.logger.log(`analytics ${name}: ${report[name]}`);
      } catch (err) {
        report[name] = `FAILED: ${(err as Error).message}`;
        this.stepDuration.record(Date.now() - started, {
          step: name,
          status: 'failed',
        });
        this.stepFailures.add(1, { step: name });
        this.logger.error(`analytics ${name} failed`, (err as Error).stack);
      }
    }
    return report;
  }

  async ensurePartitions(): Promise<string> {
    const rows: { ensure_product_events_partition: string }[] =
      await this.dataSource.query(
        `SELECT ensure_product_events_partition((date_trunc('month', now()) + (i || ' month')::interval)::date)
         FROM generate_series(0, $1) AS i`,
        [PARTITIONS_AHEAD],
      );
    return rows.map((r) => r.ensure_product_events_partition).join(', ');
  }

  /**
   * Recomputes product_events_daily for [today - days, today]. Today is
   * included so the manager dashboard's "this week" figures only need the
   * rollup + a live query over the current partition for the current day.
   */
  async rollupDaily(days = ROLLUP_LOOKBACK_DAYS): Promise<string> {
    const affected = await this.execCount(
      `INSERT INTO product_events_daily
         (user_id, course_id, day, organization_id, class_id, entitlement_source,
          minutes_engaged, lessons_viewed, videos_completed, units_completed, exams_submitted, events, computed_at)
       SELECT pe.user_id, pe.course_id, (pe.occurred_at AT TIME ZONE 'UTC')::date AS day,
              MAX(pe.organization_id), MAX(pe.class_id), MAX(pe.entitlement_source),
              COUNT(*) FILTER (WHERE pe.event_name = 'lesson_heartbeat') * $2::numeric,
              COUNT(*) FILTER (WHERE pe.event_name = 'lesson_viewed'),
              COUNT(*) FILTER (WHERE pe.event_name = 'video_completed'),
              COUNT(*) FILTER (WHERE pe.event_name IN ('unit_completed', 'lesson_completed')),
              COUNT(*) FILTER (WHERE pe.event_name IN ('exam_submitted', 'exam_submit')),
              COUNT(*), now()
       FROM product_events pe
       WHERE pe.user_id IS NOT NULL AND pe.course_id IS NOT NULL
         AND pe.occurred_at >= (CURRENT_DATE - $1::int)::timestamptz
       GROUP BY pe.user_id, pe.course_id, (pe.occurred_at AT TIME ZONE 'UTC')::date
       ON CONFLICT (user_id, course_id, day) DO UPDATE SET
         organization_id    = EXCLUDED.organization_id,
         class_id           = EXCLUDED.class_id,
         entitlement_source = EXCLUDED.entitlement_source,
         minutes_engaged    = EXCLUDED.minutes_engaged,
         lessons_viewed     = EXCLUDED.lessons_viewed,
         videos_completed   = EXCLUDED.videos_completed,
         units_completed    = EXCLUDED.units_completed,
         exams_submitted    = EXCLUDED.exams_submitted,
         events             = EXCLUDED.events,
         computed_at        = now()`,
      [days, HEARTBEAT_MINUTES],
    );
    return `${affected} user×course×day rows upserted`;
  }

  async expireProEntitlements(): Promise<string> {
    const n = await this.execCount(
      `UPDATE entitlements SET revoked_at = ends_at, revoke_reason = 'expired'
       WHERE course_id IS NULL AND revoked_at IS NULL AND ends_at IS NOT NULL AND ends_at < now()`,
    );
    return `${n} pro entitlements expired`;
  }

  /** Runs a write statement and returns the affected row count. */
  private async execCount(
    sql: string,
    params: unknown[] = [],
  ): Promise<number> {
    const runner = this.dataSource.createQueryRunner();
    try {
      const res = await runner.query(sql, params, true);
      return res.affected ?? 0;
    } finally {
      await runner.release();
    }
  }

  async refreshViews(): Promise<string> {
    const done: string[] = [];
    for (const view of ANALYTICS_VIEWS) {
      try {
        await this.dataSource.query(
          `REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`,
        );
      } catch (err) {
        // First refresh after creation cannot be CONCURRENTLY on some PG versions
        // when the view is unpopulated; fall back to a blocking refresh.
        this.logger.warn(
          `CONCURRENTLY refresh of ${view} failed (${(err as Error).message}); retrying non-concurrently`,
        );
        await this.dataSource.query(`REFRESH MATERIALIZED VIEW ${view}`);
      }
      done.push(view);
    }
    // Materialized views carry no refresh timestamp; record one for /reporting/health.
    await this.dataSource.query(
      `INSERT INTO analytics_reconciliation (check_name, mismatches, detail)
       VALUES ('views_refreshed', 0, $1::jsonb)`,
      [JSON.stringify({ views: done })],
    );
    return done.join(', ');
  }

  /**
   * Compares the entitlement ledger with the legacy access tables. Zero
   * mismatches for 14 consecutive nights is the gate for switching hasAccess
   * to entitlements (PD22). Rows are written to analytics_reconciliation.
   */
  async reconcile(): Promise<string> {
    const checks: { name: string; sql: string }[] = [
      {
        // user_courses_purchased rows without a live direct entitlement
        name: 'ucp_without_entitlement',
        sql: `SELECT ucp."usersId" AS user_id, ucp."coursesId" AS course_id
              FROM user_courses_purchased ucp
              WHERE NOT EXISTS (
                SELECT 1 FROM entitlements e
                WHERE e.user_id = ucp."usersId" AND e.course_id = ucp."coursesId" AND e.revoked_at IS NULL)`,
      },
      {
        // live direct entitlements with no legacy row
        name: 'entitlement_without_ucp',
        sql: `SELECT e.user_id, e.course_id FROM entitlements e
              WHERE e.course_id IS NOT NULL AND e.revoked_at IS NULL
                AND e.source IN ('purchase', 'bundle', 'admin_grant', 'signup_link')
                AND NOT EXISTS (
                  SELECT 1 FROM user_courses_purchased ucp
                  WHERE ucp."usersId" = e.user_id AND ucp."coursesId" = e.course_id)`,
      },
      {
        // active Pro users without a live pro entitlement
        name: 'pro_user_without_entitlement',
        sql: `SELECT u.id AS user_id FROM users u
              WHERE u.role = 'pro' AND u.pro_membership_expires_at > now()
                AND NOT EXISTS (
                  SELECT 1 FROM entitlements e
                  WHERE e.user_id = u.id AND e.course_id IS NULL AND e.revoked_at IS NULL)`,
      },
      {
        // live pro entitlement for a user who is no longer Pro
        name: 'pro_entitlement_without_user',
        sql: `SELECT e.user_id FROM entitlements e
              JOIN users u ON u.id = e.user_id
              WHERE e.course_id IS NULL AND e.revoked_at IS NULL
                AND NOT (u.role = 'pro' AND u.pro_membership_expires_at > now())`,
      },
      {
        // The PD22 gate proper: user × course pairs where the legacy rule
        // (purchased_courses ∪ active Pro × all courses) and the ledger rule
        // (EntitlementService.hasLiveAccess) disagree. Zero here means the
        // ENTITLEMENTS_AUTHORITATIVE flip cannot change anyone's access.
        name: 'access_diff',
        sql: `WITH legacy AS (
                SELECT ucp."usersId" AS user_id, ucp."coursesId" AS course_id FROM user_courses_purchased ucp
                UNION
                SELECT u.id, c.id FROM users u CROSS JOIN courses c
                WHERE u.role = 'pro' AND u.pro_membership_expires_at > now()
              ), ledger AS (
                SELECT e.user_id, e.course_id FROM entitlements e
                WHERE e.course_id IS NOT NULL AND e.revoked_at IS NULL
                  AND e.starts_at <= now() AND (e.ends_at IS NULL OR e.ends_at > now())
                UNION
                SELECT e.user_id, c.id FROM entitlements e CROSS JOIN courses c
                WHERE e.course_id IS NULL AND e.revoked_at IS NULL
                  AND e.starts_at <= now() AND (e.ends_at IS NULL OR e.ends_at > now())
              )
              SELECT COALESCE(l.user_id, g.user_id) AS user_id,
                     COALESCE(l.course_id, g.course_id) AS course_id,
                     (l.user_id IS NOT NULL) AS legacy_access,
                     (g.user_id IS NOT NULL) AS ledger_access
              FROM legacy l FULL OUTER JOIN ledger g
                ON g.user_id = l.user_id AND g.course_id = l.course_id
              WHERE l.user_id IS NULL OR g.user_id IS NULL`,
      },
      {
        // A Stripe purchase whose grant succeeded but whose order insert failed
        // (PurchaseService.recordCourseOrder swallows the error so fulfilment
        // is never blocked). price_estimated = false distinguishes these from
        // the migration backfill of historical purchases, which is the next check.
        // Repair: POST /purchases/admin/backfill-order.
        name: 'paid_grant_without_order',
        sql: `SELECT e.id AS entitlement_id, e.user_id, e.course_id, e.created_at
              FROM entitlements e
              WHERE e.source IN ('purchase', 'bundle') AND e.revoked_at IS NULL
                AND e.order_item_id IS NULL AND e.price_estimated = false`,
      },
      {
        // Historical purchases carried over by the migration with a catalog
        // price. Expected non-zero until the Stripe backfill (PD1) has run;
        // informational, not a PD22 gate.
        name: 'legacy_purchase_without_order',
        sql: `SELECT e.id AS entitlement_id, e.user_id, e.course_id
              FROM entitlements e
              WHERE e.source = 'purchase' AND e.revoked_at IS NULL
                AND e.order_item_id IS NULL AND e.price_estimated = true`,
      },
    ];
    const summary: string[] = [];
    for (const c of checks) {
      const rows: unknown[] = await this.dataSource.query(c.sql);
      await this.dataSource.query(
        `INSERT INTO analytics_reconciliation (check_name, mismatches, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [c.name, rows.length, JSON.stringify(rows.slice(0, 50))],
      );
      this.lastMismatches.set(c.name, rows.length);
      summary.push(`${c.name}=${rows.length}`);
    }
    return summary.join(' ');
  }

  /** Checks that must be zero for 14 nights before hasAccess switches to entitlements (PD22). */
  static readonly GATE_CHECKS = [
    'ucp_without_entitlement',
    'entitlement_without_ucp',
    'pro_user_without_entitlement',
    'pro_entitlement_without_user',
    'access_diff',
    'paid_grant_without_order',
  ] as const;

  /**
   * Streams each partition older than the retention window to
   * s3://$ANALYTICS_ARCHIVE_BUCKET/product_events/<partition>.ndjson.gz (only
   * non-org rows — org-member raw events are deleted, PD23), then DETACH + DROP.
   * No-op unless the bucket env var is set; the bucket itself is declared in Terraform.
   */
  async archiveOldPartitions(): Promise<string> {
    const bucket = process.env.ANALYTICS_ARCHIVE_BUCKET;
    const retentionMonths = Number(
      process.env.ANALYTICS_RETENTION_MONTHS || 12,
    );
    const candidates: { relname: string }[] = await this.dataSource.query(
      `SELECT c.relname
       FROM pg_inherits i
       JOIN pg_class c ON c.oid = i.inhrelid
       JOIN pg_class p ON p.oid = i.inhparent
       WHERE p.relname = 'product_events'
         AND c.relname ~ '^product_events_y[0-9]{4}m[0-9]{2}$'
         AND to_date(substring(c.relname from 'y([0-9]{4})m') || substring(c.relname from 'm([0-9]{2})$'), 'YYYYMM')
             < date_trunc('month', now()) - ($1 || ' month')::interval
       ORDER BY c.relname`,
      [retentionMonths],
    );
    if (!candidates.length) return 'nothing older than retention';
    if (!bucket) {
      return `${candidates.length} partition(s) past retention but ANALYTICS_ARCHIVE_BUCKET unset — skipped`;
    }

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const archived: string[] = [];
    for (const { relname } of candidates) {
      const rows: Record<string, unknown>[] = await this.dataSource.query(
        `SELECT * FROM ${relname} WHERE organization_id IS NULL ORDER BY id`,
      );
      const body = gzipSync(
        rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
      );
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `product_events/${relname}.ndjson.gz`,
          Body: body,
          ContentType: 'application/x-ndjson',
          ContentEncoding: 'gzip',
        }),
      );
      await this.dataSource.query(
        `ALTER TABLE product_events DETACH PARTITION ${relname}`,
      );
      await this.dataSource.query(`DROP TABLE ${relname}`);
      archived.push(`${relname}(${rows.length})`);
    }
    return `archived ${archived.join(', ')}`;
  }
}
