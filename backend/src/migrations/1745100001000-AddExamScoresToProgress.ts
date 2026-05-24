import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds exam_scores JSONB column to the progress table.
 * The existing latest_exam_score decimal column is preserved for backward
 * compatibility with any in-flight progress records.
 */
export class AddExamScoresToProgress1745100001000 implements MigrationInterface {
  name = 'AddExamScoresToProgress1745100001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "progress"
      ADD COLUMN IF NOT EXISTS "exam_scores" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "progress"
      DROP COLUMN IF EXISTS "exam_scores"
    `);
  }
}
