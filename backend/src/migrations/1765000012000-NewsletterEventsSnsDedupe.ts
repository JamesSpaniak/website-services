import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SNS delivers at least once and retries HTTPS deliveries that time out or
 * fail (delivery policy in terraform/ses.tf), so the same SES event can reach
 * POST /email/ses-events more than once. Each delivery of one SNS message
 * carries the same MessageId; a unique index on it lets the insert skip
 * repeats so click counts are not inflated. Nullable: rows from before this
 * migration (and direct apply() calls) have none.
 */
export class NewsletterEventsSnsDedupe1765000012000
  implements MigrationInterface
{
  name = 'NewsletterEventsSnsDedupe1765000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "newsletter_events" ADD COLUMN IF NOT EXISTS "sns_message_id" varchar(100)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_newsletter_events_sns_message_id" ON "newsletter_events" ("sns_message_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_newsletter_events_sns_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "newsletter_events" DROP COLUMN IF EXISTS "sns_message_id"`,
    );
  }
}
