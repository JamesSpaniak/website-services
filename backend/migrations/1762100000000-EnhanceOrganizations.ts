import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceOrganizations1762100000000 implements MigrationInterface {
    name = 'EnhanceOrganizations1762100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "organizations"
            ADD COLUMN "school_year" varchar,
            ADD COLUMN "semester" varchar
        `);

        await queryRunner.query(`
            CREATE TABLE "organization_courses" (
                "organizationsId" int NOT NULL,
                "coursesId" int NOT NULL,
                CONSTRAINT "PK_organization_courses" PRIMARY KEY ("organizationsId", "coursesId"),
                CONSTRAINT "FK_organization_courses_org" FOREIGN KEY ("organizationsId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_organization_courses_course" FOREIGN KEY ("coursesId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_organization_courses_org" ON "organization_courses" ("organizationsId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_organization_courses_course" ON "organization_courses" ("coursesId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_organization_courses_course"`);
        await queryRunner.query(`DROP INDEX "IDX_organization_courses_org"`);
        await queryRunner.query(`DROP TABLE "organization_courses"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "semester"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "school_year"`);
    }
}
