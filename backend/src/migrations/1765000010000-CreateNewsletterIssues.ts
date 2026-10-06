import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Field Notes publishing (newsletter plan § 8 "Publishing and updates",
 * NL9/NL10/NL13). Issues are drafted as markdown in the repo and uploaded in
 * Admin → Newsletter; this table is the record of what was approved and sent.
 *
 * body_md      = the email body as approved; immutable once sent.
 * web_body_md  = web-archive override after send (corrections); NULL = body_md.
 * corrections  = [{ at, note }] shown on the web page.
 * newsletter_sends = one row per address per issue, so a send that stops
 *                    halfway resumes without mailing anyone twice.
 */
export class CreateNewsletterIssues1765000010000 implements MigrationInterface {
  name = 'CreateNewsletterIssues1765000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "newsletter_issues" (
        "id"            SERIAL PRIMARY KEY,
        "slug"          varchar(64)  NOT NULL UNIQUE,
        "subject"       varchar(150) NOT NULL,
        "preheader"     varchar(200),
        "lists"         text[]       NOT NULL DEFAULT ARRAY['newsletter'],
        "body_md"       text         NOT NULL,
        "web_body_md"   text,
        "corrections"   jsonb        NOT NULL DEFAULT '[]'::jsonb,
        "status"        varchar(16)  NOT NULL DEFAULT 'draft',
        "approved_by"   integer      REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at"   TIMESTAMPTZ,
        "sent_at"       TIMESTAMPTZ,
        "recipients"    integer,
        "sent_count"    integer      NOT NULL DEFAULT 0,
        "failed_count"  integer      NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "chk_newsletter_status" CHECK ("status" IN ('draft', 'approved', 'sending', 'sent'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "newsletter_sends" (
        "id"          BIGSERIAL PRIMARY KEY,
        "issue_id"    integer      NOT NULL REFERENCES "newsletter_issues"("id") ON DELETE CASCADE,
        "email"       varchar(254) NOT NULL,
        "status"      varchar(8)   NOT NULL,
        "message_id"  varchar(128),
        "error"       varchar(300),
        "sent_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "uq_newsletter_sends_issue_email" UNIQUE ("issue_id", "email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "newsletter_sends"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "newsletter_issues"`);
  }
}
