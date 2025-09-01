import { MigrationInterface, QueryRunner } from "typeorm";

export class first1676344883230 implements MigrationInterface {
    name = 'first1676344883230'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "articles" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "sub_heading" character varying NOT NULL, "body" character varying NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "hidden" boolean NOT NULL, CONSTRAINT "UQ_3c28437db9b5137136e1f6d6096" UNIQUE ("title"), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3c28437db9b5137136e1f6d609" ON "articles" ("title") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "write_access" boolean NOT NULL DEFAULT false, "first_name" character varying, "last_name" character varying, "email" character varying, "picture_url" character varying, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE TABLE "courses" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "payload" character varying NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "hidden" boolean NOT NULL, CONSTRAINT "UQ_title_2324" UNIQUE ("title"), CONSTRAINT "PK_courses_pk" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_courses_title_3423" ON "courses" ("title") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_courses_title_3423"`);
        await queryRunner.query(`DROP TABLE "courses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c28437db9b5137136e1f6d609"`);
        await queryRunner.query(`DROP TABLE "articles"`);
    }
}
