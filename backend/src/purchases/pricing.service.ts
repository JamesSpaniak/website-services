import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { metrics } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import { Stripe } from 'stripe';
import { stripeKeyMode } from './stripe-config.service';
import {
  AdminPriceRow,
  AdminPricingOverview,
  AdminPromotionRow,
  PublicPrice,
  PublicPricing,
  PublicPromotion,
} from './types/pricing.dto';

const PRICE_TTL_MS = 5 * 60_000;
const PROMO_TTL_MS = 60_000;
/** Promotion-code metadata flag for the site-wide sale (§ 4). */
export const SITE_SALE_METADATA = 'site_sale';
const PRO_MONTHLY = 'PRO_MONTHLY';

export interface ResolvedPrice {
  sku: string;
  priceId: string;
  productId: string;
  unitAmountCents: number;
  interval: 'month' | 'year' | null;
}

/** The discount checkout should pre-apply for one product. */
export interface DiscountChoice {
  promotionCodeId: string;
  code: string;
  source: 'code' | 'sale';
  discountCents: number;
}

interface ProductRow {
  sku: string;
  name: string;
  product_type: string;
  related_course_id: number | null;
  stripe_lookup_key: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  list_price_cents: number;
  active: boolean;
  price_synced_at: Date | null;
}

interface Cached<T> {
  value: T;
  at: number;
}

/**
 * Stripe owns prices and discounts; this service reads them for checkout and
 * the site, and keeps our catalog copy in step (docs/tech/pricing-and-promotions.md).
 *
 * Everything degrades to the inline course price and Stripe's own promo box:
 * a missing lookup key, an invalid Stripe price or a Stripe outage never
 * blocks checkout.
 */
