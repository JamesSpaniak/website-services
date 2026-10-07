import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoadingComponent from '../ui/components/loading';
import CheckoutClient from './checkout-client';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

/**
 * One-click checkout (TODO CK1): `/checkout?item=course-<id>` or `?item=pro`.
 * Every buy button links here; the client creates the Stripe Checkout session
 * on load and redirects. Never use this route as a Stripe `cancel_url` —
 * it would reopen checkout in a loop.
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <CheckoutClient />
    </Suspense>
  );
}
