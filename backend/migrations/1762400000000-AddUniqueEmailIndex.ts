import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueEmailIndex1762400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasConstraint = await queryRunner.query(`
            SELECT 1 FROM pg_constraint
            WHERE conname = 'UQ_users_email'
        `);
        if (hasConstraint.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")
            `);
        }

        const hasIndex = await queryRunner.query(`
            SELECT 1 FROM pg_indexes
            WHERE indexname = 'IDX_users_email'
        `);
        if (hasIndex.length === 0) {
            await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    }
}
