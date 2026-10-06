import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { metrics } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import { gzipSync } from 'zlib';
import { ENGAGEMENT_SQL } from './engagement-sql';

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
/** Catch-up ceiling after missed nights (R7); matches the 35-day "contract" window. */
const ROLLUP_MAX_CATCHUP_DAYS = 35;
/** Separate from the nightly mutex so the hourly rollup can run on its own. */
const ROLLUP_LOCK_KEY = 7461_0002;
/** Cluster-wide mutex so two API tasks never run the nightly job concurrently. */
const MAINTENANCE_LOCK_KEY = 7461_0001;

/**
 * Nightly analytics housekeeping (docs/tech/analytics-implementation-plan.md § 7 Phase 3, § 12.4).
 * Runs at 00:30 so UserService.handleExpiredProMemberships (midnight) has finished.
 *
 *  1. keep product_events partitions PARTITIONS_AHEAD months ahead
 *  2. roll up into product_events_daily (idempotent upsert) — the last
 *     ROLLUP_LOOKBACK_DAYS, or back to the last successful rollup after missed nights
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
  private readonly lastTrackingViolations = new Map<string, number>();

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
    this.meter
      .createObservableGauge('progress.tracking_violations', {
        description:
          'Rows breaking a progress-tracking invariant (latest nightly run) — docs/tech/progress-tracking-accuracy.md Phase 4',
      })
      .addCallback((result) => {
        for (const [check, n] of this.lastTrackingViolations) {
          result.observe(n, { check });
        }
      });
  }

  @Cron('30 0 * * *')
  async nightly(): Promise<void> {
    await this.runAll();
  }

  /**
   * Hourly top-up of the last 2 days so teacher reads can take everything
   * older than local yesterday from the rollup (RAW_RECENT_DAYS). Skips itself
   * when another instance or the nightly job holds the rollup lock.
   */
  @Cron('15 * * * *')
  async hourlyRollup(): Promise<void> {
    try {
      this.logger.log(`analytics hourly rollup: ${await this.rollupDaily(2)}`);
    } catch (err) {
      this.logger.error(
        `analytics hourly rollup failed: ${(err as Error).message}`,
      );
    }
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
      ['rollup', () => this.rollupDaily()],
      ['pro_expiry', () => this.expireProEntitlements()],
      ['views', () => this.refreshViews()],
      ['reconcile', () => this.reconcile()],
      ['tracking_checks', () => this.trackingChecks()],
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
   * Rebuilds product_events_daily for [today - days, today]. Rows of org
   * members are keyed by the org's local date (organizations.timezone, PTD4),
   * everyone else's by the UTC date. Runs nightly (with catch-up) and hourly
   * for the last 2 days.
   *
   * With no explicit `days`, the window reaches back to the day of the last
   * successful rollup (at least ROLLUP_LOOKBACK_DAYS, at most
   * ROLLUP_MAX_CATCHUP_DAYS), so nights the job missed are backfilled rather
   * than left as permanent gaps (R7). Counts use ENGAGEMENT_SQL — the same
   * definitions as the live "today" queries.
   */
  async rollupDaily(days?: number): Promise<string> {
    const lookback = days ?? (await this.rollupCatchupDays());
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const [{ locked }] = await runner.query(
        `SELECT pg_try_advisory_xact_lock($1) AS locked`,
        [ROLLUP_LOCK_KEY],
      );
      if (!locked) {
        await runner.rollbackTransaction();
        return 'skipped — another rollup is running';
      }
      // Rebuild the window rather than upsert into it: a day's key depends on
      // the org's time zone, so a row keyed under a different zone (or a day
      // whose events moved) must not survive next to its replacement.
      await runner.query(
        `DELETE FROM product_events_daily WHERE day >= CURRENT_DATE - $1::int`,
        [lookback],
      );
      const res = await runner.query(
        `WITH ev AS (
           SELECT pe.*,
                  (pe.occurred_at AT TIME ZONE COALESCE(o.timezone, 'UTC'))::date AS local_day
           FROM product_events pe
           LEFT JOIN organizations o ON o.id = pe.organization_id
           WHERE pe.user_id IS NOT NULL AND pe.course_id IS NOT NULL
             AND pe.occurred_at >= (CURRENT_DATE - $1::int - 1)::timestamptz
         )
         INSERT INTO product_events_daily
           (user_id, course_id, day, organization_id, class_id, entitlement_source,
            minutes_engaged, lessons_viewed, videos_completed, units_completed, exams_submitted, events, computed_at)
         SELECT pe.user_id, pe.course_id, pe.local_day,
                MAX(pe.organization_id), MAX(pe.class_id), MAX(pe.entitlement_source),
                ${ENGAGEMENT_SQL.minutes},
                ${ENGAGEMENT_SQL.lessonsViewed},
                ${ENGAGEMENT_SQL.videosCompleted},
                ${ENGAGEMENT_SQL.unitsCompleted},
                ${ENGAGEMENT_SQL.examsSubmitted},
                COUNT(*), now()
         FROM ev pe
         WHERE pe.local_day >= CURRENT_DATE - $1::int
         GROUP BY pe.user_id, pe.course_id, pe.local_day
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
        [lookback],
        true,
      );
      await runner.commitTransaction();
      return `${res.affected ?? 0} user×course×day rows rebuilt (${lookback} days)`;
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }

  /** Days since the last rollup wrote anything, clamped to [default, max]. */
  private async rollupCatchupDays(): Promise<number> {
    const rows: { gap: number | null }[] = await this.dataSource.query(
      `SELECT (CURRENT_DATE - MAX(computed_at)::date)::int AS gap FROM product_events_daily`,
    );
    const gap = rows[0]?.gap;
    if (gap == null) return ROLLUP_MAX_CATCHUP_DAYS;
    return Math.min(
      ROLLUP_MAX_CATCHUP_DAYS,
      Math.max(ROLLUP_LOOKBACK_DAYS, gap + 1),
    );
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

  /**
   * Phase 4 of docs/tech/progress-tracking-accuracy.md: invariants on what
   * teachers are shown. Each check returns offending rows; counts go to the
   * `progress.tracking_violations{check}` gauge (Grafana "Tracking data
   * check failed") and, with up to 50 sample rows, to analytics_reconciliation
   * as `tracking_<check>`. Runs after the rollup, so day − 2 is closed in
   * every time zone.
   */
  async trackingChecks(): Promise<string> {
    const checks: { name: string; sql: string }[] = [
      {
        // More than 10 h engaged in one day on one course — heartbeats are
        // being double counted or a client is misbehaving.
        name: 'minutes_over_cap',
        sql: `SELECT user_id, course_id, day, minutes_engaged FROM product_events_daily
              WHERE day >= CURRENT_DATE - 2 AND minutes_engaged > 600`,
      },
      {
        // The stored % complete disagrees with the statuses it summarises.
        // Recent writes only: a course restructure legitimately leaves old
        // snapshots stale until the learner's next write.
        name: 'units_completed_drift',
        sql: `SELECT p.id, p."userId" AS user_id, p."courseId" AS course_id,
                     p.units_completed, r.recount
              FROM progress p
              CROSS JOIN LATERAL (
                SELECT COUNT(*)::int AS recount FROM course_units cu
                WHERE cu.course_id = p."courseId"
                  AND p.unit_statuses ->> cu.ref = 'COMPLETED'
              ) r
              WHERE p.updated_at >= now() - interval '2 days'
                AND p.units_completed <> r.recount`,
      },
      {
        // The rollup for a closed day no longer matches a recount from the
        // raw events with the same definitions (ENGAGEMENT_SQL, org-local day).
        name: 'rollup_drift',
        sql: `WITH ev AS (
                SELECT pe.*,
                       (pe.occurred_at AT TIME ZONE COALESCE(o.timezone, 'UTC'))::date AS local_day
                FROM product_events pe
                LEFT JOIN organizations o ON o.id = pe.organization_id
                WHERE pe.user_id IS NOT NULL AND pe.course_id IS NOT NULL
                  AND pe.occurred_at >= (CURRENT_DATE - 4)::timestamptz
                  AND pe.occurred_at <  (CURRENT_DATE)::timestamptz
              ), recount AS (
                SELECT pe.user_id, pe.course_id,
                       ${ENGAGEMENT_SQL.minutes} AS minutes,
                       ${ENGAGEMENT_SQL.lessonsViewed} AS lessons_viewed,
                       ${ENGAGEMENT_SQL.unitsCompleted} AS units_completed
                FROM ev pe WHERE pe.local_day = CURRENT_DATE - 2
                GROUP BY pe.user_id, pe.course_id
              )
              SELECT COALESCE(r.user_id, d.user_id) AS user_id,
                     COALESCE(r.course_id, d.course_id) AS course_id,
                     d.minutes_engaged, r.minutes
              FROM recount r
              FULL OUTER JOIN (
                SELECT * FROM product_events_daily WHERE day = CURRENT_DATE - 2
              ) d ON d.user_id = r.user_id AND d.course_id = r.course_id
              WHERE d.user_id IS NULL OR r.user_id IS NULL
                 OR d.minutes_engaged <> r.minutes
                 OR d.lessons_viewed <> r.lessons_viewed
                 OR d.units_completed <> r.units_completed`,
      },
      {
        // Opened several lessons in the last day but no heartbeat ever
        // arrived — the signature of missed sends (blocked endpoint, expired
        // session before R1, broken client). A warning, not proof.
        name: 'silent_learners',
        sql: `SELECT user_id, COUNT(*) FILTER (WHERE event_name = 'lesson_viewed')::int AS lessons_opened
              FROM product_events
              WHERE occurred_at >= now() - interval '24 hours' AND user_id IS NOT NULL
                AND event_name IN ('lesson_viewed', 'lesson_heartbeat')
              GROUP BY user_id
              HAVING COUNT(*) FILTER (WHERE event_name = 'lesson_viewed') >= 3
                 AND COUNT(*) FILTER (WHERE event_name = 'lesson_heartbeat') = 0`,
      },
    ];
    const summary: string[] = [];
    for (const c of checks) {
      const rows: unknown[] = await this.dataSource.query(c.sql);
      await this.dataSource.query(
        `INSERT INTO analytics_reconciliation (check_name, mismatches, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [`tracking_${c.name}`, rows.length, JSON.stringify(rows.slice(0, 50))],
      );
      this.lastTrackingViolations.set(c.name, rows.length);
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
   * non-org rows with user_id / anonymous_id removed — org-member raw events
   * are deleted, PD23), then DETACH + DROP.
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
      // PD23: no user_id / anonymous_id in the archive, so it identifies no
      // one and account deletion never has to reach S3.
      const body = gzipSync(
        rows
          .map((r) => {
            const rest = { ...r };
            delete rest.user_id;
            delete rest.anonymous_id;
            return JSON.stringify(rest);
          })
          .join('\n') + '\n',
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
