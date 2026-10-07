import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teacher-issued password reset codes (TODO "Shared-IP + bot hardening" E).
 *
 * One live code per user, stored as a hash. A manager generates it from the
 * roster; the student redeems it on /reset-code with their username. Codes
 * expire after an hour and die after five wrong attempts.
 */
export class PasswordResetCodes1765000016000 implements MigrationInterface {
  name = 'PasswordResetCodes1765000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_code_hash" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_code_expires_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_code_attempts" int NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_code_attempts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_code_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_code_hash"`,
    );
  }
}
