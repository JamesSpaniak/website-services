import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Saved site color theme per user ('light' | 'dark' | 'system').
 * Nullable: existing users have never chosen, so the frontend default applies
 * and their current browser choice (localStorage) is adopted on next sign-in.
 */
export class UserThemePreference1765000015000 implements MigrationInterface {
  name = 'UserThemePreference1765000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme_preference" varchar(10)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "theme_preference"`,
    );
  }
}
