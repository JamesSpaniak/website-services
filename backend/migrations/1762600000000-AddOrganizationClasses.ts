import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationClasses1762600000000 implements MigrationInterface {
    name = 'AddOrganizationClasses1762600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "organization_classes" (
                "id" SERIAL PRIMARY KEY,
                "organization_id" int NOT NULL,
                "name" varchar(128) NOT NULL,
                "max_students" int,
                "created_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_organization_classes_org_name" UNIQUE ("organization_id", "name"),
                CONSTRAINT "FK_organization_classes_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_organization_classes_org" ON "organization_classes" ("organization_id")
        `);

        await queryRunner.query(`
            ALTER TABLE "organization_members"
            ADD COLUMN "class_id" int,
            ADD CONSTRAINT "FK_organization_members_class" FOREIGN KEY ("class_id") REFERENCES "organization_classes"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "invite_codes"
            ADD COLUMN "class_id" int,
            ADD CONSTRAINT "FK_invite_codes_class" FOREIGN KEY ("class_id") REFERENCES "organization_classes"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "class_exams"
            ADD COLUMN "class_id" int,
            ADD CONSTRAINT "FK_class_exams_class" FOREIGN KEY ("class_id") REFERENCES "organization_classes"("id") ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "class_exams" DROP CONSTRAINT "FK_class_exams_class"`);
        await queryRunner.query(`ALTER TABLE "class_exams" DROP COLUMN "class_id"`);
        await queryRunner.query(`ALTER TABLE "invite_codes" DROP CONSTRAINT "FK_invite_codes_class"`);
        await queryRunner.query(`ALTER TABLE "invite_codes" DROP COLUMN "class_id"`);
        await queryRunner.query(`ALTER TABLE "organization_members" DROP CONSTRAINT "FK_organization_members_class"`);
        await queryRunner.query(`ALTER TABLE "organization_members" DROP COLUMN "class_id"`);
        await queryRunner.query(`DROP INDEX "IDX_organization_classes_org"`);
        await queryRunner.query(`DROP TABLE "organization_classes"`);
    }
}
