import { PricingService, discountCents, discountLabel } from './pricing.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const now = () => Math.floor(Date.now() / 1000);

const promo = (over: Record<string, unknown> = {}): Any => ({
  id: 'promo_1',
  code: 'EDGE25',
  active: true,
  times_redeemed: 0,
  max_redemptions: null,
  expires_at: null,
  created: 100,
  metadata: {},
  restrictions: {},
  coupon: { id: 'co_1', valid: true, percent_off: 25, duration: 'once', metadata: {}, applies_to: undefined },
  ...over,
});

const courseRow = (over: Record<string, unknown> = {}) => ({
  sku: 'COURSE_35',
  name: 'Part 107',
  product_type: 'course',
  related_course_id: 35,
  stripe_lookup_key: 'part107_course',
  stripe_price_id: null,
  stripe_product_id: null,
  list_price_cents: 12900,
  active: true,
  price_synced_at: null,
  ...over,
});

const stripePrice = (over: Record<string, unknown> = {}): Any => ({
  id: 'price_course',
  active: true,
  livemode: true,
  currency: 'usd',
  unit_amount: 12900,
  recurring: null,
  product: { id: 'prod_course', active: true, tax_code: 'txcd_10000000' },
  ...over,
});

describe('PricingService', () => {
  let rows: Record<string, unknown>[];
  let config: Record<string, string>;
  const queries: { sql: string; params: unknown[] }[] = [];
  const dataSource = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes('FROM products')) {
        return params[0] ? rows.filter((r) => r.sku === params[0]) : rows;
      }
      if (sql.includes('SELECT id FROM courses')) return [{ id: 35 }];
      if (sql.includes('FROM courses WHERE id')) return [{ price: '129.00', hidden: false }];
      return [];
    }),
  };
  const stripe = {
    prices: { list: jest.fn(), retrieve: jest.fn() },
    promotionCodes: { list: jest.fn(), retrieve: jest.fn() },
  };
  let service: PricingService;

  beforeEach(() => {
    jest.clearAllMocks();
    queries.length = 0;
    rows = [courseRow()];
    config = { STRIPE_SECRET_KEY: 'sk_live_x', STRIPE_MANAGED_PAYMENTS: 'true' };
    stripe.prices.list.mockResolvedValue({ data: [stripePrice()] });
    stripe.promotionCodes.list.mockResolvedValue({ data: [] });
    service = new PricingService(
      stripe as Any,
      { get: (k: string) => config[k] } as Any,
      dataSource as Any,
    );
  });

  describe('discountCents', () => {
    it('applies percent and amount coupons, capped at the price', () => {
      expect(discountCents(promo(), 12900, null)).toBe(3225);
      const fifty = promo({ coupon: { valid: true, amount_off: 5000, currency: 'usd' } });
      expect(discountCents(fifty, 12900, null)).toBe(5000);
      expect(discountCents(fifty, 3500, null)).toBe(3500);
    });

    it('honours applies_to: never applies to an inline (unlinked) price', () => {
      const courseOnly = promo({
        coupon: { valid: true, percent_off: 25, applies_to: { products: ['prod_course'] } },
      });
      expect(discountCents(courseOnly, 12900, 'prod_course')).toBe(3225);
      expect(discountCents(courseOnly, 3500, 'prod_pro')).toBe(0);
      expect(discountCents(courseOnly, 12900, null)).toBe(0);
    });

    it('honours the minimum amount', () => {
      const min = promo({ restrictions: { minimum_amount: 5000 } });
      expect(discountCents(min, 3500, null)).toBe(0);
      expect(discountCents(min, 12900, null)).toBe(3225);
    });

    it('labels discounts for the site', () => {
      expect(discountLabel({ percent_off: 25 } as Any)).toBe('25% off');
      expect(discountLabel({ percent_off: 38.76 } as Any)).toBe('38.76% off');
      expect(discountLabel({ amount_off: 5000 } as Any)).toBe('$50 off');
      expect(discountLabel({ amount_off: 1250 } as Any)).toBe('$12.50 off');
    });
  });

  describe('resolvePrice / sync', () => {
    it('resolves by lookup key and writes Stripe values onto products and courses', async () => {
      stripe.prices.list.mockResolvedValue({ data: [stripePrice({ unit_amount: 9900 })] });
      const p = await service.resolvePrice('COURSE_35');
      expect(p).toEqual({ sku: 'COURSE_35', priceId: 'price_course', productId: 'prod_course', unitAmountCents: 9900, interval: null });
      expect(stripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ lookup_keys: ['part107_course'], active: true }),
      );
      const productUpdate = queries.find((q) => q.sql.includes('UPDATE products'));
      expect(productUpdate?.params).toEqual(['COURSE_35', 'price_course', 'prod_course', 9900]);
      const courseUpdate = queries.find((q) => q.sql.includes('UPDATE courses SET price'));
      expect(courseUpdate?.params).toEqual([35, 99]);
    });

    it('caches for 5 minutes, force re-reads', async () => {
      await service.resolvePrice('COURSE_35');
      await service.resolvePrice('COURSE_35');
      expect(stripe.prices.list).toHaveBeenCalledTimes(1);
      await service.resolvePrice('COURSE_35', true);
      expect(stripe.prices.list).toHaveBeenCalledTimes(2);
    });

    it('falls back to inline (null, no problem) for an unlinked course', async () => {
      rows = [courseRow({ stripe_lookup_key: null })];
      expect(await service.resolvePrice('COURSE_35')).toBeNull();
      expect(stripe.prices.list).not.toHaveBeenCalled();
    });

    it.each([
      ['a test price under a live key', { livemode: false }, /test but the key is live/],
      ['a recurring price for a course', { recurring: { interval: 'month' } }, /recurring/],
      ['a product without a tax code under Managed Payments', { product: { id: 'prod_course', active: true, tax_code: null } }, /tax code/],
      ['an archived product', { product: { id: 'prod_course', active: false, tax_code: 'txcd_10000000' } }, /archived/],
    ])('rejects %s and falls back to inline', async (_label, over, problem) => {
      stripe.prices.list.mockResolvedValue({ data: [stripePrice(over)] });
      expect(await service.resolvePrice('COURSE_35')).toBeNull();
      const overview = await service.adminOverview();
      expect(overview.prices[0].problem).toMatch(problem as RegExp);
      expect(overview.prices[0].source).toBe('inline');
    });

    it('reports a missing lookup key price', async () => {
      stripe.prices.list.mockResolvedValue({ data: [] });
      expect(await service.resolvePrice('COURSE_35')).toBeNull();
      const overview = await service.adminOverview();
      expect(overview.prices[0].problem).toMatch(/No active Stripe price has lookup key "part107_course"/);
    });

    it('falls back cleanly when Stripe is down', async () => {
      stripe.prices.list.mockRejectedValue(new Error('ECONNRESET'));
      expect(await service.resolvePrice('COURSE_35')).toBeNull();
    });

    it('uses the configured Pro price id when PRO_MONTHLY has no lookup key', async () => {
      rows = [{ ...courseRow(), sku: 'PRO_MONTHLY', product_type: 'pro_monthly', related_course_id: null, stripe_lookup_key: null }];
      config.STRIPE_PRO_PRICE_ID_MONTHLY = 'price_pro';
      stripe.prices.retrieve.mockResolvedValue(
        stripePrice({ id: 'price_pro', unit_amount: 3500, recurring: { interval: 'month' }, product: { id: 'prod_pro', active: true, tax_code: 'txcd_10000000' } }),
      );
      const p = await service.resolvePrice('PRO_MONTHLY');
      expect(stripe.prices.retrieve).toHaveBeenCalledWith('price_pro', { expand: ['product'] });
      expect(p?.interval).toBe('month');
    });
  });

  describe('promotions', () => {
    it('ignores expired, exhausted and invalid codes', async () => {
      for (const over of [
        { expires_at: now() - 10 },
        { max_redemptions: 5, times_redeemed: 5 },
        { coupon: { valid: false, percent_off: 25 } },
      ]) {
        stripe.promotionCodes.list.mockResolvedValueOnce({ data: [promo(over)] });
        expect(await service.findPromotion(`X${Math.random()}`.replace('.', ''))).toBeNull();
      }
    });

    it('picks the newest flagged site sale', async () => {
      stripe.promotionCodes.list.mockResolvedValue({
        data: [
          promo({ id: 'old', code: 'OLD', created: 1, metadata: { site_sale: 'true' } }),
          promo({ id: 'new', code: 'NEW', created: 2, metadata: { site_sale: 'true' } }),
          promo({ id: 'plain', code: 'PLAIN', created: 3 }),
        ],
      });
      expect((await service.activeSale())?.code).toBe('NEW');
    });

    it('quotes list and sale prices for the site, best offer wins', async () => {
      const sale = promo({
        id: 'sale',
        code: 'SALE79',
        metadata: { site_sale: 'true' },
        expires_at: now() + 86_400,
        coupon: { id: 'co_50', valid: true, amount_off: 5000, currency: 'usd', duration: 'once', metadata: {} },
      });
      stripe.promotionCodes.list.mockImplementation(async (args: Any) =>
        args.code ? { data: [promo()] } : { data: [sale] },
      );
      const pricing = await service.publicPricing('EDGE25');
      expect(pricing.sale).toEqual(expect.objectContaining({ code: 'SALE79', label: '$50 off' }));
      expect(pricing.products.COURSE_35).toEqual(
        expect.objectContaining({
          list_cents: 12900,
          final_cents: 7900,
          promotion: expect.objectContaining({ code: 'SALE79', source: 'sale' }),
        }),
      );
    });

    it('keeps the buyer code when it beats the sale', async () => {
      const sale = promo({ id: 'sale', code: 'SALE10', metadata: { site_sale: 'true' },
        coupon: { id: 'co_10', valid: true, percent_off: 10, duration: 'once', metadata: {} } });
      stripe.promotionCodes.list.mockImplementation(async (args: Any) =>
        args.code ? { data: [promo()] } : { data: [sale] },
      );
      const choice = await service.chooseDiscount('COURSE_35', 'edge25');
      expect(choice).toEqual({ promotionCodeId: 'promo_1', code: 'EDGE25', source: 'code', discountCents: 3225 });
    });
  });

  describe('recordCompletion', () => {
    const session = (over: Record<string, unknown> = {}): Any => ({
      id: 'cs_1',
      mode: 'payment',
      created: 1_790_000_000,
      client_reference_id: '7',
      metadata: { userId: '7', courseId: '35', productType: 'course', promo_code: 'EDGE25', promo_source: 'code' },
      discounts: [{ promotion_code: 'promo_1', coupon: 'co_1' }],
      amount_subtotal: 12900,
      amount_total: 10316,
      total_details: { amount_discount: 3225, amount_tax: 641 },
      currency: 'usd',
      payment_intent: 'pi_1',
      subscription: null,
      invoice: null,
      ...over,
    });

    it('stores the code, source and amounts', async () => {
      stripe.promotionCodes.retrieve.mockResolvedValue({ code: 'EDGE25' });
      await service.recordCompletion(session());
      const insert = queries.find((q) => q.sql.includes('INSERT INTO checkout_completions'));
      expect(insert?.params.slice(0, 12)).toEqual([
        'cs_1', 7, 'payment', 'COURSE_35', 'promo_1', 'EDGE25', 'co_1', 'code', 12900, 3225, 641, 10316,
      ]);
    });

    it('marks a code typed on Stripe page as source "checkout"', async () => {
      stripe.promotionCodes.retrieve.mockResolvedValue({ code: 'PODCAST' });
      await service.recordCompletion(session({ metadata: { userId: '7', courseId: '35', productType: 'course' } }));
      const insert = queries.find((q) => q.sql.includes('INSERT INTO checkout_completions'));
      expect(insert?.params[5]).toBe('PODCAST');
      expect(insert?.params[7]).toBe('checkout');
    });

    it('records a full-price Pro checkout with no promotion', async () => {
      await service.recordCompletion(
        session({ mode: 'subscription', metadata: { userId: '7', productType: 'pro', duration: 'monthly' }, discounts: [], subscription: 'sub_1', invoice: 'in_1', payment_intent: null }),
      );
      const insert = queries.find((q) => q.sql.includes('INSERT INTO checkout_completions'));
      expect(insert?.params.slice(2, 8)).toEqual(['subscription', 'PRO_MONTHLY', null, null, null, null]);
    });

    it('never throws', async () => {
      dataSource.query.mockRejectedValueOnce(new Error('db down'));
      await expect(service.recordCompletion(session({ discounts: [] }))).resolves.toBeUndefined();
    });
  });
});
