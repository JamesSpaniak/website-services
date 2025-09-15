import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1757441240640 implements MigrationInterface {
    name = 'Migrations1757441240640'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "courses" ADD "price" numeric`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "price"`);
    }

}
