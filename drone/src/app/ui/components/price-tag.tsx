'use client';

import { useEffect, useState } from 'react';
import { readPromoCode } from '@/app/lib/attribution';
import {
  PublicPrice,
  PublicPricing,
  formatCents,
  formatEndDate,
} from '@/app/lib/pricing';

// One request per page load (and per promo code), shared by every PriceText.
let cached: { key: string; promise: Promise<PublicPricing | null> } | null = null;

function loadPricing(): Promise<PublicPricing | null> {
  const promo = readPromoCode() ?? '';
  if (cached?.key === promo) return cached.promise;
  const url = promo ? `/api/pricing?promo=${encodeURIComponent(promo)}` : '/api/pricing';
  const promise = fetch(url)
    .then((res) => (res.ok ? (res.json() as Promise<PublicPricing>) : null))
    .catch(() => null);
  cached = { key: promo, promise };
  return promise;
}

/** Live pricing with the buyer's ?promo= code and the site sale applied; null until loaded. */
export function usePricing(): PublicPricing | null {
  const [pricing, setPricing] = useState<PublicPricing | null>(null);
  useEffect(() => {
    let alive = true;
    void loadPricing().then((p) => {
      if (alive) setPricing(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return pricing;
}

export function usePrice(sku: string): PublicPrice | null {
  return usePricing()?.products[sku] ?? null;
}

/**
 * A price for buttons and cards: "$129", or "~~$129~~ $79" while a promotion
 * applies. Renders `fallbackCents` until the live price loads (and if the API fails).
 */
export function PriceText({
  sku,
  fallbackCents,
  className,
}: {
  sku: string;
  fallbackCents: number;
  className?: string;
}) {
  const price = usePrice(sku);
  const list = price?.list_cents ?? fallbackCents;
  const final = price?.final_cents ?? list;
  if (final >= list) return <span className={className}>{formatCents(list)}</span>;
  return (
    // Reads as "$79 (was $129)"; the struck-through list price is visual only.
    <span className={className}>
      <s aria-hidden="true" className="opacity-60 font-normal">
        {formatCents(list)}
      </s>{' '}
      {formatCents(final)}
      <span className="sr-only"> (was {formatCents(list)})</span>
    </span>
  );
}

/** "SALE79 applied at checkout · ends Oct 20" under a price; nothing without a promotion. */
export function PromoNote({ sku, className }: { sku: string; className?: string }) {
  const price = usePrice(sku);
  const promo = price?.promotion;
  if (!price || !promo) return null;
  const pro = price.interval != null;
  const period =
    pro && promo.duration === 'once'
      ? ' on your first month'
      : pro && promo.duration === 'repeating' && promo.duration_in_months
        ? ` for ${promo.duration_in_months} months`
        : '';
  return (
    <p className={className ?? 'mt-1 text-xs font-medium text-[var(--brand-primary)]'}>
      {promo.label}
      {period} · <span className="font-mono">{promo.code}</span> applied at checkout
      {promo.ends_at ? ` · ends ${formatEndDate(promo.ends_at)}` : ''}
    </p>
  );
}
