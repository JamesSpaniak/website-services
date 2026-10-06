import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { metrics } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import { Stripe } from 'stripe';

export type StripeMode = 'live' | 'test' | 'unset';

/** `sk_live_…` / `rk_live_…` / `pk_live_…` → live; `*_test_…` → test. */
export function stripeKeyMode(key: string | undefined | null): StripeMode {
  if (!key) return 'unset';
  if (/^(sk|rk|pk)_live_/.test(key)) return 'live';
  if (/^(sk|rk|pk)_test_/.test(key)) return 'test';
  return 'unset';
}

export interface StripeConfigStatus {
  mode: StripeMode;
  webhook_secret: boolean;
  /** null until the async price check has run (or when no price is set). */
  pro_price_ok: boolean | null;
}

/**
 * Guards the live-key cutover (docs/tech/stripe-sandbox-test-plan.md § 8).
 *
 * At boot:
 *  1. Refuses to start when the secret key and the publishable key are in
 *     different modes (sk_live + pk_test or the reverse) — checkout would
 *     fail for every buyer. A failed boot keeps the previous ECS tasks
 *     serving, so a bad cutover never reaches users.
 *  2. Checks (async, never blocks boot) that the configured Pro price exists
 *     in the key's mode, and points the PRO_* catalog rows at the configured
 *     price ids (test and live ids differ).
 * Problems are logged and counted as `stripe.config_errors{check}` (Grafana
 * alert "Stripe config error"). The mode is reported on GET /health.
 */
@Injectable()
export class StripeConfigService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StripeConfigService.name);
  private readonly errors = metrics
    .getMeter('droneedge')
    .createCounter('stripe.config_errors', {
      description: 'Stripe configuration problems found at boot',
    });
  private proPriceOk: boolean | null = null;

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  status(): StripeConfigStatus {
    return {
      mode: stripeKeyMode(this.configService.get('STRIPE_SECRET_KEY')),
      webhook_secret: !!this.configService.get('STRIPE_WEBHOOK_SECRET'),
      pro_price_ok: this.proPriceOk,
    };
  }

  onApplicationBootstrap(): void {
    const secretMode = stripeKeyMode(
      this.configService.get('STRIPE_SECRET_KEY'),
    );
    const publishableMode = stripeKeyMode(
      this.configService.get('STRIPE_PUBLISHABLE_KEY'),
    );
    if (
      secretMode !== 'unset' &&
      publishableMode !== 'unset' &&
      secretMode !== publishableMode
    ) {
      throw new Error(
        `Stripe key mode mismatch: secret key is ${secretMode}, publishable key is ${publishableMode}. ` +
          'Set both to the same mode (stripe_publishable_key in tfvars, the secret via TF_VAR_stripe_secret_key).',
      );
    }
    this.logger.log(`Stripe mode: ${secretMode}`);
    if (secretMode === 'unset') return;
    void this.checkProPrices().catch((err) => {
      this.fail(
        'pro_price',
        `Pro price check failed: ${(err as Error).message}`,
      );
    });
  }

  /** Exposed for tests. */
  async checkProPrices(): Promise<void> {
    const live = this.status().mode === 'live';
    const prices: [string, string | undefined][] = [
      ['PRO_MONTHLY', this.configService.get('STRIPE_PRO_PRICE_ID_MONTHLY')],
      ['PRO_YEARLY', this.configService.get('STRIPE_PRO_PRICE_ID_YEARLY')],
    ];
    let checked = false;
    let ok = true;
    for (const [sku, priceId] of prices) {
      if (!priceId) continue;
      checked = true;
      try {
        const price = await this.stripe.prices.retrieve(priceId);
        if (price.livemode !== live || !price.active) {
          ok = false;
          this.fail(
            'pro_price',
            `${sku} price ${priceId} is ${price.livemode ? 'live' : 'test'}${price.active ? '' : ' and inactive'}, key is ${live ? 'live' : 'test'}`,
          );
          continue;
        }
      } catch (err) {
        ok = false;
        this.fail(
          'pro_price',
          `${sku} price ${priceId} not found with the ${live ? 'live' : 'test'} key: ${(err as Error).message}`,
        );
        continue;
      }
      await this.dataSource.query(
        `UPDATE products SET stripe_price_id = $2
         WHERE sku = $1 AND stripe_price_id IS DISTINCT FROM $2`,
        [sku, priceId],
      );
    }
    this.proPriceOk = checked ? ok : null;
  }

  private fail(check: string, message: string): void {
    this.errors.add(1, { check });
    this.logger.error(message);
  }
}
