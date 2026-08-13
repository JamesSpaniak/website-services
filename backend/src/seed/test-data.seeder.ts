import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Seeds dev-only test fixtures (test admin, test student, a test organization
 * and its membership). Gated by SEED_TEST_DATA=true so it never runs in prod.
 *
 * This is intentionally NOT a migration: it must be safe to run on every boot
 * (idempotent upserts) and must be re-runnable after the fixtures change, which
 * migrations — recorded once — cannot do.
 */
export async function seedTestData(
  dataSource: DataSource,
  logger: Logger,
): Promise<void> {
  const rawPassword = process.env.TEST_USER_PASSWORD;
  if (!rawPassword) {
    logger.warn(
      'SEED_TEST_DATA is enabled but TEST_USER_PASSWORD is not set; skipping test seed.',
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const orgName = process.env.TEST_ORG_NAME || 'Test Org';

  await dataSource.transaction(async (manager) => {
    // Test admin account.
    await manager.query(
      `INSERT INTO "users" ("username", "password", "email", "role", "is_email_verified", "token_version")
             VALUES ($1, $2, $3, 'admin', true, 0)
             ON CONFLICT ("username") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role"`,
      ['testadmin', hashedPassword, 'testadmin@thedroneedge.com'],
    );

    // Test student account.
    await manager.query(
      `INSERT INTO "users" ("username", "password", "email", "role", "is_email_verified", "token_version")
             VALUES ($1, $2, $3, 'user', true, 0)
             ON CONFLICT ("username") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role"`,
      ['testuser', hashedPassword, 'testuser@thedroneedge.com'],
    );

    // Test organization.
    await manager.query(
      `INSERT INTO "organizations" ("name", "max_students")
             VALUES ($1, $2)
             ON CONFLICT ("name") DO NOTHING`,
      [orgName, 50],
    );

    // Test student manages the test organization.
    await manager.query(
      `INSERT INTO "organization_members" ("organization_id", "user_id", "role")
             SELECT o."id", u."id", 'manager'
             FROM "organizations" o, "users" u
             WHERE o."name" = $1 AND u."username" = 'testuser'
             ON CONFLICT ("organization_id", "user_id") DO NOTHING`,
      [orgName],
    );
  });

  logger.log(
    `Test fixtures seeded (testadmin, testuser, organization "${orgName}").`,
  );
}
