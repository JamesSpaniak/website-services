import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

/** Discount the site shows and checkout pre-applies (docs/tech/pricing-and-promotions.md § 4). */
export interface PublicPromotion {
  code: string;
  /** `code` = the buyer's ?promo= code, `sale` = the active site sale. */
  source: 'code' | 'sale';
  /** e.g. "25% off", "$50 off". */
  label: string;
  ends_at: string | null;
  /** Subscriptions only: how long the discount lasts. */
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
}

export interface PublicPrice {
  sku: string;
  course_id: number | null;
  list_cents: number;
  /** After the promotion; for Pro, the first billing period. */
  final_cents: number;
  interval: 'month' | 'year' | null;
  promotion: PublicPromotion | null;
}

export interface PublicPricing {
  sale: { code: string; label: string; ends_at: string | null } | null;
  products: Record<string, PublicPrice>;
}

export interface AdminPriceRow {
  sku: string;
  name: string;
  product_type: string;
  course_id: number | null;
  /** `stripe` = linked Price, `env` = Pro price id from config, `inline` = price_data from courses.price. */
  source: 'stripe' | 'env' | 'inline';
  stripe_lookup_key: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  stripe_amount_cents: number | null;
  site_amount_cents: number;
  in_sync: boolean;
  price_synced_at: string | null;
  problem: string | null;
  dashboard_url: string | null;
}

export interface AdminPromotionRow {
  id: string;
  code: string;
  active: boolean;
  site_sale: boolean;
  coupon_id: string;
  coupon_name: string | null;
  label: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  duration: string;
  duration_in_months: number | null;
  /** SKUs the coupon is limited to; empty = every product. Unknown Stripe product ids are listed as-is. */
  applies_to: string[];
  first_time_only: boolean;
  minimum_amount_cents: number | null;
  expires_at: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
  created_at: string;
  dashboard_url: string;
  stats: {
    checkouts: number;
    discount_cents: number;
    revenue_cents: number;
    refunds: number;
    refunded_cents: number;
  };
}

export interface AdminPricingOverview {
  mode: 'live' | 'test' | 'unset';
  managed_payments: boolean;
  prices: AdminPriceRow[];
  sale: AdminPromotionRow | null;
  promotions: AdminPromotionRow[];
  /** Checkouts with no promotion code, for comparison. */
  full_price: { checkouts: number; revenue_cents: number };
  signup_links: { active: number; redemptions: number };
  stripe_dashboard_url: string;
}

export class PricingQueryDto {
  @ApiPropertyOptional({ description: 'Buyer promo code (from the de_promo cookie).' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  promo?: string;
}

export class SetLookupKeyDto {
  @ApiPropertyOptional({
    description: 'Stripe Price lookup key, e.g. "part107_course". null unlinks (inline price).',
    nullable: true,
    type: String,
  })
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_.:-]+$/)
  stripe_lookup_key: string | null;
}
