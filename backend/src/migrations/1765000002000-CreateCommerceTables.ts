import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product analytics Phase 1 (PA1 / PA27 / PA28):
 *
 *   products → orders / order_items → entitlements → usage
 *
 * 1. `products` — minimal catalog: what a SKU grants and which Stripe price
 *    it maps to. Seeded with one COURSE_{id} row per course and Pro rows.
 * 2. `orders` + `order_items` — the money ledger, written from the Stripe
 *    webhook and from admin PO/comp entry. Idempotent on `stripe_event_id`.
 * 3. `entitlements` — who can access which course, from which paying line,
 *    from when to when. `course_id NULL` = all courses (Pro). Backfilled from
 *    `user_courses_purchased` and Pro users. Org seats are derived in the
 *    reporting views, not materialized here (PD20).
 *
 * `hasAccess` keeps reading `user_courses_purchased` + `users` until the
 * nightly reconciliation is clean (PD22). All enums are text + app-level.
 *
 * See docs/tech/analytics-implementation-plan.md § 2–3.3.
 */
export class CreateCommerceTables1765000002000 implements MigrationInterface {
  name = 'CreateCommerceTables1765000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── products ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "sku"               varchar(64)  NOT NULL,
        "name"              varchar(255) NOT NULL,
        "product_type"      varchar(24)  NOT NULL,
        "grants"            jsonb        NOT NULL DEFAULT '{}'::jsonb,
        "stripe_price_id"   varchar(64),
        "list_price_cents"  integer      NOT NULL DEFAULT 0,
        "related_course_id" integer,
        "requires_shipping" boolean      NOT NULL DEFAULT false,
        "active"            boolean      NOT NULL DEFAULT true,
        "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("sku"),
        CONSTRAINT "FK_products_related_course" FOREIGN KEY ("related_course_id")
          REFERENCES "courses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_stripe_price" ON "products" ("stripe_price_id") WHERE "stripe_price_id" IS NOT NULL`,
    );

    // Seed: one product per course (list price from courses.price), Pro monthly/yearly.
    await queryRunner.query(`
      INSERT INTO "products" ("sku", "name", "product_type", "grants", "list_price_cents", "related_course_id", "active")
      SELECT 'COURSE_' || c.id, c.title, 'course',
             jsonb_build_object('course_ids', jsonb_build_array(c.id)),
             COALESCE(ROUND(c.price * 100), 0)::int, c.id, NOT c.hidden
      FROM courses c
      ON CONFLICT ("sku") DO NOTHING
    `);
    const proMonthly = process.env.STRIPE_PRO_PRICE_ID_MONTHLY || null;
    const proYearly = process.env.STRIPE_PRO_PRICE_ID_YEARLY || null;
    await queryRunner.query(
      `INSERT INTO "products" ("sku", "name", "product_type", "grants", "stripe_price_id", "list_price_cents")
       VALUES ('PRO_MONTHLY', 'Pro membership (monthly)', 'pro_monthly', '{"all_courses": true}'::jsonb, $1, 0),
              ('PRO_YEARLY',  'Pro membership (yearly)',  'pro_yearly',  '{"all_courses": true}'::jsonb, $2, 0)
       ON CONFLICT ("sku") DO NOTHING`,
      [proMonthly, proYearly],
    );
    await queryRunner.query(`
      INSERT INTO "products" ("sku", "name", "product_type", "grants", "list_price_cents", "active")
      VALUES ('SEATS_PILOT',     'School Pilot seats',            'seats', '{"seats": true}'::jsonb, 0, true),
             ('SEATS_CLASSROOM', 'School Classroom seats',        'seats', '{"seats": true}'::jsonb, 0, true),
             ('SEATS_PROGRAM',   'School Program / District seats','seats', '{"seats": true}'::jsonb, 0, true)
      ON CONFLICT ("sku") DO NOTHING
    `);

    // ── orders ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id"                          bigserial    NOT NULL,
        "user_id"                     integer,
        "organization_id"             integer,
        "stripe_payment_intent_id"    varchar(64),
        "stripe_invoice_id"           varchar(64),
        "stripe_checkout_session_id"  varchar(128),
        "stripe_customer_id"          varchar(64),
        "stripe_event_id"             varchar(64),
        "payment_method"              varchar(16)  NOT NULL DEFAULT 'card',
        "subtotal_cents"              integer      NOT NULL DEFAULT 0,
        "discount_cents"              integer      NOT NULL DEFAULT 0,
        "shipping_cents"              integer      NOT NULL DEFAULT 0,
        "tax_cents"                   integer      NOT NULL DEFAULT 0,
        "total_cents"                 integer      NOT NULL DEFAULT 0,
        "refunded_cents"              integer      NOT NULL DEFAULT 0,
        "currency"                    varchar(3)   NOT NULL DEFAULT 'usd',
        "payment_status"              varchar(24)  NOT NULL DEFAULT 'succeeded',
        "fulfillment_status"          varchar(24)  NOT NULL DEFAULT 'not_applicable',
        "placed_at"                   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "notes"                       text,
        "created_by_user_id"          integer,
        "created_at"                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_orders_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_orders_stripe_event" ON "orders" ("stripe_event_id") WHERE "stripe_event_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_orders_stripe_pi" ON "orders" ("stripe_payment_intent_id") WHERE "stripe_payment_intent_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_orders_stripe_invoice" ON "orders" ("stripe_invoice_id") WHERE "stripe_invoice_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_user_placed" ON "orders" ("user_id", "placed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_org" ON "orders" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_placed" ON "orders" ("placed_at")`,
    );

    // ── order_items ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id"                     bigserial   NOT NULL,
        "order_id"               bigint      NOT NULL,
        "sku"                    varchar(64) NOT NULL,
        "product_type"           varchar(24) NOT NULL,
        "course_id"              integer,
        "quantity"               integer     NOT NULL DEFAULT 1,
        "unit_price_cents"       integer     NOT NULL DEFAULT 0,
        "unit_cost_cents"        integer     NOT NULL DEFAULT 0,
        "discount_cents"         integer     NOT NULL DEFAULT 0,
        "refunded_amount_cents"  integer     NOT NULL DEFAULT 0,
        "fulfillment_source"     varchar(24) NOT NULL DEFAULT 'digital',
        "placement"              varchar(32),
        "offer_id"               varchar(64),
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_items_order" ON "order_items" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_items_sku" ON "order_items" ("sku")`,
    );

    // ── entitlements ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "entitlements" (
        "id"                      bigserial   NOT NULL,
        "user_id"                 integer     NOT NULL,
        "course_id"               integer,
        "source"                  varchar(16) NOT NULL,
        "product_sku"             varchar(64),
        "order_item_id"           bigint,
        "allocated_price_cents"   integer     NOT NULL DEFAULT 0,
        "price_estimated"         boolean     NOT NULL DEFAULT false,
        "signup_link_id"          integer,
        "granted_by_user_id"      integer,
        "stripe_subscription_id"  varchar(64),
        "starts_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "ends_at"                 TIMESTAMPTZ,
        "revoked_at"              TIMESTAMPTZ,
        "revoke_reason"           varchar(16),
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_entitlements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_entitlements_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_entitlements_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_entitlements_order_item" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entitlements_user_course" ON "entitlements" ("user_id", "course_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entitlements_order_item" ON "entitlements" ("order_item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entitlements_source_start" ON "entitlements" ("source", "starts_at")`,
    );
    // One live Pro row per subscription; one live row per (user, course, source)
    // for direct grants. Revoked rows are history and fall outside the index.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_entitlements_live_direct" ON "entitlements" ("user_id", "course_id", "source") WHERE "revoked_at" IS NULL AND "course_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_entitlements_live_pro" ON "entitlements" ("user_id") WHERE "revoked_at" IS NULL AND "course_id" IS NULL`,
    );

    // ── Backfill: user_courses_purchased → entitlements ───────────────────
    // Historical price is unknown (Stripe amounts were never stored); use the
    // current catalog price and flag it as estimated (PD1 decides on a Stripe backfill).
    await queryRunner.query(`
      INSERT INTO "entitlements"
        ("user_id", "course_id", "source", "product_sku", "allocated_price_cents", "price_estimated",
         "signup_link_id", "granted_by_user_id", "starts_at", "created_at")
      SELECT ucp."usersId", ucp."coursesId", ucp."source", 'COURSE_' || ucp."coursesId",
             CASE WHEN ucp."source" = 'purchase' THEN COALESCE(ROUND(c.price * 100), 0)::int ELSE 0 END,
             ucp."source" = 'purchase',
             ucp."signup_link_id", ucp."granted_by_user_id", ucp."granted_at", ucp."granted_at"
      FROM "user_courses_purchased" ucp
      JOIN courses c ON c.id = ucp."coursesId"
      ON CONFLICT DO NOTHING
    `);

    // ── Backfill: active Pro users → one all-courses entitlement ──────────
    await queryRunner.query(`
      INSERT INTO "entitlements"
        ("user_id", "course_id", "source", "product_sku", "stripe_subscription_id", "starts_at", "ends_at", "created_at")
      SELECT u.id, NULL, 'pro', 'PRO_MONTHLY', u.stripe_subscription_id,
             COALESCE((SELECT MIN(a.created_at) FROM audit_logs a WHERE a.user_id = u.id AND a.action = 'PRO_UPGRADE'), now()),
             u.pro_membership_expires_at, now()
      FROM users u
      WHERE u.role = 'pro' AND u.pro_membership_expires_at IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    // ── Reconciliation log ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_reconciliation" (
        "id"          bigserial   NOT NULL,
        "check_name"  varchar(64) NOT NULL,
        "mismatches"  integer     NOT NULL,
        "detail"      jsonb,
        "ran_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_reconciliation" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_recon_name_time" ON "analytics_reconciliation" ("check_name", "ran_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_reconciliation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entitlements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
  }
}
