import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRolesAndCoursePurchases1756929385722 implements MigrationInterface {
    name = 'AddUserRolesAndCoursePurchases1756929385722'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_courses_title_3423"`);
        await queryRunner.query(`CREATE TABLE "user_courses_purchased" ("usersId" integer NOT NULL, "coursesId" integer NOT NULL, CONSTRAINT "PK_25c34fdac25c08e7ff80285689d" PRIMARY KEY ("usersId", "coursesId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_395a7741d3e6803eed854ce686" ON "user_courses_purchased" ("usersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4e164ebe879e9cbdaee8b018e0" ON "user_courses_purchased" ("coursesId") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "write_access"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'pro', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "pro_membership_expires_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "picture_url"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "picture_url" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_a01a7f0e38c6f16024d16058ab" ON "courses" ("title") `);
        await queryRunner.query(`ALTER TABLE "user_courses_purchased" ADD CONSTRAINT "FK_395a7741d3e6803eed854ce6869" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_courses_purchased" ADD CONSTRAINT "FK_4e164ebe879e9cbdaee8b018e09" FOREIGN KEY ("coursesId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_courses_purchased" DROP CONSTRAINT "FK_4e164ebe879e9cbdaee8b018e09"`);
        await queryRunner.query(`ALTER TABLE "user_courses_purchased" DROP CONSTRAINT "FK_395a7741d3e6803eed854ce6869"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a01a7f0e38c6f16024d16058ab"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "picture_url"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "picture_url" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pro_membership_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "write_access" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4e164ebe879e9cbdaee8b018e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_395a7741d3e6803eed854ce686"`);
        await queryRunner.query(`DROP TABLE "user_courses_purchased"`);
        await queryRunner.query(`CREATE INDEX "IDX_courses_title_3423" ON "courses" ("title") `);
    }

}
