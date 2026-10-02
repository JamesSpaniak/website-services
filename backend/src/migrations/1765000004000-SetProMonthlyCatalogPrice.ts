import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PRO_MONTHLY was seeded with list_price_cents = 0 and stripe_price_id NULL
 * because STRIPE_PRO_PRICE_ID_MONTHLY was empty when CreateCommerceTables ran.
 * Sets the $35/mo list price and, when the env var is present, the Stripe
 * price ID (test and live IDs differ, so the env var stays the source).
 */
export class SetProMonthlyCatalogPrice1765000004000
  implements MigrationInterface
{
  name = 'SetProMonthlyCatalogPrice1765000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const proMonthly = process.env.STRIPE_PRO_PRICE_ID_MONTHLY || null;
    await queryRunner.query(
      `UPDATE "products"
       SET "list_price_cents" = 3500,
           "stripe_price_id" = COALESCE($1, "stripe_price_id")
       WHERE "sku" = 'PRO_MONTHLY'`,
      [proMonthly],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "products" SET "list_price_cents" = 0 WHERE "sku" = 'PRO_MONTHLY'`,
    );
  }
}
