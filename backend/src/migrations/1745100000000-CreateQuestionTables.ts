import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the question bank tables:
 *   questions     — individual questions linked to courses/units/sub-units
 *   exams         — generated exam instances (frozen question sets)
 *   exam_attempts — one latest attempt per (user, exam) via UPSERT
 *   class_exams   — teacher-assigned exams for an organization
 */
export class CreateQuestionTables1745100000000 implements MigrationInterface {
  name = 'CreateQuestionTables1745100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── questions ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "questions" (
        "id"           SERIAL          NOT NULL,
        "course_id"    integer         NOT NULL,
        "unit_id"      integer,
        "sub_unit_id"  integer,
        "question_text" text           NOT NULL,
        "choices"      jsonb           NOT NULL,
        "explanation"  text,
        "standard"     varchar(64),
        "priority"     smallint        NOT NULL DEFAULT 2,
        "difficulty"   varchar(16)     NOT NULL DEFAULT 'medium',
        "status"       varchar(16)     NOT NULL DEFAULT 'active',
        "created_at"   TIMESTAMPTZ     NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_questions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_questions_course_id"          ON "questions" ("course_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_questions_course_unit"        ON "questions" ("course_id", "unit_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_questions_course_sub_unit"    ON "questions" ("course_id", "sub_unit_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_questions_status"             ON "questions" ("status")`);

    // ── exams ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "exams" (
        "id"                  SERIAL        NOT NULL,
        "course_id"           integer       NOT NULL,
        "scope"               varchar(16)   NOT NULL,
        "scope_ids"           integer[]     NOT NULL DEFAULT '{}',
        "question_ids"        integer[]     NOT NULL DEFAULT '{}',
        "is_randomized"       boolean       NOT NULL DEFAULT true,
        "version"             varchar(8)    NOT NULL DEFAULT 'v1',
        "generated_by"        varchar(16)   NOT NULL,
        "created_by_user_id"  integer,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exams" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_exams_course_id"    ON "exams" ("course_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_exams_course_scope" ON "exams" ("course_id", "scope")`);

    // ── exam_attempts ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "exam_attempts" (
        "id"                SERIAL        NOT NULL,
        "user_id"           integer       NOT NULL,
        "exam_id"           integer       NOT NULL,
        "answers"           jsonb         NOT NULL,
        "score"             integer       NOT NULL,
        "section_breakdown" jsonb,
        "completed_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exam_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_exam_attempts_user_exam" UNIQUE ("user_id", "exam_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_exam_attempts_user_id" ON "exam_attempts" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_exam_attempts_exam_id" ON "exam_attempts" ("exam_id")`);

    // ── class_exams ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "class_exams" (
        "id"                    SERIAL        NOT NULL,
        "exam_id"               integer       NOT NULL,
        "assigned_by_user_id"   integer       NOT NULL,
        "organization_id"       integer       NOT NULL,
        "label"                 varchar(128),
        "due_date"              TIMESTAMPTZ,
        "assigned_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_class_exams" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_class_exams_org"  ON "class_exams" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_class_exams_exam" ON "class_exams" ("exam_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "class_exams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions"`);
  }
}
