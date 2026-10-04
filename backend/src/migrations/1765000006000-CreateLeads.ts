import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Waitlist / email capture (launch plan W3). One row per (email, interest) so
 * someone can be on the Drone Building waitlist and unsubscribe from the
 * newsletter independently. Email is stored lowercased by LeadsService.
 *
 * attribution columns = first-touch `de_attr` cookie (W5) at signup time.
 * confirmation_sent_at  = SES waitlist confirmation accepted (Z4/Z5).
 * unsubscribed_at       = one-click / preference-page unsubscribe, or SES complaint (Z2/Z3).
 * bounced_at            = SES permanent bounce (Z2) — never mailed again.
 */
export class CreateLeads1765000006000 implements MigrationInterface {
  name = 'CreateLeads1765000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id"                   SERIAL PRIMARY KEY,
        "email"                varchar(254) NOT NULL,
        "interest"             text NOT NULL CHECK ("interest" IN ('building', 'part107', 'schools', 'newsletter')),
        "source_path"          varchar(200),
        "landing_path"         varchar(200),
        "utm_source"           varchar(200),
        "utm_medium"           varchar(200),
        "utm_campaign"         varchar(200),
        "utm_term"             varchar(200),
        "utm_content"          varchar(200),
        "gclid"                varchar(200),
        "fbclid"               varchar(200),
        "ref"                  varchar(200),
        "consent_at"           timestamptz NOT NULL DEFAULT now(),
        "confirmation_sent_at" timestamptz,
        "unsubscribed_at"      timestamptz,
        "bounced_at"           timestamptz,
        "created_at"           timestamptz NOT NULL DEFAULT now(),
        "updated_at"           timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_leads_email_interest" UNIQUE ("email", "interest")
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_leads_interest_active"
       ON "leads" ("interest") WHERE "unsubscribed_at" IS NULL AND "bounced_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_leads_utm_source" ON "leads" ("utm_source")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
  }
}
