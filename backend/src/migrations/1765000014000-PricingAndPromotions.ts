import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stripe-owned prices and promotion reporting (docs/tech/pricing-and-promotions.md).
 *
 * - `products.stripe_lookup_key` links a catalog row to a Stripe Price by its
 *   lookup key, so a price change in Stripe needs no deploy. `stripe_product_id`
 *   and `price_synced_at` are written by PricingService on each sync.
 * - `checkout_completions` records every completed Checkout Session (course and
 *   Pro) with the promotion code and amounts, for the admin promo report.
 *   `user_id` is SET NULL on account deletion, like `orders`.
 */
export class PricingAndPromotions1765000014000 implements MigrationInterface {
  name = 'PricingAndPromotions1765000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_lookup_key" varchar(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_product_id" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_synced_at" TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_stripe_lookup_key" ON "products" ("stripe_lookup_key") WHERE "stripe_lookup_key" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout_completions" (
        "stripe_checkout_session_id" varchar(128) NOT NULL,
        "user_id"                    integer,
        "mode"                       varchar(16)  NOT NULL,
        "sku"                        varchar(64),
        "promotion_code_id"          varchar(64),
        "promotion_code"             varchar(64),
        "coupon_id"                  varchar(64),
        "promo_source"               varchar(16),
        "amount_subtotal_cents"      integer      NOT NULL DEFAULT 0,
        "amount_discount_cents"      integer      NOT NULL DEFAULT 0,
        "amount_tax_cents"           integer      NOT NULL DEFAULT 0,
        "amount_total_cents"         integer      NOT NULL DEFAULT 0,
        "currency"                   varchar(3)   NOT NULL DEFAULT 'usd',
        "stripe_payment_intent_id"   varchar(64),
        "stripe_subscription_id"     varchar(64),
        "stripe_invoice_id"          varchar(64),
        "completed_at"               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_completions" PRIMARY KEY ("stripe_checkout_session_id"),
        CONSTRAINT "FK_checkout_completions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_completions_promo" ON "checkout_completions" ("promotion_code_id") WHERE "promotion_code_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_completions_completed" ON "checkout_completions" ("completed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout_completions"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_products_stripe_lookup_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "price_synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "stripe_product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "stripe_lookup_key"`,
    );
  }
}
