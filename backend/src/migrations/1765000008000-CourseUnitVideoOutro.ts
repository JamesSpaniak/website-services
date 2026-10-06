import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Video completion rule (docs/tech/progress-tracking-accuracy.md § 3): the
 * last `video_outro_seconds` of a unit's video (credits / end card) never
 * need to be watched for the ✓. Copied from the payload field of the same
 * name on every course save; null = no outro. Existing courses pick it up the
 * next time they are saved.
 */
export class CourseUnitVideoOutro1765000008000 implements MigrationInterface {
  name = 'CourseUnitVideoOutro1765000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_units" ADD COLUMN IF NOT EXISTS "video_outro_seconds" smallint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_units" DROP COLUMN IF EXISTS "video_outro_seconds"`,
    );
  }
}
