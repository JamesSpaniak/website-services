import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-issue newsletter metrics (newsletter plan § 5, NL14). SES publishes
 * Delivery / Open / Click / Bounce / Complaint events for every message sent
 * through the marketing configuration set; events for messages tagged
 * kind=newsletter are kept here, joined to the issue by the `issue` tag.
 *
 * Privacy (decided Oct 4 2026): clicks keep the recipient email + link
 * (admin-only, for follow-up); opens are counted but never stored per person
 * (Apple Mail Privacy Protection makes them noise). No IP or user agent is
 * stored. Rows older than 12 months are pruned; rows for an email are
 * deleted with the account.
 *
 * likely_bot = a click within 30 s of sending: corporate / school mail
 * scanners (Defender, Mimecast, Proofpoint) open every link on delivery.
 */
export class CreateNewsletterEvents1765000011000 implements MigrationInterface {
  name = 'CreateNewsletterEvents1765000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "newsletter_events" (
        "id"           BIGSERIAL PRIMARY KEY,
        "issue_id"     integer      NOT NULL REFERENCES "newsletter_issues"("id") ON DELETE CASCADE,
        "message_id"   varchar(128) NOT NULL,
        "event_type"   varchar(16)  NOT NULL,
        "email"        varchar(254),
        "link"         text,
        "likely_bot"   boolean      NOT NULL DEFAULT false,
        "occurred_at"  TIMESTAMPTZ  NOT NULL,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "chk_newsletter_event_type" CHECK ("event_type" IN ('delivery', 'open', 'click', 'bounce', 'complaint', 'reject'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_newsletter_events_issue_type" ON "newsletter_events" ("issue_id", "event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_newsletter_events_email" ON "newsletter_events" ("email") WHERE "email" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "newsletter_events"`);
  }
}
