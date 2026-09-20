import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product analytics Phase 3 (PA10): materialized views, refreshed nightly by
 * AnalyticsMaintenanceService in dependency order:
 *
 *   v_user_entitlements → v_user_course_usage → v_entitlement_utilization
 *   → v_user_revenue, v_org_utilization, v_course_funnel, v_cohort_retention
 *
 * Every view has a unique index so REFRESH … CONCURRENTLY works. Reporting
 * endpoints read these; the manager dashboard reads live tables + rollups.
 *
 * Attribution rule (plan § 2.3): when a user holds several active entitlements
 * to one course, primary = purchase/bundle > pro > org_seat > free; tie →
 * earliest starts_at. Reporting only — never changes hasAccess.
 *
 * See docs/tech/analytics-implementation-plan.md § 3.9 and docs/tech/analytics-queries.md.
 */
export class CreateAnalyticsViews1765000003000 implements MigrationInterface {
  name = 'CreateAnalyticsViews1765000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── v_user_entitlements: every entitlement, one row per user × course ──
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_user_entitlements AS
      WITH direct AS (
        SELECT e.id              AS entitlement_id,
               e.user_id,
               c.id              AS course_id,
               e.source,
               e.product_sku,
               e.order_item_id,
               e.allocated_price_cents,
               NULL::integer     AS organization_id,
               e.starts_at,
               e.ends_at,
               e.revoked_at,
               (e.revoked_at IS NULL AND (e.ends_at IS NULL OR e.ends_at > now())) AS active
        FROM entitlements e
        JOIN courses c
          ON (e.course_id IS NULL AND c.hidden = false) OR c.id = e.course_id
      ),
      org AS (
        SELECT NULL::bigint      AS entitlement_id,
               m.user_id,
               oc."coursesId"    AS course_id,
               'org_seat'::varchar(16) AS source,
               NULL::varchar(64) AS product_sku,
               NULL::bigint      AS order_item_id,
               0                 AS allocated_price_cents,
               m.organization_id,
               m.joined_at       AS starts_at,
               NULL::timestamptz AS ends_at,
               NULL::timestamptz AS revoked_at,
               true              AS active
        FROM organization_members m
        JOIN organization_courses oc ON oc."organizationsId" = m.organization_id
        WHERE m.role = 'member'
      )
      SELECT row_number() OVER (ORDER BY user_id, course_id, source, starts_at) AS row_id, u.*
      FROM (SELECT * FROM direct UNION ALL SELECT * FROM org) u
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_user_entitlements" ON v_user_entitlements (row_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_v_user_entitlements_uc" ON v_user_entitlements (user_id, course_id)`,
    );

    // ── v_user_course_usage: what each user did with each course ─────────
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_user_course_usage AS
      SELECT p."userId"                       AS user_id,
             p."courseId"                     AS course_id,
             p.status,
             p.created_at                     AS started_at,
             p.completed_at,
             p.last_activity_at,
             p.units_completed,
             p.units_total,
             CASE WHEN p.units_total > 0
                  THEN ROUND(100.0 * p.units_completed / p.units_total)::int
                  ELSE 0 END                  AS pct_complete,
             fu.first_unit_completed_at,
             COALESCE(vp.videos_completed, 0) AS videos_completed,
             COALESCE(cv.videos_total, 0)     AS videos_total,
             COALESCE(d.minutes_engaged, 0)   AS minutes_engaged,
             COALESCE(d.lessons_viewed, 0)    AS lessons_viewed,
             COALESCE(d.active_days, 0)       AS active_days,
             COALESCE(x.exams_taken, 0)       AS exams_taken,
             x.best_score,
             x.latest_score,
             x.last_exam_at,
             CASE WHEN fu.first_unit_completed_at IS NOT NULL
                  THEN ROUND(EXTRACT(EPOCH FROM (fu.first_unit_completed_at - p.created_at)) / 86400.0, 1)
                  END                         AS days_to_first_unit,
             CASE WHEN p.completed_at IS NOT NULL
                  THEN ROUND(EXTRACT(EPOCH FROM (p.completed_at - p.created_at)) / 86400.0, 1)
                  END                         AS days_to_complete
      FROM progress p
      LEFT JOIN LATERAL (
        SELECT MIN((kv.value)::timestamptz) AS first_unit_completed_at
        FROM jsonb_each_text(p.unit_completed_at) kv
      ) fu ON true
      LEFT JOIN (
        SELECT user_id, course_id, COUNT(*) FILTER (WHERE completed)::int AS videos_completed
        FROM video_progress GROUP BY user_id, course_id
      ) vp ON vp.user_id = p."userId" AND vp.course_id = p."courseId"
      LEFT JOIN (
        SELECT course_id, COUNT(*)::int AS videos_total FROM course_units WHERE has_video GROUP BY course_id
      ) cv ON cv.course_id = p."courseId"
      LEFT JOIN (
        SELECT user_id, course_id,
               SUM(minutes_engaged)     AS minutes_engaged,
               SUM(lessons_viewed)::int AS lessons_viewed,
               COUNT(*)::int            AS active_days
        FROM product_events_daily GROUP BY user_id, course_id
      ) d ON d.user_id = p."userId" AND d.course_id = p."courseId"
      LEFT JOIN (
        SELECT h.user_id, h.course_id,
               COUNT(*)::int AS exams_taken,
               MAX(h.score)  AS best_score,
               (ARRAY_AGG(h.score ORDER BY h.submitted_at DESC))[1] AS latest_score,
               MAX(h.submitted_at) AS last_exam_at
        FROM exam_attempt_history h GROUP BY h.user_id, h.course_id
      ) x ON x.user_id = p."userId" AND x.course_id = p."courseId"
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_user_course_usage" ON v_user_course_usage (user_id, course_id)`,
    );

    // ── v_entitlement_utilization: entitled vs used, one row per user × course ──
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_entitlement_utilization AS
      WITH ranked AS (
        SELECT e.*,
               ROW_NUMBER() OVER (
                 PARTITION BY e.user_id, e.course_id
                 ORDER BY CASE e.source
                            WHEN 'purchase' THEN 1 WHEN 'bundle' THEN 1
                            WHEN 'pro' THEN 2 WHEN 'org_seat' THEN 3
                            ELSE 4 END,
                          e.starts_at
               ) AS rn,
               ARRAY_AGG(e.source) OVER (PARTITION BY e.user_id, e.course_id) AS all_sources,
               MIN(e.starts_at)    OVER (PARTITION BY e.user_id, e.course_id) AS first_entitled_at,
               MAX(e.organization_id) OVER (PARTITION BY e.user_id, e.course_id) AS any_organization_id
        FROM v_user_entitlements e
        WHERE e.active
      )
      SELECT r.user_id,
             r.course_id,
             r.source                 AS primary_source,
             r.all_sources,
             r.first_entitled_at,
             r.any_organization_id    AS organization_id,
             r.allocated_price_cents,
             r.order_item_id,
             COALESCE(u.status, 'NOT_STARTED') AS status,
             u.started_at,
             u.completed_at,
             u.last_activity_at,
             COALESCE(u.pct_complete, 0)     AS pct_complete,
             COALESCE(u.minutes_engaged, 0)  AS minutes_engaged,
             COALESCE(u.videos_completed, 0) AS videos_completed,
             COALESCE(u.videos_total, 0)     AS videos_total,
             COALESCE(u.exams_taken, 0)      AS exams_taken,
             u.best_score,
             (u.first_unit_completed_at IS NOT NULL
              AND u.first_unit_completed_at <= r.first_entitled_at + interval '7 days') AS activated,
             (u.last_activity_at IS NULL
              AND r.first_entitled_at < now() - interval '7 days')                     AS stalled
      FROM ranked r
      LEFT JOIN v_user_course_usage u ON u.user_id = r.user_id AND u.course_id = r.course_id
      WHERE r.rn = 1
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_entitlement_utilization" ON v_entitlement_utilization (user_id, course_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_v_eu_source" ON v_entitlement_utilization (primary_source)`,
    );

    // ── v_user_revenue ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_user_revenue AS
      WITH lines AS (
        SELECT o.user_id, o.id AS order_id, o.placed_at, o.payment_status, o.shipping_cents,
               oi.product_type, oi.fulfillment_source,
               (oi.unit_price_cents * oi.quantity - oi.discount_cents) AS gross_cents,
               oi.refunded_amount_cents,
               (oi.unit_cost_cents * oi.quantity) AS cogs_cents
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id IS NOT NULL AND o.payment_status <> 'failed'
      ),
      agg AS (
        SELECT user_id,
               SUM(gross_cents)::bigint                                   AS gross_cents,
               SUM(refunded_amount_cents)::bigint                         AS refunded_cents,
               SUM(gross_cents - refunded_amount_cents)::bigint           AS net_cents,
               SUM(cogs_cents)::bigint                                    AS cogs_cents,
               SUM(gross_cents - refunded_amount_cents) FILTER (WHERE fulfillment_source = 'digital')::bigint  AS digital_cents,
               SUM(gross_cents - refunded_amount_cents) FILTER (WHERE fulfillment_source <> 'digital')::bigint AS hardware_cents,
               COUNT(DISTINCT order_id)::int                              AS orders_count,
               COUNT(DISTINCT order_id) FILTER (WHERE product_type IN ('course','bundle'))::int AS course_orders,
               MIN(placed_at)                                             AS first_order_at,
               MAX(placed_at)                                             AS last_order_at,
               ARRAY_AGG(DISTINCT product_type)                           AS product_mix
        FROM lines GROUP BY user_id
      ),
      shipping AS (
        SELECT user_id, SUM(shipping_cents)::bigint AS shipping_cents
        FROM orders WHERE user_id IS NOT NULL AND payment_status <> 'failed' GROUP BY user_id
      ),
      mrr AS (
        SELECT DISTINCT ON (o.user_id) o.user_id,
               CASE WHEN oi.product_type = 'pro_yearly'
                    THEN ROUND(oi.unit_price_cents / 12.0)::int
                    ELSE oi.unit_price_cents END AS active_mrr_cents
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN entitlements e ON e.user_id = o.user_id AND e.course_id IS NULL
                           AND e.revoked_at IS NULL AND (e.ends_at IS NULL OR e.ends_at > now())
        WHERE oi.product_type IN ('pro_monthly', 'pro_yearly') AND o.payment_status = 'succeeded'
        ORDER BY o.user_id, o.placed_at DESC
      )
      SELECT a.user_id, a.gross_cents, a.refunded_cents, a.net_cents, a.cogs_cents,
             COALESCE(s.shipping_cents, 0) AS shipping_cents,
             (a.net_cents - a.cogs_cents - COALESCE(s.shipping_cents, 0))::bigint AS contribution_cents,
             COALESCE(a.digital_cents, 0) AS digital_cents,
             COALESCE(a.hardware_cents, 0) AS hardware_cents,
             COALESCE(m.active_mrr_cents, 0) AS active_mrr_cents,
             a.orders_count, a.course_orders, a.first_order_at, a.last_order_at, a.product_mix
      FROM agg a
      LEFT JOIN shipping s ON s.user_id = a.user_id
      LEFT JOIN mrr m ON m.user_id = a.user_id
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_user_revenue" ON v_user_revenue (user_id)`,
    );

    // ── v_org_utilization ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_org_utilization AS
      SELECT o.id                     AS organization_id,
             o.name,
             o.max_students           AS seats_purchased,
             COALESCE(so.seats_ordered, 0) AS seats_ordered,
             COALESCE(inv.invites_sent, 0)     AS invites_sent,
             COALESCE(inv.invites_redeemed, 0) AS invites_redeemed,
             COALESCE(mem.members, 0)          AS members,
             COALESCE(mem.members_activated, 0)   AS members_activated,
             COALESCE(mem.members_engaged_7d, 0)  AS members_engaged_7d,
             COALESCE(mem.members_engaged_30d, 0) AS members_engaged_30d,
             COALESCE(mem.avg_pct_complete, 0)    AS avg_pct_complete,
             COALESCE(mem.members_completed, 0)   AS members_completed,
             ROUND(COALESCE(hrs.minutes_total, 0) / 60.0, 1) AS hours_engaged_total,
             ROUND(COALESCE(hrs.minutes_30d, 0) / 60.0, 1)   AS hours_engaged_30d,
             mgr.manager_last_seen_at,
             CASE WHEN o.max_students > 0
                  THEN ROUND(100.0 * COALESCE(mem.members_engaged_30d, 0) / o.max_students)::int
                  ELSE 0 END          AS utilization_pct_30d,
             (SELECT COUNT(*)::int FROM organization_courses oc WHERE oc."organizationsId" = o.id) AS courses_assigned
      FROM organizations o
      LEFT JOIN LATERAL (
        SELECT SUM(oi.quantity)::int AS seats_ordered
        FROM orders ord JOIN order_items oi ON oi.order_id = ord.id
        WHERE ord.organization_id = o.id AND oi.product_type = 'seats' AND ord.payment_status <> 'failed'
      ) so ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS invites_sent,
               COUNT(*) FILTER (WHERE used_by_user_id IS NOT NULL)::int AS invites_redeemed
        FROM invite_codes ic WHERE ic.organization_id = o.id
      ) inv ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS members,
               COUNT(*) FILTER (WHERE mp.has_progress)::int AS members_activated,
               COUNT(*) FILTER (WHERE mp.last_activity_at >= now() - interval '7 days')::int  AS members_engaged_7d,
               COUNT(*) FILTER (WHERE mp.last_activity_at >= now() - interval '30 days')::int AS members_engaged_30d,
               COUNT(*) FILTER (WHERE mp.completed_courses > 0)::int AS members_completed,
               ROUND(AVG(COALESCE(mp.avg_pct, 0)))::int AS avg_pct_complete
        FROM organization_members m
        LEFT JOIN LATERAL (
          SELECT COUNT(*) > 0 AS has_progress,
                 MAX(p.last_activity_at) AS last_activity_at,
                 COUNT(*) FILTER (WHERE p.status = 'COMPLETED') AS completed_courses,
                 AVG(CASE WHEN p.units_total > 0 THEN 100.0 * p.units_completed / p.units_total ELSE 0 END) AS avg_pct
          FROM progress p
          JOIN organization_courses oc ON oc."coursesId" = p."courseId" AND oc."organizationsId" = o.id
          WHERE p."userId" = m.user_id
        ) mp ON true
        WHERE m.organization_id = o.id AND m.role = 'member'
      ) mem ON true
      LEFT JOIN LATERAL (
        SELECT SUM(minutes_engaged) AS minutes_total,
               SUM(minutes_engaged) FILTER (WHERE day >= CURRENT_DATE - 30) AS minutes_30d
        FROM product_events_daily d WHERE d.organization_id = o.id
      ) hrs ON true
      LEFT JOIN LATERAL (
        SELECT MAX(a.created_at) AS manager_last_seen_at
        FROM organization_members m
        JOIN audit_logs a ON a.user_id = m.user_id AND a.action = 'LOGIN'
        WHERE m.organization_id = o.id AND m.role = 'manager'
      ) mgr ON true
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_org_utilization" ON v_org_utilization (organization_id)`,
    );

    // ── v_course_funnel: entitled → viewed → watched → completed per unit ──
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_course_funnel AS
      SELECT cu.course_id,
             cu.ref            AS unit_ref,
             cu.title,
             cu.depth,
             cu.path,
             cu.position,
             cu.has_video,
             COALESCE(ent.entitled, 0) AS entitled,
             COALESCE(pv.viewed, 0)    AS viewed,
             COALESCE(pv.completed, 0) AS completed,
             COALESCE(vc.video_completed, 0) AS video_completed,
             hb.median_minutes
      FROM course_units cu
      LEFT JOIN (
        SELECT course_id, COUNT(*)::int AS entitled FROM v_entitlement_utilization GROUP BY course_id
      ) ent ON ent.course_id = cu.course_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE p.unit_statuses->>cu.ref IN ('IN_PROGRESS', 'COMPLETED'))::int AS viewed,
               COUNT(*) FILTER (WHERE p.unit_statuses->>cu.ref = 'COMPLETED')::int AS completed
        FROM progress p WHERE p."courseId" = cu.course_id
      ) pv ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE vp.completed)::int AS video_completed
        FROM video_progress vp WHERE vp.course_id = cu.course_id AND vp.unit_ref = cu.ref
      ) vc ON true
      LEFT JOIN LATERAL (
        SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.m)::numeric, 1) AS median_minutes
        FROM (
          SELECT COUNT(*) * 0.5 AS m
          FROM product_events pe
          WHERE pe.course_id = cu.course_id AND pe.unit_ref = cu.ref
            AND pe.event_name = 'lesson_heartbeat'
            AND pe.occurred_at >= now() - interval '90 days'
          GROUP BY pe.user_id
        ) s
      ) hb ON true
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_course_funnel" ON v_course_funnel (course_id, unit_ref)`,
    );

    // ── v_cohort_retention ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_cohort_retention AS
      WITH second_buy AS (
        SELECT user_id FROM v_user_revenue WHERE course_orders >= 2
      ),
      refunded AS (
        SELECT DISTINCT user_id FROM orders WHERE payment_status IN ('refunded', 'partially_refunded')
      )
      SELECT date_trunc('month', eu.first_entitled_at)::date AS cohort_month,
             eu.primary_source,
             COUNT(*)::int                                          AS entitled,
             COUNT(*) FILTER (WHERE eu.activated)::int              AS activated,
             COUNT(*) FILTER (WHERE eu.status = 'COMPLETED')::int   AS completed,
             COUNT(*) FILTER (WHERE eu.stalled)::int                AS stalled,
             COUNT(DISTINCT eu.user_id) FILTER (WHERE sb.user_id IS NOT NULL)::int AS second_purchase_users,
             COUNT(DISTINCT eu.user_id) FILTER (WHERE rf.user_id IS NOT NULL)::int AS refunded_users,
             COUNT(DISTINCT eu.user_id)::int                        AS users,
             ROUND(AVG(eu.pct_complete))::int                       AS avg_pct_complete
      FROM v_entitlement_utilization eu
      LEFT JOIN second_buy sb ON sb.user_id = eu.user_id
      LEFT JOIN refunded rf ON rf.user_id = eu.user_id
      GROUP BY 1, 2
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_v_cohort_retention" ON v_cohort_retention (cohort_month, primary_source)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS v_cohort_retention`,
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS v_course_funnel`);
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS v_org_utilization`,
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS v_user_revenue`);
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS v_entitlement_utilization`,
    );
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS v_user_course_usage`,
    );
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS v_user_entitlements`,
    );
  }
}
