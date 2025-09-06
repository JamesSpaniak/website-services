import { MigrationInterface, QueryRunner } from "typeorm";

export class ProgressMigration1757080925383 implements MigrationInterface {
    name = 'ProgressMigration1757080925383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "progress" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "courseId" integer NOT NULL, "payload" jsonb NOT NULL, CONSTRAINT "UQ_d665daba18db095b26e79cbdc51" UNIQUE ("userId", "courseId"), CONSTRAINT "PK_79abdfd87a688f9de756a162b6f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "progress" ADD CONSTRAINT "FK_0366c96237f98ea1c8ba6e1ec35" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progress" ADD CONSTRAINT "FK_cb4d1477194c4ba8cf55bb6eb4b" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress" DROP CONSTRAINT "FK_cb4d1477194c4ba8cf55bb6eb4b"`);
        await queryRunner.query(`ALTER TABLE "progress" DROP CONSTRAINT "FK_0366c96237f98ea1c8ba6e1ec35"`);
        await queryRunner.query(`DROP TABLE "progress"`);
    }

}
