import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMediaFieldsToArticles1761000000000 implements MigrationInterface {
    name = 'AddMediaFieldsToArticles1761000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "articles" ADD "image_url" varchar`
        );
        await queryRunner.query(
            `ALTER TABLE "articles" ADD "content_blocks" jsonb`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "articles" DROP COLUMN "content_blocks"`
        );
        await queryRunner.query(
            `ALTER TABLE "articles" DROP COLUMN "image_url"`
        );
    }
}
