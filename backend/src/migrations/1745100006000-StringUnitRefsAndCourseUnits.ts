import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data model migration to stable string unit refs (PR 3).
 *
 * 1. Creates the derived `course_units` index table (rebuilt on course save).
 * 2. Rewrites every course payload:
 *      - numeric unit ids → canonical string refs ("u101")
 *      - drops deprecated `image_url` (merged into `images_url`)
 *      - drops legacy embedded `exam` blocks (exams live in the question bank)
 * 3. Adds `unit_ref` / `sub_unit_ref` to questions and backfills them by
 *    walking the course tree (tree position, NOT digit arithmetic — this
 *    fixes questions mis-linked by the old `id // 100` decoding).
 * 4. Adds `scope_refs` to exams and backfills from `scope_ids`.
 * 5. Replaces `progress.payload` (full course-blob copy) with a compact
 *    `unit_statuses` jsonb map keyed by unit ref, and rewrites stored
 *    exam_scores snapshots to use scope_refs.
 *
 * Legacy integer columns (questions.unit_id / sub_unit_id, exams.scope_ids)
 * are kept for one release as a rollback safety net; application code no
 * longer reads them.
 */
export class StringUnitRefsAndCourseUnits1745100006000
  implements MigrationInterface
{
  name = 'StringUnitRefsAndCourseUnits1745100006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. course_units ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "course_units" (
        "id"         SERIAL        NOT NULL,
        "course_id"  integer       NOT NULL,
        "ref"        varchar(64)   NOT NULL,
        "parent_ref" varchar(64),
        "legacy_id"  integer,
        "path"       varchar(255)  NOT NULL,
        "depth"      smallint      NOT NULL,
        "position"   smallint      NOT NULL,
        "title"      varchar(512)  NOT NULL,
        CONSTRAINT "PK_course_units" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_units_course_ref" UNIQUE ("course_id", "ref"),
        CONSTRAINT "FK_course_units_course" FOREIGN KEY ("course_id")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_course_units_course" ON "course_units" ("course_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_course_units_course_parent" ON "course_units" ("course_id", "parent_ref")`,
    );

    // ── 2. Normalize payloads + build course_units rows ──────────────────────
    // Maps used later for question/exam backfill: courseId → (legacy_id → node)
    const legacyMaps = new Map<
      number,
      Map<number, { ref: string; rootRef: string }>
    >();

    const courses: { id: number; payload: string }[] = await queryRunner.query(
      `SELECT id, payload FROM courses`,
    );

    for (const course of courses) {
      let payload: any;
      try {
        payload = JSON.parse(course.payload);
      } catch {
        console.warn(`[migration] course ${course.id}: unparseable payload, skipped`);
        continue;
      }

      const legacyMap = new Map<number, { ref: string; rootRef: string }>();
      const rows: any[] = [];
      const seen = new Set<string>();

      const toRef = (id: unknown): string | null => {
        if (typeof id === 'number' && Number.isInteger(id)) return `u${id}`;
        if (typeof id === 'string') {
          const t = id.trim();
          if (!t) return null;
          return /^\d+$/.test(t) ? `u${t}` : t.slice(0, 64);
        }
        return null;
      };
      const toLegacy = (id: unknown): number | null => {
        if (typeof id === 'number' && Number.isInteger(id)) return id;
        if (typeof id === 'string' && /^u?\d+$/.test(id.trim())) {
          return parseInt(id.trim().replace(/^u/, ''), 10);
        }
        return null;
      };

      const cleanNode = (node: any): void => {
        // L1: image_url was merged into images_url long ago; drop the leftovers
        if (typeof node.image_url === 'string' && node.image_url.trim()) {
          const urls: string[] = Array.isArray(node.images_url) ? node.images_url : [];
          if (!urls.includes(node.image_url.trim())) urls.push(node.image_url.trim());
          node.images_url = urls;
        }
        delete node.image_url;
      };

      const walk = (
        units: any[] | undefined,
        parentRef: string | null,
        parentPath: string,
        depth: number,
      ): void => {
        if (!Array.isArray(units)) return;
        units.forEach((unit, position) => {
          const legacyId = toLegacy(unit.id);
          let ref = toRef(unit.id);
          if (!ref || seen.has(ref)) {
            console.warn(
              `[migration] course ${course.id}: unit id ${JSON.stringify(unit.id)} ` +
                `${!ref ? 'is invalid' : 'is a duplicate'} — assigned positional ref`,
            );
            ref = parentPath
              ? `${parentPath.split('/').pop()}-p${position}`
              : `unit-p${position}`;
          }
          seen.add(ref);
          unit.id = ref;
          cleanNode(unit);
          // M4: embedded exams are dead — exams live in the question bank now
          delete unit.exam;

          const path = parentPath ? `${parentPath}/${ref}` : ref;
          const rootRef = path.split('/')[0];
          if (legacyId !== null && !legacyMap.has(legacyId)) {
            legacyMap.set(legacyId, { ref, rootRef });
          }
          rows.push([
            course.id,
            ref,
            parentRef,
            legacyId,
            path,
            depth,
            position,
            String(unit.title ?? '').slice(0, 512),
          ]);
          walk(unit.sub_units, ref, path, depth + 1);
        });
      };

      cleanNode(payload);
      walk(payload.units, null, '', 0);
      legacyMaps.set(course.id, legacyMap);

      for (const row of rows) {
        await queryRunner.query(
          `INSERT INTO course_units
             (course_id, ref, parent_ref, legacy_id, path, depth, position, title)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          row,
        );
      }
      await queryRunner.query(`UPDATE courses SET payload = $1 WHERE id = $2`, [
        JSON.stringify(payload),
        course.id,
      ]);
    }

    // ── 3. questions.unit_ref / sub_unit_ref ─────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "questions" ADD COLUMN "unit_ref" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "questions" ADD COLUMN "sub_unit_ref" varchar(64)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_questions_course_unit_ref" ON "questions" ("course_id", "unit_ref")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_questions_course_sub_unit_ref" ON "questions" ("course_id", "sub_unit_ref")`,
    );

    const questions: {
      id: number;
      course_id: number;
      unit_id: number | null;
      sub_unit_id: number | null;
    }[] = await queryRunner.query(
      `SELECT id, course_id, unit_id, sub_unit_id FROM questions`,
    );

    const unmatched: string[] = [];
    for (const q of questions) {
      const legacyMap = legacyMaps.get(q.course_id);
      let unitRef: string | null = null;
      let subUnitRef: string | null = null;

      if (legacyMap) {
        if (q.sub_unit_id !== null) {
          const node = legacyMap.get(q.sub_unit_id);
          if (node) {
            subUnitRef = node.ref;
            // Derive the owning unit from tree position — this corrects rows
            // where digit arithmetic decoded the wrong unit (e.g. 101 → unit 1
            // instead of unit 10).
            unitRef = node.rootRef;
          } else {
            unmatched.push(
              `question ${q.id}: sub_unit_id ${q.sub_unit_id} not in course ${q.course_id} tree`,
            );
          }
        }
        if (!unitRef && q.unit_id !== null) {
          const node = legacyMap.get(q.unit_id);
          if (node) {
            unitRef = node.rootRef;
          } else {
            unmatched.push(
              `question ${q.id}: unit_id ${q.unit_id} not in course ${q.course_id} tree`,
            );
          }
        }
      }

      if (unitRef || subUnitRef) {
        await queryRunner.query(
          `UPDATE questions SET unit_ref = $1, sub_unit_ref = $2 WHERE id = $3`,
          [unitRef, subUnitRef, q.id],
        );
      }
    }
    if (unmatched.length > 0) {
      console.warn(
        `[migration] ${unmatched.length} question link(s) could not be resolved to the course tree ` +
          `(fix by re-importing the regenerated question bank):\n  ` +
          unmatched.join('\n  '),
      );
    }

    // ── 4. exams.scope_refs ──────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "exams" ADD COLUMN "scope_refs" varchar(64)[] NOT NULL DEFAULT '{}'`,
    );

    const exams: { id: number; course_id: number; scope_ids: number[] }[] =
      await queryRunner.query(`SELECT id, course_id, scope_ids FROM exams`);
    for (const exam of exams) {
      const legacyMap = legacyMaps.get(exam.course_id);
      const refs = (exam.scope_ids ?? []).map(
        (sid) => legacyMap?.get(sid)?.ref ?? `u${sid}`,
      );
      if (refs.length > 0) {
        await queryRunner.query(
          `UPDATE exams SET scope_refs = $1 WHERE id = $2`,
          [refs, exam.id],
        );
      }
    }

    // ── 5. progress: payload blob → unit_statuses map ────────────────────────
    await queryRunner.query(
      `ALTER TABLE "progress" ADD COLUMN "unit_statuses" jsonb NOT NULL DEFAULT '{}'`,
    );

    const progressRows: {
      id: number;
      courseId: number;
      payload: any;
      exam_scores: any[] | null;
    }[] = await queryRunner.query(
      `SELECT id, "courseId", payload, exam_scores FROM progress`,
    );

    for (const row of progressRows) {
      const legacyMap = legacyMaps.get(row.courseId);
      const statuses: Record<string, string> = {};

      const collect = (units: any[] | undefined): void => {
        if (!Array.isArray(units)) return;
        for (const unit of units) {
          const legacy =
            typeof unit.id === 'number'
              ? unit.id
              : /^u?\d+$/.test(String(unit.id ?? ''))
                ? parseInt(String(unit.id).replace(/^u/, ''), 10)
                : null;
          const ref =
            legacy !== null
              ? (legacyMap?.get(legacy)?.ref ?? `u${legacy}`)
              : String(unit.id ?? '');
          if (ref && unit.status && unit.status !== 'NOT_STARTED') {
            statuses[ref] = unit.status;
          }
          collect(unit.sub_units);
        }
      };
      collect(row.payload?.units);

      const rewrittenScores = Array.isArray(row.exam_scores)
        ? JSON.stringify(
            row.exam_scores.map((s: any) => {
              const { scope_ids, ...rest } = s ?? {};
              return {
                ...rest,
                scope_refs: (scope_ids ?? []).map(
                  (sid: number) => legacyMap?.get(sid)?.ref ?? `u${sid}`,
                ),
              };
            }),
          )
        : null;

      await queryRunner.query(
        `UPDATE progress SET unit_statuses = $1, exam_scores = $2 WHERE id = $3`,
        [JSON.stringify(statuses), rewrittenScores, row.id],
      );
    }

    await queryRunner.query(`ALTER TABLE "progress" DROP COLUMN "payload"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Structural rollback only — payload id normalization and progress blob
    // reconstruction are not reversed (no production progress exists).
    await queryRunner.query(
      `ALTER TABLE "progress" ADD COLUMN "payload" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "progress" DROP COLUMN "unit_statuses"`);
    await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "scope_refs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_questions_course_sub_unit_ref"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_questions_course_unit_ref"`);
    await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN "sub_unit_ref"`);
    await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN "unit_ref"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course_units"`);
  }
}
