import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AnalyticsMaintenanceService } from '../product-events/analytics-maintenance.service';

/**
 * Company-level reads (plan § 5.2). Everything is a query over the nightly
 * materialized views or the ledgers; the SQL doubles as the reference for
 * docs/tech/analytics-queries.md — keep the two in sync.
 */
@Injectable()
export class ReportingService {
  constructor(private readonly dataSource: DataSource) {}

  private q<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }

  // ── Headline numbers ────────────────────────────────────────────────────

  async overview() {
    const [headline] = await this.q(`
      WITH recent AS (
        SELECT * FROM v_entitlement_utilization
        WHERE first_entitled_at >= now() - interval '90 days'
          AND first_entitled_at <  now() - interval '7 days'
          AND primary_source IN ('purchase', 'bundle', 'pro')
      )
      SELECT
        (SELECT COUNT(DISTINCT user_id)::int FROM v_entitlement_utilization)                       AS learners_entitled,
        (SELECT COUNT(DISTINCT user_id)::int FROM v_entitlement_utilization
          WHERE primary_source IN ('purchase', 'bundle', 'pro'))                                    AS paying_learners,
        (SELECT COUNT(DISTINCT "userId")::int FROM progress WHERE last_activity_at >= now() - interval '7 days')  AS active_7d,
        (SELECT COUNT(DISTINCT "userId")::int FROM progress WHERE last_activity_at >= now() - interval '30 days') AS active_30d,
        (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE activated) / NULLIF(COUNT(*), 0))::int FROM recent)          AS activation_rate_pct,
        (SELECT COUNT(*)::int FROM recent)                                                                          AS activation_denominator,
        (SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY pct_complete))::int
           FROM v_entitlement_utilization
          WHERE first_entitled_at < now() - interval '30 days' AND primary_source IN ('purchase', 'bundle', 'pro')) AS median_utilization_pct,
        (SELECT COUNT(*)::int FROM entitlements WHERE course_id IS NULL AND revoked_at IS NULL
           AND (ends_at IS NULL OR ends_at > now()))                                                                 AS pro_active,
        (SELECT COALESCE(SUM(active_mrr_cents), 0)::bigint FROM v_user_revenue)                                     AS mrr_cents,
        (SELECT COALESCE(SUM(total_cents - refunded_cents), 0)::bigint FROM orders
          WHERE placed_at >= now() - interval '30 days' AND payment_status <> 'failed')                             AS revenue_30d_cents,
        (SELECT COALESCE(SUM(contribution_cents), 0)::bigint FROM v_user_revenue)                                   AS contribution_total_cents,
        (SELECT ROUND(AVG(contribution_cents))::bigint FROM v_user_revenue WHERE orders_count > 0)                  AS contribution_per_payer_cents,
        (SELECT ROUND(AVG(utilization_pct_30d))::int FROM v_org_utilization WHERE members > 0)                      AS avg_org_utilization_pct,
        (SELECT COUNT(*)::int FROM v_org_utilization)                                                               AS organizations,
        (SELECT COUNT(*)::int FROM product_events WHERE occurred_at >= now() - interval '24 hours')                 AS events_24h,
        (SELECT MAX(ran_at) FROM analytics_reconciliation WHERE check_name = 'views_refreshed')                     AS views_refreshed_at
    `);
    const bySource = await this.q(`
      SELECT primary_source,
             COUNT(*)::int AS entitlements,
             COUNT(DISTINCT user_id)::int AS users,
             ROUND(100.0 * COUNT(*) FILTER (WHERE activated) / NULLIF(COUNT(*) FILTER (WHERE first_entitled_at < now() - interval '7 days'), 0))::int AS activation_pct,
             ROUND(AVG(pct_complete))::int AS avg_pct_complete,
             COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
             COUNT(*) FILTER (WHERE stalled)::int AS stalled
      FROM v_entitlement_utilization
      GROUP BY primary_source ORDER BY entitlements DESC
    `);
    return { ...headline, by_source: bySource };
  }

  async activation(days = 90) {
    return this.q(
      `SELECT date_trunc('week', first_entitled_at)::date AS week, primary_source,
              COUNT(*)::int AS entitled,
              COUNT(*) FILTER (WHERE activated)::int AS activated,
              ROUND(100.0 * COUNT(*) FILTER (WHERE activated) / NULLIF(COUNT(*), 0))::int AS activation_pct,
              ROUND(AVG(EXTRACT(EPOCH FROM (started_at - first_entitled_at)) / 86400.0), 1) AS avg_days_to_start
       FROM v_entitlement_utilization
       WHERE first_entitled_at >= now() - ($1 || ' days')::interval
       GROUP BY 1, 2 ORDER BY 1, 2`,
      [days],
    );
  }

  async utilization() {
    const buckets = await this.q(`
      SELECT primary_source,
             width_bucket(pct_complete, 0, 100, 5) AS bucket,
             COUNT(*)::int AS n
      FROM v_entitlement_utilization
      WHERE first_entitled_at < now() - interval '14 days'
      GROUP BY 1, 2 ORDER BY 1, 2
    `);
    const byCourse = await this.q(`
      SELECT eu.course_id, c.title,
             COUNT(*)::int AS entitled,
             COUNT(*) FILTER (WHERE eu.started_at IS NOT NULL)::int AS started,
             COUNT(*) FILTER (WHERE eu.status = 'COMPLETED')::int AS completed,
             ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY eu.pct_complete))::int AS median_pct,
             ROUND(AVG(eu.minutes_engaged))::int AS avg_minutes,
             ROUND(AVG(eu.videos_completed))::numeric(6,1) AS avg_videos_completed
      FROM v_entitlement_utilization eu JOIN courses c ON c.id = eu.course_id
      GROUP BY 1, 2 ORDER BY entitled DESC
    `);
    return { buckets, by_course: byCourse };
  }

  // ── Money ───────────────────────────────────────────────────────────────

  async revenue(months = 12) {
    const monthly = await this.q(
      `SELECT date_trunc('month', o.placed_at)::date AS month, oi.product_type,
              COUNT(DISTINCT o.id)::int AS orders,
              SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents)::bigint AS gross_cents,
              SUM(oi.refunded_amount_cents)::bigint AS refunded_cents,
              SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents - oi.refunded_amount_cents)::bigint AS net_cents,
              SUM(oi.unit_cost_cents * oi.quantity)::bigint AS cogs_cents
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.payment_status <> 'failed' AND o.placed_at >= date_trunc('month', now()) - ($1 || ' months')::interval
       GROUP BY 1, 2 ORDER BY 1, 2`,
      [months],
    );
    const [totals] = await this.q(`
      SELECT COALESCE(SUM(gross_cents), 0)::bigint AS gross_cents,
             COALESCE(SUM(refunded_cents), 0)::bigint AS refunded_cents,
             COALESCE(SUM(net_cents), 0)::bigint AS net_cents,
             COALESCE(SUM(contribution_cents), 0)::bigint AS contribution_cents,
             COALESCE(SUM(digital_cents), 0)::bigint AS digital_cents,
             COALESCE(SUM(hardware_cents), 0)::bigint AS hardware_cents,
             COALESCE(SUM(active_mrr_cents), 0)::bigint AS mrr_cents,
             COUNT(*)::int AS payers,
             ROUND(AVG(net_cents))::bigint AS avg_net_per_payer_cents,
             COUNT(*) FILTER (WHERE course_orders >= 2)::int AS repeat_buyers
      FROM v_user_revenue
    `);
    const bySku = await this.q(`
      SELECT oi.sku, p.name, oi.product_type,
             SUM(oi.quantity)::int AS units,
             SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents - oi.refunded_amount_cents)::bigint AS net_cents,
             COUNT(DISTINCT o.user_id)::int AS buyers
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.payment_status <> 'failed'
      LEFT JOIN products p ON p.sku = oi.sku
      GROUP BY 1, 2, 3 ORDER BY net_cents DESC
    `);
    const paymentMethods = await this.q(`
      SELECT payment_method, COUNT(*)::int AS orders, SUM(total_cents - refunded_cents)::bigint AS net_cents
      FROM orders WHERE payment_status <> 'failed' GROUP BY 1 ORDER BY net_cents DESC
    `);
    return { monthly, totals, by_sku: bySku, payment_methods: paymentMethods };
  }

  async pro(months = 12) {
    const [now] = await this.q(`
      SELECT
        (SELECT COUNT(*)::int FROM entitlements WHERE course_id IS NULL AND revoked_at IS NULL
           AND (ends_at IS NULL OR ends_at > now())) AS active,
        (SELECT COUNT(*)::int FROM entitlements WHERE course_id IS NULL AND revoked_at IS NULL
           AND (ends_at IS NULL OR ends_at > now()) AND product_sku = 'PRO_YEARLY') AS active_yearly,
        (SELECT COALESCE(SUM(active_mrr_cents), 0)::bigint FROM v_user_revenue) AS mrr_cents,
        (SELECT COUNT(*)::int FROM product_events WHERE event_name = 'pro_payment_failed'
           AND occurred_at >= now() - interval '30 days') AS payment_failed_30d,
        (SELECT COUNT(*)::int FROM product_events WHERE event_name = 'pro_cancel_scheduled'
           AND occurred_at >= now() - interval '30 days') AS cancel_scheduled_30d,
        (SELECT ROUND(AVG(pct_complete))::int FROM v_entitlement_utilization WHERE primary_source = 'pro') AS avg_pct_complete,
        (SELECT ROUND(AVG(courses_touched), 1) FROM (
           SELECT user_id, COUNT(*) FILTER (WHERE started_at IS NOT NULL) AS courses_touched
           FROM v_entitlement_utilization WHERE primary_source = 'pro' GROUP BY user_id) t) AS avg_courses_touched
    `);
    const monthly = await this.q(
      `SELECT date_trunc('month', occurred_at)::date AS month,
              COUNT(*) FILTER (WHERE event_name = 'pro_started')::int   AS started,
              COUNT(*) FILTER (WHERE event_name = 'pro_renewed')::int   AS renewed,
              COUNT(*) FILTER (WHERE event_name = 'pro_cancelled')::int AS cancelled,
              COUNT(*) FILTER (WHERE event_name = 'pro_expired')::int   AS expired,
              COUNT(*) FILTER (WHERE event_name = 'pro_payment_failed')::int AS payment_failed
       FROM product_events
       WHERE event_name LIKE 'pro_%' AND occurred_at >= date_trunc('month', now()) - ($1 || ' months')::interval
       GROUP BY 1 ORDER BY 1`,
      [months],
    );
    const cohorts = await this.q(`
      SELECT date_trunc('month', starts_at)::date AS cohort_month,
             COUNT(*)::int AS started,
             COUNT(*) FILTER (WHERE revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now()))::int AS still_active,
             COUNT(*) FILTER (WHERE revoke_reason = 'cancelled')::int AS cancelled,
             COUNT(*) FILTER (WHERE revoke_reason = 'expired')::int AS expired,
             ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(revoked_at, now()) - starts_at)) / 2629800.0), 1) AS avg_months
      FROM entitlements WHERE course_id IS NULL
      GROUP BY 1 ORDER BY 1
    `);
    return { ...now, monthly, cohorts };
  }

  // ── B2B ─────────────────────────────────────────────────────────────────

  async organizations() {
    return this.q(
      `SELECT * FROM v_org_utilization ORDER BY utilization_pct_30d ASC, name`,
    );
  }

  async organization(orgId: number) {
    const [row] = await this.q(
      `SELECT * FROM v_org_utilization WHERE organization_id = $1`,
      [orgId],
    );
    if (!row)
      throw new NotFoundException('Organization not found in analytics.');
    const series = await this.q(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, ROUND(SUM(minutes_engaged), 1)::float AS minutes,
              COUNT(DISTINCT user_id)::int AS active_members
       FROM product_events_daily WHERE organization_id = $1 AND day >= CURRENT_DATE - 56
       GROUP BY day ORDER BY day`,
      [orgId],
    );
    const courses = await this.q(
      `SELECT eu.course_id, c.title, COUNT(*)::int AS members,
              COUNT(*) FILTER (WHERE eu.started_at IS NOT NULL)::int AS started,
              COUNT(*) FILTER (WHERE eu.status = 'COMPLETED')::int AS completed,
              ROUND(AVG(eu.pct_complete))::int AS avg_pct
       FROM v_entitlement_utilization eu JOIN courses c ON c.id = eu.course_id
       WHERE eu.organization_id = $1 GROUP BY 1, 2 ORDER BY members DESC`,
      [orgId],
    );
    const orders = await this.q(
      `SELECT o.id, o.placed_at, o.payment_method, o.total_cents, o.payment_status,
              (SELECT SUM(oi.quantity)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.product_type = 'seats') AS seats
       FROM orders o WHERE o.organization_id = $1 ORDER BY o.placed_at DESC`,
      [orgId],
    );
    return { ...row, series, courses, orders };
  }

  // ── Courses ─────────────────────────────────────────────────────────────

  async courseFunnel(courseId: number) {
    const rows = await this.q(
      `SELECT * FROM v_course_funnel WHERE course_id = $1 ORDER BY path`,
      [courseId],
    );
    if (!rows.length) throw new NotFoundException('No funnel data for course.');
    const [summary] = await this.q(
      `SELECT COUNT(*)::int AS entitled,
              COUNT(*) FILTER (WHERE started_at IS NOT NULL)::int AS started,
              COUNT(*) FILTER (WHERE activated)::int AS activated,
              COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
              ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY pct_complete))::int AS median_pct,
              ROUND(AVG(minutes_engaged))::int AS avg_minutes,
              ROUND(AVG(best_score))::int AS avg_best_score
       FROM v_entitlement_utilization WHERE course_id = $1`,
      [courseId],
    );
    const [exams, quizPassed] = await Promise.all([
      this.q(
        `SELECT h.exam_id, e.scope, e.exam_pool, e.scope_refs,
                COALESCE(
                  NULLIF((
                    SELECT string_agg(COALESCE(cu.title, u.ref), ' · ' ORDER BY u.ord)
                    FROM unnest(COALESCE(e.scope_refs, '{}'::varchar[])) WITH ORDINALITY AS u(ref, ord)
                    LEFT JOIN course_units cu
                      ON cu.course_id = $1 AND cu.ref = u.ref
                  ), ''),
                  CASE e.scope WHEN 'full_course' THEN 'Full course' ELSE e.scope END
                ) AS title,
                COUNT(*)::int AS attempts,
                COUNT(DISTINCT h.user_id)::int AS users,
                ROUND(AVG(h.score))::int AS avg_score,
                ROUND(100.0 * COUNT(*) FILTER (WHERE h.score >= 70) / COUNT(*))::int AS pass_pct,
                ROUND(AVG(h.attempt_no), 1)::float AS avg_attempt_no,
                ROUND(AVG(h.score) FILTER (WHERE h.attempt_no = 1))::int AS first_try_avg,
                MAX(h.submitted_at) AS last_submitted_at
         FROM exam_attempt_history h JOIN exams e ON e.id = h.exam_id
         WHERE h.course_id = $1
         GROUP BY h.exam_id, e.scope, e.exam_pool, e.scope_refs
         ORDER BY attempts DESC, last_submitted_at DESC NULLS LAST`,
        [courseId],
      ),
      this.q<{ unit_ref: string; quiz_passed: number }>(
        `SELECT ref AS unit_ref, COUNT(DISTINCT h.user_id)::int AS quiz_passed
         FROM exam_attempt_history h
         JOIN exams e ON e.id = h.exam_id
         CROSS JOIN LATERAL unnest(
           CASE WHEN COALESCE(cardinality(h.scope_refs), 0) > 0
                THEN h.scope_refs
                ELSE COALESCE(e.scope_refs, '{}'::varchar[]) END
         ) AS ref
         WHERE h.course_id = $1 AND h.score >= 70
         GROUP BY 1`,
        [courseId],
      ),
    ]);
    const passedByRef = new Map(
      quizPassed.map((r) => [r.unit_ref, Number(r.quiz_passed) || 0]),
    );
    const units = rows.map((u) => ({
      ...u,
      quiz_passed: passedByRef.get(String((u as { unit_ref: string }).unit_ref)) ?? 0,
    }));
    return { summary, units, exams };
  }

  async courseExamAttempts(courseId: number, examId: number) {
    const [exam] = await this.q(
      `SELECT id FROM exams WHERE id = $1 AND course_id = $2`,
      [examId, courseId],
    );
    if (!exam) throw new NotFoundException('Exam not found for this course.');
    return this.q(
      `SELECT h.id, h.user_id, u.username, u.email,
              h.attempt_no, h.score, h.submitted_at,
              (h.score >= 70) AS passed, h.section_breakdown
       FROM exam_attempt_history h
       JOIN users u ON u.id = h.user_id
       WHERE h.course_id = $1 AND h.exam_id = $2
       ORDER BY h.submitted_at DESC, h.attempt_no DESC`,
      [courseId, examId],
    );
  }

  async cohorts() {
    return this.q(
      `SELECT * FROM v_cohort_retention ORDER BY cohort_month DESC, primary_source`,
    );
  }

  // ── User 360 ────────────────────────────────────────────────────────────

  async user360(userId: number) {
    const [user] = await this.q(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.pro_membership_expires_at,
              u.is_email_verified,
              m.organization_id, o.name AS organization_name, m.class_id, m.role AS org_role
       FROM users u
       LEFT JOIN organization_members m ON m.user_id = u.id
       LEFT JOIN organizations o ON o.id = m.organization_id
       WHERE u.id = $1 LIMIT 1`,
      [userId],
    );
    if (!user) throw new NotFoundException('User not found.');
    const [entitlements, usage, revenue, orders, events, logins] =
      await Promise.all([
        this.q(
          `SELECT e.*, c.title AS course_title FROM entitlements e
           LEFT JOIN courses c ON c.id = e.course_id WHERE e.user_id = $1 ORDER BY e.starts_at DESC`,
          [userId],
        ),
        this.q(
          `SELECT u.*, c.title AS course_title FROM v_user_course_usage u
           JOIN courses c ON c.id = u.course_id WHERE u.user_id = $1 ORDER BY u.last_activity_at DESC NULLS LAST`,
          [userId],
        ),
        this.q(`SELECT * FROM v_user_revenue WHERE user_id = $1`, [userId]),
        this.q(
          `SELECT o.id, o.placed_at, o.payment_method, o.payment_status, o.total_cents, o.refunded_cents,
                  (SELECT json_agg(json_build_object('sku', oi.sku, 'product_type', oi.product_type,
                          'unit_price_cents', oi.unit_price_cents, 'quantity', oi.quantity) ORDER BY oi.id)
                   FROM order_items oi WHERE oi.order_id = o.id) AS items
           FROM orders o WHERE o.user_id = $1 ORDER BY o.placed_at DESC`,
          [userId],
        ),
        this.q(
          `SELECT pe.occurred_at, pe.event_name, pe.course_id, c.title AS course_title, pe.unit_ref, pe.properties
           FROM product_events pe LEFT JOIN courses c ON c.id = pe.course_id
           WHERE pe.user_id = $1 AND pe.event_name <> 'lesson_heartbeat'
           ORDER BY pe.occurred_at DESC LIMIT 100`,
          [userId],
        ),
        this.q(
          `SELECT COUNT(*)::int AS logins_30d, MAX(created_at) AS last_login
           FROM audit_logs WHERE user_id = $1 AND action = 'LOGIN' AND created_at >= now() - interval '30 days'`,
          [userId],
        ),
      ]);
    return {
      user,
      entitlements,
      usage,
      revenue: revenue[0] ?? null,
      orders,
      events,
      logins: logins[0],
    };
  }

  // ── Signals → offers ────────────────────────────────────────────────────

  async signals() {
    const [
      stalledPaid,
      completedNotUpsold,
      proAtRisk,
      lowUtilOrgs,
      engagedFree,
      hotStreak,
    ] = await Promise.all([
      this.q(`
          SELECT eu.user_id, u.username, u.email, eu.course_id, c.title, eu.primary_source,
                 eu.first_entitled_at, eu.last_activity_at, eu.pct_complete
          FROM v_entitlement_utilization eu
          JOIN users u ON u.id = eu.user_id JOIN courses c ON c.id = eu.course_id
          WHERE eu.primary_source IN ('purchase', 'bundle', 'pro')
            AND eu.first_entitled_at < now() - interval '7 days'
            AND (eu.last_activity_at IS NULL OR eu.last_activity_at < now() - interval '14 days')
            AND eu.status <> 'COMPLETED'
          ORDER BY eu.first_entitled_at DESC LIMIT 100`),
      this.q(`
          SELECT eu.user_id, u.username, u.email, eu.course_id, c.title, eu.completed_at
          FROM v_entitlement_utilization eu
          JOIN users u ON u.id = eu.user_id JOIN courses c ON c.id = eu.course_id
          LEFT JOIN v_user_revenue r ON r.user_id = eu.user_id
          WHERE eu.status = 'COMPLETED'
            AND (r.user_id IS NULL OR r.hardware_cents = 0)
            AND eu.completed_at >= now() - interval '90 days'
          ORDER BY eu.completed_at DESC LIMIT 100`),
      this.q(`
          SELECT e.user_id, u.username, u.email, e.ends_at,
                 (SELECT COUNT(*)::int FROM product_events pe WHERE pe.user_id = e.user_id
                    AND pe.event_name = 'pro_payment_failed' AND pe.occurred_at >= now() - interval '30 days') AS failed_30d,
                 (SELECT MAX(p.last_activity_at) FROM progress p WHERE p."userId" = e.user_id) AS last_activity_at
          FROM entitlements e JOIN users u ON u.id = e.user_id
          WHERE e.course_id IS NULL AND e.revoked_at IS NULL
            AND (e.ends_at < now() + interval '14 days'
                 OR EXISTS (SELECT 1 FROM product_events pe WHERE pe.user_id = e.user_id
                              AND pe.event_name IN ('pro_payment_failed', 'pro_cancel_scheduled')
                              AND pe.occurred_at >= now() - interval '30 days')
                 OR NOT EXISTS (SELECT 1 FROM progress p WHERE p."userId" = e.user_id
                                  AND p.last_activity_at >= now() - interval '21 days'))
          ORDER BY e.ends_at LIMIT 100`),
      this.q(`
          SELECT organization_id, name, seats_purchased, members, members_engaged_30d, utilization_pct_30d,
                 invites_sent, invites_redeemed, manager_last_seen_at
          FROM v_org_utilization
          WHERE members = 0 OR utilization_pct_30d < 40
          ORDER BY utilization_pct_30d, name`),
      this.q(`
          SELECT eu.user_id, u.username, u.email, eu.course_id, c.title, eu.primary_source,
                 eu.minutes_engaged, eu.pct_complete
          FROM v_entitlement_utilization eu
          JOIN users u ON u.id = eu.user_id JOIN courses c ON c.id = eu.course_id
          WHERE eu.primary_source IN ('admin_grant', 'signup_link', 'trial')
            AND eu.minutes_engaged >= 60
            AND NOT EXISTS (SELECT 1 FROM v_user_revenue r WHERE r.user_id = eu.user_id AND r.net_cents > 0)
          ORDER BY eu.minutes_engaged DESC LIMIT 100`),
      this.q(`
          SELECT d.user_id, u.username, SUM(d.minutes_engaged)::int AS minutes_7d, COUNT(DISTINCT d.day)::int AS active_days_7d
          FROM product_events_daily d JOIN users u ON u.id = d.user_id
          WHERE d.day >= CURRENT_DATE - 7 AND d.organization_id IS NULL
          GROUP BY 1, 2 HAVING COUNT(DISTINCT d.day) >= 4
          ORDER BY minutes_7d DESC LIMIT 50`),
    ]);
    return {
      stalled_paid_learners: stalledPaid,
      completed_not_upsold: completedNotUpsold,
      pro_at_risk: proAtRisk,
      low_utilization_orgs: lowUtilOrgs,
      engaged_free_users: engagedFree,
      hot_streak_learners: hotStreak,
    };
  }

  // ── Ops ─────────────────────────────────────────────────────────────────

  async health() {
    const [row] = await this.q(`
      SELECT
        (SELECT MAX(ran_at) FROM analytics_reconciliation WHERE check_name = 'views_refreshed') AS views_refreshed_at,
        (SELECT MAX(computed_at) FROM product_events_daily) AS rollup_computed_at,
        (SELECT COUNT(*)::int FROM product_events WHERE occurred_at >= now() - interval '24 hours') AS events_24h,
        (SELECT COUNT(*)::int FROM product_events WHERE occurred_at >= now() - interval '1 hour') AS events_1h,
        (SELECT pg_size_pretty(pg_total_relation_size('product_events'))) AS product_events_size,
        (SELECT COUNT(*)::int FROM pg_inherits i JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'product_events') AS partitions
    `);
    const reconciliation = await this.q(`
      SELECT DISTINCT ON (check_name) check_name, mismatches, ran_at
      FROM analytics_reconciliation WHERE check_name <> 'views_refreshed'
      ORDER BY check_name, ran_at DESC
    `);
    // Only the PD22 gate checks count; informational checks (e.g. legacy
    // purchases awaiting the Stripe backfill) are reported but do not block.
    const cleanNights = await this.q(
      `
      SELECT COUNT(*)::int AS clean_nights FROM (
        SELECT ran_at::date AS d, SUM(mismatches) AS m
        FROM analytics_reconciliation WHERE check_name = ANY($1::text[])
        GROUP BY 1 ORDER BY 1 DESC LIMIT 14
      ) t WHERE m = 0
    `,
      [[...AnalyticsMaintenanceService.GATE_CHECKS]],
    );
    return {
      ...row,
      reconciliation,
      gate_checks: AnalyticsMaintenanceService.GATE_CHECKS,
      entitlements_authoritative:
        process.env.ENTITLEMENTS_AUTHORITATIVE === 'true',
      clean_nights_of_last_14: cleanNights[0]?.clean_nights ?? 0,
    };
  }

  /** CSV of any view-backed report. Whitelisted names only. */
  async exportCsv(report: string, courseId?: number): Promise<string> {
    const sources: Record<string, [string, unknown[]]> = {
      utilization: [
        `SELECT * FROM v_entitlement_utilization ORDER BY user_id, course_id`,
        [],
      ],
      organizations: [`SELECT * FROM v_org_utilization ORDER BY name`, []],
      cohorts: [
        `SELECT * FROM v_cohort_retention ORDER BY cohort_month, primary_source`,
        [],
      ],
      revenue: [`SELECT * FROM v_user_revenue ORDER BY net_cents DESC`, []],
      usage: [
        `SELECT * FROM v_user_course_usage ORDER BY user_id, course_id`,
        [],
      ],
      orders: [
        `SELECT o.id, o.placed_at, o.user_id, o.organization_id, o.payment_method, o.payment_status,
                o.total_cents, o.refunded_cents, oi.sku, oi.product_type, oi.quantity, oi.unit_price_cents
         FROM orders o JOIN order_items oi ON oi.order_id = o.id ORDER BY o.placed_at DESC`,
        [],
      ],
      funnel: [
        `SELECT * FROM v_course_funnel WHERE course_id = $1 ORDER BY path`,
        [courseId ?? -1],
      ],
    };
    const src = sources[report];
    if (!src) throw new NotFoundException(`Unknown report "${report}"`);
    const rows = await this.q(src[0], src[1]);
    return toCsv(rows);
  }
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown): string => {
    if (v == null) return '';
    const s =
      v instanceof Date
        ? v.toISOString()
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    [
      cols.join(','),
      ...rows.map((r) => cols.map((c) => esc(r[c])).join(',')),
    ].join('\n') + '\n'
  );
}
