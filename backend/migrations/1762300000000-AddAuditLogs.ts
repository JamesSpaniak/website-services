import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1762300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "action" varchar NOT NULL,
                "metadata" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_action" ON "audit_logs" ("user_id", "action")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }
}
