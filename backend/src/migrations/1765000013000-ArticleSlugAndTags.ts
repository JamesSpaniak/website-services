import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Readable article URLs (/articles/drone-careers-2026) and topic tags.
 *
 * Existing rows get a slug derived from the title (same rule as
 * ArticleService.slugify), with "-<id>" appended on the rare collision, so
 * every article has a URL the moment this runs — no re-import required.
 * Editors can replace it with a shorter hand-picked slug in the admin editor;
 * numeric /articles/<id> URLs keep working and redirect to the slug.
 */
export class ArticleSlugAndTags1765000013000 implements MigrationInterface {
  name = 'ArticleSlugAndTags1765000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "slug" varchar(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(`
      UPDATE "articles"
      SET "slug" = trim(both '-' from left(
        trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')),
        80
      ))
      WHERE "slug" IS NULL
    `);
    // Titles with no usable characters, then duplicates: fall back to / append the id.
    await queryRunner.query(
      `UPDATE "articles" SET "slug" = 'article-' || "id" WHERE "slug" IS NULL OR "slug" = ''`,
    );
    await queryRunner.query(`
      UPDATE "articles" a
      SET "slug" = a."slug" || '-' || a."id"
      FROM (
        SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "id") AS rn
        FROM "articles"
      ) d
      WHERE a."id" = d."id" AND d.rn > 1
    `);

    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_articles_slug" ON "articles" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_articles_slug"`);
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "tags"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "slug"`,
    );
  }
}
