import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";

export class SeedAdminUser1760500000000 implements MigrationInterface {
    name = 'SeedAdminUser1760500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const username = process.env.ADMIN_SEED_USERNAME || 'admin';
        const email = process.env.ADMIN_SEED_EMAIL || 'james@thedroneedge.com';
        const rawPassword = process.env.ADMIN_SEED_PASSWORD || 'password';
        if (!rawPassword) {
            throw new Error('ADMIN_SEED_PASSWORD is required to seed the admin user');
        }
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await queryRunner.query(
            `INSERT INTO "users" ("username", "password", "email", "role", "is_email_verified", "token_version")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("username") DO NOTHING`,
            [username, hashedPassword, email, 'admin', true, 0]
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "users" WHERE "username" = $1`,
            [process.env.ADMIN_SEED_USERNAME || 'admin']
        );
    }
}
