import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { metrics } from '@opentelemetry/api';
import { Stripe } from 'stripe';
import { DataSource } from 'typeorm';
import { PurchaseService } from './purchase.service';

/** The events the webhook endpoint subscribes to (stripe-sandbox-test-plan.md U12). */
export const HANDLED_STRIPE_EVENTS = [
  'payment_intent.succeeded',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'charge.refunded',
];

/** Give up on an event after this many failed replays (≈ 5 hours at hourly runs). */
export const MAX_REPLAY_ATTEMPTS = 5;
/** Stripe stops retrying live deliveries after 3 days; look back that far. */
const LOOKBACK_SECONDS = 3 * 24 * 60 * 60;
/** Leave fresh events to Stripe's own first retries. */
const MIN_AGE_SECONDS = 60 * 60;
const MAX_EVENTS_PER_RUN = 200;
/** Cluster-wide mutex (see AnalyticsMaintenanceService for the 0001 key). */
const REPLAY_LOCK_KEY = 7461_0002;

export interface ReplayReport {
  status: 'ok' | 'locked by another instance';
  seen: number;
  processed: number;
  failed: number;
  dead: number;
  skipped: number;
  deadUnresolved: number;
}

/**
 * Safety net for webhooks that never got through (endpoint down, bad secret,
 * a bug that 500s). Hourly, asks Stripe for events whose delivery is still
 * failing and runs them through PurchaseService.processEvent — the same code
 * the webhook uses, which is idempotent. Each event gets MAX_REPLAY_ATTEMPTS
 * tries; then it is marked `dead`, logged as an error, and counted in the
 * `stripe_events_dead` reconciliation check (admin reporting) and the
 * `stripe.webhook.dead_events` gauge (Grafana) until resolved_at is set.
 *
 * Off unless STRIPE_EVENT_REPLAY_ENABLED=true (the deployed site only):
 * Stripe's "failed delivery" filter is account-wide, and local dev shares the
 * sandbox account. processEvent also ignores customers from other environments.
 */
@Injectable()
export class StripeEventReplayService {
  private readonly logger = new Logger(StripeEventReplayService.name);
  private running = false;
  private lastDead = 0;