@Injectable()
export class PricingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PricingService.name);
  private readonly configErrors = metrics
    .getMeter('droneedge')
    .createCounter('stripe.config_errors', {
      description: 'Stripe configuration problems found at boot',
    });
  private readonly prices = new Map<string, Cached<ResolvedPrice | null>>();
  private readonly problems = new Map<string, string>();
  private readonly promoByCode = new Map<
    string,
    Cached<Stripe.PromotionCode | null>
  >();
  private readonly codeById = new Map<string, string>();
  private sale: Cached<Stripe.PromotionCode | null> | null = null;

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    if (this.mode() === 'unset') return;
    void this.syncAll().catch((err) =>
      this.logger.error(`Price sync at boot failed: ${(err as Error).message}`),
    );
  }

  // ── prices ──────────────────────────────────────────────────────────────

  /**
   * The Stripe Price checkout should use for `sku`, or null for the inline
   * fallback. Cached for 5 minutes; `force` re-reads Stripe.
   */
  async resolvePrice(sku: string, force = false): Promise<ResolvedPrice | null> {
    const hit = this.prices.get(sku);
    if (!force && hit && Date.now() - hit.at < PRICE_TTL_MS) return hit.value;
    let value: ResolvedPrice | null = null;
    try {
      value = await this.fetchAndSync(sku);
    } catch (err) {
      this.problem(sku, `Stripe price lookup failed: ${(err as Error).message}`);
    }
    this.prices.set(sku, { value, at: Date.now() });
    return value;
  }

  /** Re-reads every linked product from Stripe and syncs the catalog. */
  async syncAll(): Promise<void> {
    const rows = await this.productRows();
    for (const row of rows) {
      if (row.stripe_lookup_key || this.envPriceId(row.sku)) {
        await this.resolvePrice(row.sku, true);
      }
    }
    this.sale = null;
    this.promoByCode.clear();
  }

  async setLookupKey(sku: string, key: string | null): Promise<void> {
    const rows: { sku: string }[] = await this.dataSource.query(
      `UPDATE products SET stripe_lookup_key = $2, updated_at = now() WHERE sku = $1 RETURNING sku`,
      [sku, key],
    );
    if (!rows.length) throw new NotFoundException(`Product ${sku} not found.`);
    if (!key) {
      await this.dataSource.query(
        `UPDATE products SET stripe_product_id = NULL WHERE sku = $1`,
        [sku],
      );
      this.problems.delete(sku);
    }
    await this.resolvePrice(sku, true);
  }

  private async fetchAndSync(sku: string): Promise<ResolvedPrice | null> {
    const row = (await this.productRows(sku))[0];
    if (!row || !row.active) return null;

    let price: Stripe.Price | null = null;
    if (row.stripe_lookup_key) {
      const { data } = await this.stripe.prices.list({
        lookup_keys: [row.stripe_lookup_key],
        active: true,
        limit: 1,
        expand: ['data.product'],
      });
      price = data[0] ?? null;
      if (!price) {
        this.problem(
          sku,
          `No active Stripe price has lookup key "${row.stripe_lookup_key}" in ${this.mode()} mode.`,
        );
        return null;
      }
    } else {
      const envId = this.envPriceId(sku);
      if (!envId) {
        this.problems.delete(sku);
        return null; // inline course price — not a problem
      }
      price = await this.stripe.prices.retrieve(envId, { expand: ['product'] });
    }

    const problem = this.validate(row, price);
    if (problem) {
      this.problem(sku, problem);
      return null;
    }
    this.problems.delete(sku);
    const product = price.product as Stripe.Product;
    const resolved: ResolvedPrice = {
      sku,
      priceId: price.id,
      productId: product.id,
      unitAmountCents: price.unit_amount ?? 0,
      interval:
        price.recurring?.interval === 'year'
          ? 'year'
          : price.recurring?.interval === 'month'
            ? 'month'
            : null,
    };
    await this.writeSync(row, resolved);
    return resolved;
  }

  private validate(row: ProductRow, price: Stripe.Price): string | null {
    const live = this.mode() === 'live';
    if (price.livemode !== live) {
      return `Price ${price.id} is ${price.livemode ? 'live' : 'test'} but the key is ${live ? 'live' : 'test'}.`;
    }
    if (!price.active) return `Price ${price.id} is inactive.`;
    if (price.currency !== 'usd') return `Price ${price.id} is ${price.currency}, expected usd.`;
    if (price.unit_amount == null) return `Price ${price.id} has no fixed amount.`;
    const recurring = !!price.recurring;
    if (row.product_type === 'course' && recurring) {
      return `Price ${price.id} is recurring; a course needs a one-time price.`;
    }
    if (row.product_type.startsWith('pro') && !recurring) {
      return `Price ${price.id} is one-time; Pro needs a recurring price.`;
    }
    const product = price.product;
    if (typeof product === 'string' || 'deleted' in product) {
      return `Price ${price.id} has no product.`;
    }
    if (!product.active) return `Product ${product.id} is archived.`;
    if (this.managedPayments() && !product.tax_code) {
      return `Product ${product.id} has no tax code (Managed Payments needs one, e.g. txcd_10000000).`;
    }
    return null;
  }

  /** Writes Stripe's values onto our catalog rows; logs any drift it corrects. */
  private async writeSync(row: ProductRow, p: ResolvedPrice): Promise<void> {
    if (
      row.list_price_cents !== p.unitAmountCents ||
      row.stripe_price_id !== p.priceId
    ) {
      this.logger.warn(
        `pricing.drift_corrected ${row.sku}: site ${row.list_price_cents}¢ / ${row.stripe_price_id ?? 'no price'} → Stripe ${p.unitAmountCents}¢ / ${p.priceId}`,
      );
    }
    try {
      await this.dataSource.query(
        `UPDATE products
         SET stripe_price_id = $2, stripe_product_id = $3, list_price_cents = $4,
             price_synced_at = now(), updated_at = now()
         WHERE sku = $1`,
        [row.sku, p.priceId, p.productId, p.unitAmountCents],
      );
    } catch (err) {
      // UQ_products_stripe_price: the same Stripe price is linked twice.
      this.problem(row.sku, `Could not save price ${p.priceId}: ${(err as Error).message}`);
      return;
    }
    if (row.product_type === 'course' && row.related_course_id) {
      await this.dataSource.query(
        `UPDATE courses SET price = $2 WHERE id = $1 AND price IS DISTINCT FROM $2`,
        [row.related_course_id, p.unitAmountCents / 100],
      );
    }
  }

  // ── promotions ──────────────────────────────────────────────────────────

  /** Active Stripe promotion code for a customer-facing code (case-insensitive in Stripe). */
  async findPromotion(code: string): Promise<Stripe.PromotionCode | null> {
    const key = code.trim().toUpperCase();
    if (!key) return null;
    const hit = this.promoByCode.get(key);
    if (hit && Date.now() - hit.at < PROMO_TTL_MS) return hit.value;
    let value: Stripe.PromotionCode | null = null;
    try {
      const { data } = await this.stripe.promotionCodes.list({
        code: key,
        active: true,
        limit: 1,
        expand: ['data.coupon.applies_to'],
      });
      value = data[0] && this.usable(data[0]) ? data[0] : null;
    } catch (err) {
      this.logger.warn(`Promo code lookup failed: ${(err as Error).message}`);
    }
    this.promoByCode.set(key, { value, at: Date.now() });
    return value;
  }

  /** Newest active promotion code flagged `site_sale = true`. */
  async activeSale(): Promise<Stripe.PromotionCode | null> {
    if (this.sale && Date.now() - this.sale.at < PROMO_TTL_MS) return this.sale.value;
    let value: Stripe.PromotionCode | null = null;
    try {
      const { data } = await this.stripe.promotionCodes.list({
        active: true,
        limit: 100,
        expand: ['data.coupon.applies_to'],
      });
      value =
        data
          .filter((p) => isSiteSale(p) && this.usable(p))
          .sort((a, b) => b.created - a.created)[0] ?? null;
    } catch (err) {
      this.logger.warn(`Site sale lookup failed: ${(err as Error).message}`);
    }
    this.sale = { value, at: Date.now() };
    return value;
  }

  /** Best discount for `sku`: the buyer's code or the site sale, whichever saves more (ties: buyer). */
  async chooseDiscount(
    sku: string,
    buyerCode?: string | null,
  ): Promise<DiscountChoice | null> {
    const quote = await this.quoteInternal(sku, buyerCode);
    return quote?.choice ?? null;
  }

  async publicPricing(buyerCode?: string | null): Promise<PublicPricing> {
    const courses: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM courses WHERE price > 0 AND NOT hidden ORDER BY id`,
    );
    const products: Record<string, PublicPrice> = {};
    const skus = [...courses.map((c) => `COURSE_${c.id}`), PRO_MONTHLY];
    for (const sku of skus) {
      const q = await this.quoteInternal(sku, buyerCode);
      if (q) products[sku] = q.price;
    }
    const sale = await this.activeSale();
    return {
      sale: sale
        ? { code: sale.code, label: discountLabel(sale.coupon), ends_at: endsAt(sale) }
        : null,
      products,
    };
  }

  private async quoteInternal(
    sku: string,
    buyerCode?: string | null,
  ): Promise<{ price: PublicPrice; choice: DiscountChoice | null } | null> {
    const resolved = await this.resolvePrice(sku);
    const row = (await this.productRows(sku))[0];
    let listCents = resolved?.unitAmountCents ?? null;
    let courseId: number | null = row?.related_course_id ?? null;
    const courseMatch = /^COURSE_(\d+)$/.exec(sku);
    if (listCents == null && courseMatch) {
      courseId = Number(courseMatch[1]);
      const [course]: { price: string | null }[] = await this.dataSource.query(
        `SELECT price FROM courses WHERE id = $1`,
        [courseId],
      );
      listCents = course ? Math.round(Number(course.price ?? 0) * 100) : null;
    }
    if (!listCents) return null; // unpriced, or Pro not configured

    const candidates: { promo: Stripe.PromotionCode; source: 'code' | 'sale' }[] = [];
    const buyer = buyerCode ? await this.findPromotion(buyerCode) : null;
    if (buyer) candidates.push({ promo: buyer, source: 'code' });
    const sale = await this.activeSale();
    if (sale && sale.id !== buyer?.id) candidates.push({ promo: sale, source: 'sale' });

    let best: { promo: Stripe.PromotionCode; source: 'code' | 'sale'; off: number } | null = null;
    for (const c of candidates) {
      const off = discountCents(c.promo, listCents, resolved?.productId ?? null);
      if (off > 0 && (!best || off > best.off)) best = { ...c, off };
    }

    const promotion: PublicPromotion | null = best
      ? {
          code: best.promo.code,
          source: best.source,
          label: discountLabel(best.promo.coupon),
          ends_at: endsAt(best.promo),
          duration: best.promo.coupon.duration,
          duration_in_months: best.promo.coupon.duration_in_months ?? null,
        }
      : null;
    return {
      price: {
        sku,
        course_id: courseId,
        list_cents: listCents,
        final_cents: listCents - (best?.off ?? 0),
        interval: resolved?.interval ?? (sku.startsWith('PRO_') ? 'month' : null),
        promotion,
      },
      choice: best
        ? {
            promotionCodeId: best.promo.id,
            code: best.promo.code,
            source: best.source,
            discountCents: best.off,
          }
        : null,
    };
  }

  // ── reporting ───────────────────────────────────────────────────────────

  /**
   * Records a completed Checkout Session with its promotion code (from
   * `checkout.session.completed`). Idempotent on the session id; never throws.
   */
  async recordCompletion(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const discount = session.discounts?.[0];
      const promotionCodeId = idOf(discount?.promotion_code);
      const couponId = idOf(discount?.coupon);
      const code = promotionCodeId ? await this.codeFor(promotionCodeId) : null;
      const meta = session.metadata ?? {};
      const source = !promotionCodeId
        ? null
        : meta.promo_code && code && meta.promo_code.toUpperCase() === code.toUpperCase()
          ? (meta.promo_source ?? 'code')
          : 'checkout';
      const sku =
        meta.productType === 'course' && meta.courseId
          ? `COURSE_${meta.courseId}`
          : meta.productType === 'pro'
            ? meta.duration === 'yearly'
              ? 'PRO_YEARLY'
              : PRO_MONTHLY
            : null;
      const userId = Number(meta.userId || session.client_reference_id) || null;
      await this.dataSource.query(
        `INSERT INTO checkout_completions
           (stripe_checkout_session_id, user_id, mode, sku, promotion_code_id, promotion_code, coupon_id,
            promo_source, amount_subtotal_cents, amount_discount_cents, amount_tax_cents, amount_total_cents,
            currency, stripe_payment_intent_id, stripe_subscription_id, stripe_invoice_id, completed_at)
         VALUES ($1, (SELECT id FROM users WHERE id = $2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16, to_timestamp($17))
         ON CONFLICT (stripe_checkout_session_id) DO NOTHING`,
        [
          session.id,
          userId,
          session.mode,
          sku,
          promotionCodeId,
          code,
          couponId,
          source,
          session.amount_subtotal ?? 0,
          session.total_details?.amount_discount ?? 0,
          session.total_details?.amount_tax ?? 0,
          session.amount_total ?? 0,
          session.currency ?? 'usd',
          idOf(session.payment_intent),
          idOf(session.subscription),
          idOf(session.invoice),
          session.created,
        ],
      );
    } catch (err) {
      this.logger.error(
        `Failed to record checkout completion ${session.id}: ${(err as Error).message}`,
      );
    }
  }

  async adminOverview(): Promise<AdminPricingOverview> {
    const mode = this.mode();
    const rows = await this.productRows();
    const productSku = new Map(
      rows.filter((r) => r.stripe_product_id).map((r) => [r.stripe_product_id as string, r.sku]),
    );
    const dash = `https://dashboard.stripe.com/${mode === 'live' ? '' : 'test/'}`;

    const prices: AdminPriceRow[] = [];
    for (const row of rows) {
      if (!row.active) continue;
      const isCourse = row.product_type === 'course';
      const isPro = row.sku === PRO_MONTHLY;
      if (!isCourse && !isPro) continue;
      const resolved = await this.resolvePrice(row.sku);
      const fresh = (await this.productRows(row.sku))[0] ?? row;
      let siteCents = fresh.list_price_cents;
      if (isCourse && row.related_course_id) {
        const [c]: { price: string | null; hidden: boolean }[] = await this.dataSource.query(
          `SELECT price, hidden FROM courses WHERE id = $1`,
          [row.related_course_id],
        );
        if (!c || c.hidden || !Number(c.price)) continue;
        siteCents = Math.round(Number(c.price) * 100);
      }
      const source: AdminPriceRow['source'] = resolved
        ? row.stripe_lookup_key
          ? 'stripe'
          : 'env'
        : 'inline';
      prices.push({
        sku: row.sku,
        name: row.name,
        product_type: row.product_type,
        course_id: row.related_course_id,
        source,
        stripe_lookup_key: fresh.stripe_lookup_key,
        stripe_price_id: resolved?.priceId ?? null,
        stripe_product_id: resolved?.productId ?? null,
        stripe_amount_cents: resolved?.unitAmountCents ?? null,
        site_amount_cents: siteCents,
        in_sync: !resolved || resolved.unitAmountCents === siteCents,
        price_synced_at: fresh.price_synced_at ? new Date(fresh.price_synced_at).toISOString() : null,
        problem: this.problems.get(row.sku) ?? null,
        dashboard_url: resolved ? `${dash}products/${resolved.productId}` : null,
      });
    }

    let promos: Stripe.PromotionCode[] = [];
    try {
      const { data } = await this.stripe.promotionCodes.list({
        limit: 100,
        expand: ['data.coupon.applies_to'],
      });
      promos = data;
    } catch (err) {
      this.logger.warn(`Promotion code list failed: ${(err as Error).message}`);
    }
    const stats: {
      promotion_code_id: string | null;
      checkouts: string;
      discount_cents: string;
      revenue_cents: string;
      refunds: string;
      refunded_cents: string;
    }[] = await this.dataSource.query(`
      SELECT cc.promotion_code_id,
             COUNT(*) AS checkouts,
             COALESCE(SUM(cc.amount_discount_cents), 0) AS discount_cents,
             COALESCE(SUM(cc.amount_total_cents), 0) AS revenue_cents,
             COUNT(o.id) FILTER (WHERE o.refunded_cents > 0) AS refunds,
             COALESCE(SUM(o.refunded_cents), 0) AS refunded_cents
      FROM checkout_completions cc
      LEFT JOIN orders o
        ON (cc.stripe_payment_intent_id IS NOT NULL AND o.stripe_payment_intent_id = cc.stripe_payment_intent_id)
        OR (cc.stripe_invoice_id IS NOT NULL AND o.stripe_invoice_id = cc.stripe_invoice_id)
      GROUP BY cc.promotion_code_id`);
    const statBy = new Map(stats.map((s) => [s.promotion_code_id, s]));
    const toStats = (id: string | null) => {
      const s = statBy.get(id);
      return {
        checkouts: Number(s?.checkouts ?? 0),
        discount_cents: Number(s?.discount_cents ?? 0),
        revenue_cents: Number(s?.revenue_cents ?? 0),
        refunds: Number(s?.refunds ?? 0),
        refunded_cents: Number(s?.refunded_cents ?? 0),
      };
    };
    const sale = await this.activeSale();
    const toRow = (p: Stripe.PromotionCode): AdminPromotionRow => ({
      id: p.id,
      code: p.code,
      active: p.active && this.usable(p),
      site_sale: isSiteSale(p),
      coupon_id: p.coupon.id,
      coupon_name: p.coupon.name ?? null,
      label: discountLabel(p.coupon),
      percent_off: p.coupon.percent_off ?? null,
      amount_off_cents: p.coupon.amount_off ?? null,
      duration: p.coupon.duration,
      duration_in_months: p.coupon.duration_in_months ?? null,
      applies_to: (p.coupon.applies_to?.products ?? []).map((id) => productSku.get(id) ?? id),
      first_time_only: !!p.restrictions?.first_time_transaction,
      minimum_amount_cents: p.restrictions?.minimum_amount ?? null,
      expires_at: endsAt(p),
      max_redemptions: p.max_redemptions ?? null,
      times_redeemed: p.times_redeemed,
      created_at: new Date(p.created * 1000).toISOString(),
      dashboard_url: `${dash}coupons/${p.coupon.id}`,
      stats: toStats(p.id),
    });

    const [links]: { active: string; redemptions: string }[] = await this.dataSource.query(`
      SELECT COUNT(*) FILTER (WHERE expires_at > now() AND (max_uses IS NULL OR use_count < max_uses)) AS active,
             COALESCE(SUM(use_count), 0) AS redemptions
      FROM signup_links`);
    const full = toStats(null);

    return {
      mode: mode === 'unset' ? 'unset' : mode,
      managed_payments: this.managedPayments(),
      prices,
      sale: sale ? toRow(sale) : null,
      promotions: promos.map(toRow),
      full_price: { checkouts: full.checkouts, revenue_cents: full.revenue_cents },
      signup_links: { active: Number(links?.active ?? 0), redemptions: Number(links?.redemptions ?? 0) },
      stripe_dashboard_url: `${dash}coupons`,
    };
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private async codeFor(promotionCodeId: string): Promise<string | null> {
    const hit = this.codeById.get(promotionCodeId);
    if (hit) return hit;
    try {
      const p = await this.stripe.promotionCodes.retrieve(promotionCodeId);
      this.codeById.set(promotionCodeId, p.code);
      return p.code;
    } catch {
      return null;
    }
  }

  private usable(p: Stripe.PromotionCode): boolean {
    const now = Date.now() / 1000;
    if (!p.active || !p.coupon?.valid) return false;
    if (p.expires_at && p.expires_at <= now) return false;
    if (p.coupon.redeem_by && p.coupon.redeem_by <= now) return false;
    if (p.max_redemptions != null && p.times_redeemed >= p.max_redemptions) return false;
    return true;
  }

  private async productRows(sku?: string): Promise<ProductRow[]> {
    return this.dataSource.query(
      `SELECT sku, name, product_type, related_course_id, stripe_lookup_key, stripe_price_id,
              stripe_product_id, list_price_cents, active, price_synced_at
       FROM products ${sku ? 'WHERE sku = $1' : ''} ORDER BY sku`,
      sku ? [sku] : [],
    );
  }

  private envPriceId(sku: string): string | undefined {
    if (sku === PRO_MONTHLY) {
      return this.configService.get<string>('STRIPE_PRO_PRICE_ID_MONTHLY') || undefined;
    }
    if (sku === 'PRO_YEARLY') {
      return this.configService.get<string>('STRIPE_PRO_PRICE_ID_YEARLY') || undefined;
    }
    return undefined;
  }

  private mode() {
    return stripeKeyMode(this.configService.get('STRIPE_SECRET_KEY'));
  }

  private managedPayments(): boolean {
    return this.configService.get<string>('STRIPE_MANAGED_PAYMENTS')?.toLowerCase() === 'true';
  }

  private problem(sku: string, message: string): void {
    if (this.problems.get(sku) !== message) {
      this.configErrors.add(1, { check: 'product_price' });
      this.logger.error(`${sku}: ${message}`);
    }
    this.problems.set(sku, message);
  }
}

function idOf(v: string | { id?: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : (v.id ?? null);
}

function isSiteSale(p: Stripe.PromotionCode): boolean {
  return (
    p.metadata?.[SITE_SALE_METADATA]?.toLowerCase() === 'true' ||
    p.coupon?.metadata?.[SITE_SALE_METADATA]?.toLowerCase() === 'true'
  );
}

/** Cents off `amountCents` for a product, honouring applies_to and minimum amount. */
export function discountCents(
  p: Stripe.PromotionCode,
  amountCents: number,
  stripeProductId: string | null,
): number {
  const c = p.coupon;
  const limited = c.applies_to?.products ?? [];
  if (limited.length && (!stripeProductId || !limited.includes(stripeProductId))) return 0;
  const min = p.restrictions?.minimum_amount;
  if (min && amountCents < min) return 0;
  if (c.percent_off) return Math.round((amountCents * c.percent_off) / 100);
  if (c.amount_off && (c.currency ?? 'usd') === 'usd') return Math.min(c.amount_off, amountCents);
  return 0;
}

export function discountLabel(c: Stripe.Coupon): string {
  if (c.percent_off) return `${Number(c.percent_off.toFixed(2))}% off`;
  if (c.amount_off) {
    const dollars = c.amount_off / 100;
    return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)} off`;
  }
  return c.name ?? 'Discount';
}

function endsAt(p: Stripe.PromotionCode): string | null {
  const ends = [p.expires_at, p.coupon.redeem_by].filter((t): t is number => !!t);
  return ends.length ? new Date(Math.min(...ends) * 1000).toISOString() : null;
}
