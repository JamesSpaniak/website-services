'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '../ui/components/page-shell';
import { useAuth } from '@/app/lib/auth-context';
import { ApiError, createCourseCheckout, createProCheckout } from '@/app/lib/api-client';
import {
  CheckoutItem,
  checkoutPath,
  coursePath,
  coursePreviewPath,
  parseCheckoutItem,
  registerHref,
} from '@/app/lib/auth-redirect';
import { logger } from '@/app/lib/logger';

type Failure = { message: string; retry: boolean };

// Server refusals that mean "nothing to buy" — send the user where they already have access.
function alreadyHasAccess(err: unknown, item: CheckoutItem): string | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  const msg = err.message.toLowerCase();
  if (item.kind === 'course' && (msg.includes('already purchased') || msg.includes('pro membership already includes'))) {
    return coursePath(item.courseId);
  }
  if (item.kind === 'pro' && msg.includes('already have an active pro')) return '/profile';
  return null;
}

function failureFor(err: unknown, item: CheckoutItem): Failure {
  if (err instanceof ApiError) {
    if (err.status === 503 && item.kind === 'pro') {
      return { message: 'Pro membership is not available yet. Check back soon.', retry: false };
    }
    if (err.status === 404) {
      return { message: 'This course is not available for purchase.', retry: false };
    }
    if (err.status === 400 || err.status === 403) return { message: err.message, retry: false };
  }
  const message = err instanceof Error ? err.message : 'An unknown error occurred.';
  return { message: `Could not open checkout: ${message}`, retry: true };
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const itemParam = searchParams.get('item');
  const item = useMemo(() => parseCheckoutItem(itemParam), [itemParam]);
  const [failure, setFailure] = useState<Failure | null>(null);
  // Guards the one session we create per visit (StrictMode runs effects twice).
  const started = useRef(false);

  const start = useCallback(async (target: CheckoutItem) => {
    setFailure(null);
    try {
      const { url } =
        target.kind === 'course'
          ? await createCourseCheckout(target.courseId)
          : await createProCheckout({ duration: 'monthly', successPath: '/profile?pro=success', cancelPath: '/pricing' });
      window.location.href = url;
    } catch (err) {
      const destination = alreadyHasAccess(err, target);
      if (destination) {
        router.replace(destination);
        return;
      }
      logger.error(err as Error, { context: 'One-click checkout', item: checkoutPath(target) });
      setFailure(failureFor(err, target));
      started.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (!item || isLoading || started.current) return;
    started.current = true;
    if (!user) {
      // Register signs the user in and returns here, so checkout continues after signup.
      router.replace(registerHref(checkoutPath(item)));
      return;
    }
    void start(item);
  }, [item, isLoading, user, router, start]);

  if (!item) {
    return (
      <PageShell title="Checkout" maxWidthClass="max-w-lg">
        <p className="text-[var(--brand-muted)]">This checkout link is not valid.</p>
        <Link href="/pricing" className="mt-6 inline-block text-[var(--brand-primary)] hover:underline">
          See pricing
        </Link>
      </PageShell>
    );
  }

  const backHref = item.kind === 'course' ? coursePreviewPath(item.courseId) : '/pricing';

  if (failure) {
    return (
      <PageShell title="Checkout" maxWidthClass="max-w-lg">
        <p role="alert" className="text-[var(--brand-foreground)]">{failure.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {failure.retry && (
            <button
              type="button"
              onClick={() => {
                started.current = true;
                void start(item);
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-on-primary)] hover:opacity-90 transition-opacity"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Try again
            </button>
          )}
          <Link
            href={backHref}
            className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Go back
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Opening secure checkout…" maxWidthClass="max-w-lg">
      <div role="status" aria-live="polite" className="flex items-center gap-3 text-[var(--brand-muted)]">
        <span
          aria-hidden
          className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface-border)] border-t-[var(--brand-primary)]"
        />
        You&apos;ll be taken to Stripe to pay. Refund policy, terms and support are shown there.
      </div>
    </PageShell>
  );
}
