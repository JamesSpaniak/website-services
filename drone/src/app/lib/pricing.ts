/**
 * Prices and promotions read from Stripe through `GET /pricing`
 * (docs/tech/pricing-and-promotions.md § 6). Stripe is the source of truth;
 * the fallbacks below are only shown while the API is unreachable.
 */

export interface PublicPromotion {
  code: string;
  source: 'code' | 'sale';
  label: string;
  ends_at: string | null;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
}

export interface PublicPrice {
  sku: string;
  course_id: number | null;
  list_cents: number;
  final_cents: number;
  interval: 'month' | 'year' | null;
  promotion: PublicPromotion | null;
}

export interface PublicPricing {
  sale: { code: string; label: string; ends_at: string | null } | null;
  products: Record<string, PublicPrice>;
}

export const FALLBACK_COURSE_CENTS = 12900;
export const FALLBACK_PRO_CENTS = 3500;
export const PRO_SKU = 'PRO_MONTHLY';

export function courseSku(courseId: number): string {
  return `COURSE_${courseId}`;
}

/** $129, $96.75 */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

/** "Oct 20" — sale end dates in the buyer's locale. */
export function formatEndDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const API_BASE =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Server components: list prices plus the site sale (no buyer code — the
 * cookie is applied client-side by PriceText). Cached for 60 s.
 */
export async function fetchPricingServer(): Promise<PublicPricing | null> {
  try {
    const res = await fetch(`${API_BASE}/pricing`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as PublicPricing;
  } catch {
    return null;
  }
}

/** List price in cents for a SKU from a pricing response, or the fallback. */
export function listCents(pricing: PublicPricing | null, sku: string, fallback: number): number {
  return pricing?.products[sku]?.list_cents ?? fallback;
}
