import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamDedupKey1745100003000 implements MigrationInterface {
  name = 'AddExamDedupKey1745100003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exams"
        ADD COLUMN IF NOT EXISTS "dedup_key" varchar(200) NULL
    `);

    // Partial unique index — only applies where dedup_key IS NOT NULL.
    // This allows unlimited NULL values (student/randomized exams) while
    // enforcing uniqueness for fixed teacher-generated exams.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_exams_dedup_key"
        ON "exams" ("dedup_key")
        WHERE "dedup_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_exams_dedup_key"`);
    await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN IF EXISTS "dedup_key"`);
  }
}
