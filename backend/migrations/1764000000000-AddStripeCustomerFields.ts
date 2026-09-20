import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeCustomerFields1764000000000 implements MigrationInterface {
  name = 'AddStripeCustomerFields1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "stripe_customer_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "stripe_subscription_id" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_stripe_customer_id" ON "users" ("stripe_customer_id") WHERE "stripe_customer_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_stripe_customer_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "stripe_subscription_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "stripe_customer_id"`,
    );
  }
}