  private readonly meter = metrics.getMeter('droneedge');
  private readonly replays = this.meter.createCounter(
    'stripe.webhook.replays',
    {
      description: 'Undelivered Stripe events replayed from the API, by result',
    },
  );

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly purchases: PurchaseService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.meter
      .createObservableGauge('stripe.webhook.dead_events', {
        description:
          'Stripe events that failed every replay and are not resolved (latest run)',
      })
      .addCallback((result) => result.observe(this.lastDead));
  }

  @Cron('15 * * * *')
  async hourly(): Promise<void> {
    if (this.configService.get('STRIPE_EVENT_REPLAY_ENABLED') !== 'true') {
      return;
    }
    try {
      const report = await this.run();
      if (report.seen > 0 || report.deadUnresolved > 0) {
        this.logger.log(`stripe event replay: ${JSON.stringify(report)}`);
      }
    } catch (err) {
      this.logger.error('stripe event replay failed', (err as Error).stack);
    }
  }

  /** Exposed for the admin "replay now" action and tests. */
  async run(): Promise<ReplayReport> {
    const report: ReplayReport = {
      status: 'ok',
      seen: 0,
      processed: 0,
      failed: 0,
      dead: 0,
      skipped: 0,
      deadUnresolved: 0,
    };
    if (this.running)
      return { ...report, status: 'locked by another instance' };
    this.running = true;

    const lockConn = this.dataSource.createQueryRunner();
    try {
      const lock: { locked: boolean }[] = await lockConn.query(
        `SELECT pg_try_advisory_lock($1) AS locked`,
        [REPLAY_LOCK_KEY],
      );
      if (!lock[0]?.locked) {
        return { ...report, status: 'locked by another instance' };
      }

      const now = Math.floor(Date.now() / 1000);
      for await (const event of this.stripe.events.list({
        delivery_success: false,
        types: HANDLED_STRIPE_EVENTS,
        created: { gte: now - LOOKBACK_SECONDS, lte: now - MIN_AGE_SECONDS },
        limit: 100,
      })) {
        if (++report.seen > MAX_EVENTS_PER_RUN) break;
        const result = await this.replayOne(event);
        report[result] += 1;
        this.replays.add(1, { result });
      }

      report.deadUnresolved = await this.recordDeadEvents();
      return report;
    } finally {
      try {
        await lockConn.query(`SELECT pg_advisory_unlock($1)`, [
          REPLAY_LOCK_KEY,
        ]);
      } catch {
        /* the lock dies with the session */
      }
      await lockConn.release();
      this.running = false;
    }
  }

  private async replayOne(
    event: Stripe.Event,
  ): Promise<'processed' | 'failed' | 'dead' | 'skipped'> {
    const [row]: { status: string; attempts: number }[] =
      await this.dataSource.query(
        `SELECT status, attempts FROM stripe_event_replays WHERE event_id = $1`,
        [event.id],
      );
    // Stripe keeps listing an event as undelivered while the endpoint is
    // down, even after we processed it here — don't run it again.
    if (row && row.status !== 'failed') return 'skipped';

    let status: 'processed' | 'failed' | 'dead' = 'processed';
    let error: string | null = null;
    try {
      await this.purchases.processEvent(event);
    } catch (err) {
      error = (err as Error).message ?? String(err);
      const attempts = (row?.attempts ?? 0) + 1;
      status = attempts >= MAX_REPLAY_ATTEMPTS ? 'dead' : 'failed';
      if (status === 'dead') {
        this.logger.error(
          `Stripe event ${event.id} (${event.type}) failed ${attempts} replays — giving up: ${error}`,
        );
      } else {
        this.logger.warn(
          `Stripe event ${event.id} (${event.type}) replay ${attempts}/${MAX_REPLAY_ATTEMPTS} failed: ${error}`,
        );
      }
    }

    await this.dataSource.query(
      `INSERT INTO stripe_event_replays
         (event_id, event_type, status, attempts, last_error, last_attempt_at, processed_at)
       VALUES ($1, $2, $3, 1, $4, now(), CASE WHEN $3 = 'processed' THEN now() END)
       ON CONFLICT (event_id) DO UPDATE SET
         status = EXCLUDED.status,
         attempts = stripe_event_replays.attempts + 1,
         last_error = EXCLUDED.last_error,
         last_attempt_at = now(),
         processed_at = EXCLUDED.processed_at`,
      [event.id, event.type, status, error],
    );
    return status;
  }

  /** Writes the unresolved dead events as a reconciliation check (admin reporting). */
  private async recordDeadEvents(): Promise<number> {
    const dead: unknown[] = await this.dataSource.query(
      `SELECT event_id, event_type, attempts, last_error, last_attempt_at
       FROM stripe_event_replays
       WHERE status = 'dead' AND resolved_at IS NULL
       ORDER BY last_attempt_at DESC`,
    );
    // Admin health shows the latest row per check; write only on change so an
    // hourly job doesn't add 24 identical rows a day.
    const [latest]: { mismatches: number }[] = await this.dataSource.query(
      `SELECT mismatches FROM analytics_reconciliation
       WHERE check_name = 'stripe_events_dead' ORDER BY ran_at DESC LIMIT 1`,
    );
    if (!latest || Number(latest.mismatches) !== dead.length) {
      await this.dataSource.query(
        `INSERT INTO analytics_reconciliation (check_name, mismatches, detail)
         VALUES ('stripe_events_dead', $1, $2::jsonb)`,
        [dead.length, JSON.stringify(dead.slice(0, 50))],
      );
    }
    this.lastDead = dead.length;
    return dead.length;
  }
}
