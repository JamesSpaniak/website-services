import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product analytics Phase 1 (PA4 / MP2):
 *
 * 1. `progress` gains `created_at`, `completed_at`, `last_activity_at` and a
 *    per-unit `unit_completed_at` map. Backfilled from the audit log where a
 *    COURSE_STARTED / COURSE_COMPLETED row exists, else from `updated_at`.
 * 2. `course_units` gains `has_video` so "videos watched x / y" can be
 *    computed without parsing the course payload. Backfilled from payloads.
 *
 * See docs/tech/analytics-implementation-plan.md § 3.4.
 */
export class AddProgressTimestamps1765000000000 implements MigrationInterface {
  name = 'AddProgressTimestamps1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "progress"
        ADD COLUMN IF NOT EXISTS "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "completed_at"      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "last_activity_at"  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "unit_completed_at" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);

    // created_at ← earliest COURSE_STARTED audit row, else updated_at
    await queryRunner.query(`
      UPDATE "progress" p
      SET "created_at" = LEAST(p."updated_at", COALESCE(a.first_started, p."updated_at"))
      FROM (
        SELECT user_id, (metadata->>'courseId')::int AS course_id, MIN(created_at) AS first_started
        FROM audit_logs
        WHERE action = 'COURSE_STARTED' AND metadata ? 'courseId'
        GROUP BY user_id, (metadata->>'courseId')::int
      ) a
      WHERE a.user_id = p."userId" AND a.course_id = p."courseId"
    `);
    await queryRunner.query(`
      UPDATE "progress" SET "created_at" = "updated_at"
      WHERE "created_at" > "updated_at"
    `);

    // completed_at ← latest COURSE_COMPLETED audit row for completed rows
    await queryRunner.query(`
      UPDATE "progress" p
      SET "completed_at" = COALESCE(a.completed, p."updated_at")
      FROM (
        SELECT user_id, (metadata->>'courseId')::int AS course_id, MAX(created_at) AS completed
        FROM audit_logs
        WHERE action = 'COURSE_COMPLETED' AND metadata ? 'courseId'
        GROUP BY user_id, (metadata->>'courseId')::int
      ) a
      WHERE a.user_id = p."userId" AND a.course_id = p."courseId" AND p."status" = 'COMPLETED'
    `);
    await queryRunner.query(`
      UPDATE "progress" SET "completed_at" = "updated_at"
      WHERE "status" = 'COMPLETED' AND "completed_at" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "progress" SET "last_activity_at" = "updated_at" WHERE "last_activity_at" IS NULL
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_progress_last_activity" ON "progress" ("last_activity_at")`,
    );

    // ── course_units.has_video ─────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "course_units"
        ADD COLUMN IF NOT EXISTS "has_video" boolean NOT NULL DEFAULT false
    `);

    const courses: { id: number; payload: string }[] = await queryRunner.query(
      `SELECT id, payload FROM courses`,
    );
    for (const course of courses) {
      let payload: { units?: unknown[] };
      try {
        payload = JSON.parse(course.payload);
      } catch {
        continue;
      }
      const refs: string[] = [];
      const walk = (units: unknown[] | undefined): void => {
        if (!Array.isArray(units)) return;
        for (const raw of units) {
          const u = raw as {
            id?: string | number;
            video_url?: string;
            sub_units?: unknown[];
          };
          if (u.video_url && String(u.video_url).trim() && u.id != null) {
            const id = u.id;
            const ref =
              typeof id === 'number' || /^\d+$/.test(String(id))
                ? `u${id}`
                : String(id).trim();
            refs.push(ref);
          }
          walk(u.sub_units);
        }
      };
      walk(payload.units);
      if (refs.length) {
        await queryRunner.query(
          `UPDATE "course_units" SET "has_video" = true WHERE "course_id" = $1 AND "ref" = ANY($2::text[])`,
          [course.id, refs],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_units" DROP COLUMN IF EXISTS "has_video"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_progress_last_activity"`,
    );
    await queryRunner.query(`
      ALTER TABLE "progress"
        DROP COLUMN IF EXISTS "unit_completed_at",
        DROP COLUMN IF EXISTS "last_activity_at",
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "created_at"
    `);
  }
}
