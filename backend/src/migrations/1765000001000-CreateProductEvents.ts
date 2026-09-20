import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product analytics Phase 1 (PA6 / PA31 / MP4):
 *
 * 1. `product_events` — the behavioral stream, partitioned by month from day
 *    one so retention is DETACH + DROP, never DELETE. `organization_id`,
 *    `class_id`, and `entitlement_source` are stamped at write time.
 * 2. `ensure_product_events_partition(date)` — idempotent helper the daily
 *    cron calls to keep partitions two months ahead.
 * 3. `product_events_daily` — incremental per user × course × day rollup; the
 *    "+12-month counter" that survives raw-row retention.
 * 4. `video_progress` — per learner × video state (resume point, watched
 *    ranges, % watched).
 * 5. `exam_attempt_history` — append-only attempts (PA9); `exam_attempts`
 *    keeps its latest-only upsert semantics.
 *
 * See docs/tech/analytics-implementation-plan.md § 3.5–3.7, § 12.
 */
export class CreateProductEvents1765000001000 implements MigrationInterface {
  name = 'CreateProductEvents1765000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── product_events (partitioned) ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_events" (
        "id"                 bigserial     NOT NULL,
        "user_id"            integer,
        "anonymous_id"       varchar(64),
        "session_id"         varchar(64),
        "organization_id"    integer,
        "class_id"           integer,
        "event_name"         varchar(64)   NOT NULL,
        "occurred_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "course_id"          integer,
        "unit_ref"           varchar(64),
        "entitlement_source" varchar(16),
        "properties"         jsonb         NOT NULL DEFAULT '{}'::jsonb,
        "source"             varchar(8)    NOT NULL DEFAULT 'web',
        "event_id"           uuid,
        CONSTRAINT "PK_product_events" PRIMARY KEY ("id", "occurred_at")
      ) PARTITION BY RANGE ("occurred_at")
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_events_user_time" ON "product_events" ("user_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_events_org_time" ON "product_events" ("organization_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_events_name_time" ON "product_events" ("event_name", "occurred_at")`,
    );
    // Client idempotency (event_id may be null). Unique across partitions
    // requires the partition key, so this is a per-partition uniqueness that
    // is good enough: a retried beacon lands in the same month.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_events_event_id" ON "product_events" ("event_id", "occurred_at") WHERE "event_id" IS NOT NULL`,
    );

    // Partition helper: creates product_events_yYYYYmMM for the month containing `d`.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ensure_product_events_partition(d date)
      RETURNS text
      LANGUAGE plpgsql AS $$
      DECLARE
        start_d date := date_trunc('month', d)::date;
        end_d   date := (date_trunc('month', d) + interval '1 month')::date;
        pname   text := format('product_events_y%sm%s', to_char(start_d, 'YYYY'), to_char(start_d, 'MM'));
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = pname) THEN
          EXECUTE format(
            'CREATE TABLE %I PARTITION OF product_events FOR VALUES FROM (%L) TO (%L)',
            pname, start_d, end_d
          );
        END IF;
        RETURN pname;
      END $$;
    `);

    // Default partition as a safety net if the cron ever misses a month.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_events_default" PARTITION OF "product_events" DEFAULT
    `);

    // Previous, current and next three months.
    await queryRunner.query(`
      SELECT ensure_product_events_partition((date_trunc('month', now()) + (i || ' month')::interval)::date)
      FROM generate_series(-1, 3) AS i
    `);

    // ── product_events_daily (rollup) ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_events_daily" (
        "user_id"            integer      NOT NULL,
        "course_id"          integer      NOT NULL,
        "day"                date         NOT NULL,
        "organization_id"    integer,
        "class_id"           integer,
        "entitlement_source" varchar(16),
        "minutes_engaged"    numeric(8,1) NOT NULL DEFAULT 0,
        "lessons_viewed"     integer      NOT NULL DEFAULT 0,
        "videos_completed"   integer      NOT NULL DEFAULT 0,
        "units_completed"    integer      NOT NULL DEFAULT 0,
        "exams_submitted"    integer      NOT NULL DEFAULT 0,
        "events"             integer      NOT NULL DEFAULT 0,
        "computed_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_events_daily" PRIMARY KEY ("user_id", "course_id", "day")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ped_org_day" ON "product_events_daily" ("organization_id", "day")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ped_course_day" ON "product_events_daily" ("course_id", "day")`,
    );

    // ── video_progress ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "video_progress" (
        "user_id"              integer     NOT NULL,
        "course_id"            integer     NOT NULL,
        "unit_ref"             varchar(64) NOT NULL,
        "position_seconds"     integer     NOT NULL DEFAULT 0,
        "max_position_seconds" integer     NOT NULL DEFAULT 0,
        "watched_ranges"       jsonb       NOT NULL DEFAULT '[]'::jsonb,
        "duration_seconds"     integer,
        "percent_watched"      smallint    NOT NULL DEFAULT 0,
        "completed"            boolean     NOT NULL DEFAULT false,
        "play_count"           smallint    NOT NULL DEFAULT 0,
        "first_played_at"      TIMESTAMPTZ,
        "last_played_at"       TIMESTAMPTZ,
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_video_progress" PRIMARY KEY ("user_id", "course_id", "unit_ref"),
        CONSTRAINT "FK_video_progress_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_video_progress_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_video_progress_course" ON "video_progress" ("course_id", "unit_ref")`,
    );

    // ── exam_attempt_history ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_attempt_history" (
        "id"                bigserial   NOT NULL,
        "user_id"           integer     NOT NULL,
        "exam_id"           integer     NOT NULL,
        "course_id"         integer,
        "scope"             varchar(16),
        "scope_refs"        varchar(64)[] NOT NULL DEFAULT '{}',
        "exam_pool"         varchar(16),
        "attempt_no"        integer     NOT NULL,
        "score"             integer     NOT NULL,
        "section_breakdown" jsonb,
        "submitted_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exam_attempt_history" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_eah_user_exam" ON "exam_attempt_history" ("user_id", "exam_id", "submitted_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_eah_course_time" ON "exam_attempt_history" ("course_id", "submitted_at")`,
    );
    // Seed history from the latest-only table so attempt_no starts at 1.
    await queryRunner.query(`
      INSERT INTO "exam_attempt_history"
        ("user_id", "exam_id", "course_id", "scope", "scope_refs", "exam_pool", "attempt_no", "score", "section_breakdown", "submitted_at")
      SELECT a.user_id, a.exam_id, e.course_id, e.scope, e.scope_refs, e.exam_pool, 1, a.score, a.section_breakdown, a.completed_at
      FROM exam_attempts a
      JOIN exams e ON e.id = a.exam_id
      WHERE NOT EXISTS (SELECT 1 FROM exam_attempt_history h WHERE h.user_id = a.user_id AND h.exam_id = a.exam_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempt_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "video_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_events_daily"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_events"`); // drops partitions
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ensure_product_events_partition(date)`,
    );
  }
}
