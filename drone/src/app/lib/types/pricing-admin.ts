/** Mirrors backend `AdminPricingOverview` (backend/src/purchases/types/pricing.dto.ts). */

export interface AdminPriceRow {
    sku: string;
    name: string;
    product_type: string;
    course_id: number | null;
    /** `stripe` = linked by lookup key, `env` = Pro price id from config, `inline` = from courses.price. */
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
    full_price: { checkouts: number; revenue_cents: number };
    signup_links: { active: number; redemptions: number };
    stripe_dashboard_url: string;
}
