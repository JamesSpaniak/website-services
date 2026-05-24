import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds figure_ref column to questions for FAA-CT-8080-2H figure references.
 * Nullable varchar(32) — only populated for questions that reference a specific figure.
 */
export class AddFigureRefToQuestions1745100005000 implements MigrationInterface {
  name = 'AddFigureRefToQuestions1745100005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD COLUMN IF NOT EXISTS "figure_ref" varchar(32) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "questions"
      DROP COLUMN IF EXISTS "figure_ref"
    `);
  }
}
