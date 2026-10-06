'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/app/lib/analytics';

/** Fires `pricing_viewed` once per mount of /pricing (ref guards Strict Mode double effects). */
export default function PricingViewTracker() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track('pricing_viewed', { path: '/pricing' });
  }, []);
  return null;
}
