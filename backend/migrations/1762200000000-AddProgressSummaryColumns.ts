import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProgressSummaryColumns1762200000000 implements MigrationInterface {
    name = 'AddProgressSummaryColumns1762200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "progress"
            ADD COLUMN "status" varchar NOT NULL DEFAULT 'NOT_STARTED',
            ADD COLUMN "units_completed" int NOT NULL DEFAULT 0,
            ADD COLUMN "units_total" int NOT NULL DEFAULT 0,
            ADD COLUMN "latest_exam_score" decimal,
            ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_progress_user_course" ON "progress" ("userId", "courseId")
        `);

        // Backfill status from existing JSONB payloads
        await queryRunner.query(`
            UPDATE "progress" SET
                "status" = COALESCE(payload->>'status', 'NOT_STARTED'),
                "updated_at" = now()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_progress_user_course"`);
        await queryRunner.query(`
            ALTER TABLE "progress"
            DROP COLUMN "updated_at",
            DROP COLUMN "latest_exam_score",
            DROP COLUMN "units_total",
            DROP COLUMN "units_completed",
            DROP COLUMN "status"
        `);
    }
}
