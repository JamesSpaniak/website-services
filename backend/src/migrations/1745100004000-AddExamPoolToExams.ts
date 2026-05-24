import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stores exam_pool on exams so progress snapshots can distinguish
 * full-course practice (scoped) vs final (final_only).
 */
export class AddExamPoolToExams1745100004000 implements MigrationInterface {
  name = 'AddExamPoolToExams1745100004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exams"
      ADD COLUMN IF NOT EXISTS "exam_pool" varchar(16) NOT NULL DEFAULT 'scoped'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exams"
      DROP COLUMN IF EXISTS "exam_pool"
    `);
  }
}
