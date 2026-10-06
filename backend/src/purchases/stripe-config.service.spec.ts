import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Stripe } from 'stripe';
import { StripeConfigService, stripeKeyMode } from './stripe-config.service';

/** Live-key cutover guard (docs/tech/stripe-sandbox-test-plan.md § 8). */
describe('StripeConfigService', () => {
  const make = (env: Record<string, string>, retrieve = jest.fn()) => {
    const query = jest.fn(async () => []);
    const service = new StripeConfigService(
      { prices: { retrieve } } as unknown as Stripe,
      { get: (k: string) => env[k] } as unknown as ConfigService,
      { query } as unknown as DataSource,
    );
    return { service, retrieve, query };
  };

  it('reads the mode from the key prefix', () => {
    expect(stripeKeyMode('sk_live_abc')).toBe('live');
    expect(stripeKeyMode('rk_live_abc')).toBe('live');
    expect(stripeKeyMode('pk_test_abc')).toBe('test');
    expect(stripeKeyMode('')).toBe('unset');
    expect(stripeKeyMode('whsec_abc')).toBe('unset');
  });

  it('refuses to boot with a live secret key and a test publishable key', () => {
    const { service } = make({
      STRIPE_SECRET_KEY: 'sk_live_x',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_x',
    });
    expect(() => service.onApplicationBootstrap()).toThrow(/mode mismatch/);
  });

  it('boots when both keys are in the same mode (or one is unset)', () => {
    expect(() =>
      make({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_x',
      }).service.onApplicationBootstrap(),
    ).not.toThrow();
    expect(() =>
      make({ STRIPE_SECRET_KEY: 'sk_live_x' }).service.onApplicationBootstrap(),
    ).not.toThrow();
  });

  it('accepts a live Pro price with a live key and points the catalog at it', async () => {
    const { service, query } = make(
      {
        STRIPE_SECRET_KEY: 'sk_live_x',
        STRIPE_PRO_PRICE_ID_MONTHLY: 'price_live',
      },
      jest.fn(async () => ({ livemode: true, active: true })),
    );
    await service.checkProPrices();
    expect(service.status()).toEqual({
      mode: 'live',
      webhook_secret: false,
      pro_price_ok: true,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE products'),
      ['PRO_MONTHLY', 'price_live'],
    );
  });

  it('flags a sandbox price left in place after switching to the live key', async () => {
    const { service, query } = make(
      {
        STRIPE_SECRET_KEY: 'sk_live_x',
        STRIPE_PRO_PRICE_ID_MONTHLY: 'price_test',
      },
      jest.fn(async () => {
        throw new Error('No such price');
      }),
    );
    await service.checkProPrices();
    expect(service.status().pro_price_ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('flags a price in the wrong mode', async () => {
    const { service } = make(
      {
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_PRO_PRICE_ID_MONTHLY: 'price_x',
      },
      jest.fn(async () => ({ livemode: true, active: true })),
    );
    await service.checkProPrices();
    expect(service.status().pro_price_ok).toBe(false);
  });
});
