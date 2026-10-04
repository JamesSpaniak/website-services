import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bookkeeping for StripeEventReplayService: Stripe events whose webhook
 * delivery failed and that the hourly job re-processed from the API.
 * status: processed | failed (will retry) | dead (gave up after
 * MAX_ATTEMPTS — surfaced as the `stripe_events_dead` reconciliation check
 * until someone fixes it and sets resolved_at).
 */
export class CreateStripeEventReplays1765000005000
  implements MigrationInterface
{
  name = 'CreateStripeEventReplays1765000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stripe_event_replays" (
        "event_id"        text PRIMARY KEY,
        "event_type"      text NOT NULL,
        "status"          text NOT NULL CHECK ("status" IN ('processed', 'failed', 'dead')),
        "attempts"        integer NOT NULL DEFAULT 0,
        "last_error"      text,
        "first_seen_at"   timestamptz NOT NULL DEFAULT now(),
        "last_attempt_at" timestamptz,
        "processed_at"    timestamptz,
        "resolved_at"     timestamptz
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stripe_event_replays_dead"
       ON "stripe_event_replays" ("status") WHERE "resolved_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stripe_event_replays"`);
  }
}
