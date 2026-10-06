import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PTD4 (docs/tech/progress-tracking-accuracy.md): teacher views count days in
 * the school's time zone, not UTC — a UTC "today" ended at 8 pm Eastern.
 * Existing organizations are US schools; default to America/New_York and
 * change per org in the admin Organizations editor.
 */
export class OrganizationTimezone1765000009000 implements MigrationInterface {
  name = 'OrganizationTimezone1765000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "timezone" varchar(64) NOT NULL DEFAULT 'America/New_York'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN IF EXISTS "timezone"`,
    );
  }
}
