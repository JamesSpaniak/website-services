import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Self-service account deletion (AS1/AS4): the USER_SELF_DELETED audit row
 * cannot point at the user being deleted — audit_logs cascade-delete with
 * their user — so it is written with a null actor. The cascade stays: every
 * other audit row of a deleted user still goes with them (privacy § 7).
 */
export class AuditLogNullableActor1765000007000 implements MigrationInterface {
  name = 'AuditLogNullableActor1765000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "audit_logs" WHERE "user_id" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET NOT NULL`,
    );
  }
}
