import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizations1762000000000 implements MigrationInterface {
    name = 'AddOrganizations1762000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "org_role_enum" AS ENUM ('manager', 'member')
        `);

        await queryRunner.query(`
            CREATE TABLE "organizations" (
                "id" SERIAL PRIMARY KEY,
                "name" varchar NOT NULL UNIQUE,
                "max_students" int NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_organizations_name" ON "organizations" ("name")
        `);

        await queryRunner.query(`
            CREATE TABLE "organization_members" (
                "id" SERIAL PRIMARY KEY,
                "organization_id" int NOT NULL,
                "user_id" int NOT NULL,
                "role" "org_role_enum" NOT NULL DEFAULT 'member',
                "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_org_member_org_user" UNIQUE ("organization_id", "user_id"),
                CONSTRAINT "FK_org_member_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_org_member_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "invite_codes" (
                "id" SERIAL PRIMARY KEY,
                "organization_id" int NOT NULL,
                "code" varchar(16) NOT NULL UNIQUE,
                "role" "org_role_enum" NOT NULL DEFAULT 'member',
                "email" varchar,
                "created_by_user_id" int NOT NULL,
                "used_by_user_id" int,
                "used_at" TIMESTAMP WITH TIME ZONE,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "FK_invite_code_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_invite_code_created_by" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_invite_code_used_by" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_invite_codes_code" ON "invite_codes" ("code")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invite_codes"`);
        await queryRunner.query(`DROP TABLE "organization_members"`);
        await queryRunner.query(`DROP INDEX "IDX_organizations_name"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP TYPE "org_role_enum"`);
    }
}
