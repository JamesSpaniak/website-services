'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import { getCourseById } from '@/app/lib/api-client';
import {
  coursePath,
  loginHref,
  registerHref,
} from '@/app/lib/auth-redirect';

interface CoursePreviewActionsProps {
  courseId: number;
  price: number;
}

export default function CoursePreviewActions({ courseId, price }: CoursePreviewActionsProps) {
  const { user, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const courseRedirect = coursePath(courseId);
  const purchaseRedirect = coursePath(courseId, true);
  const displayPrice = price > 0 ? price : 129;

  useEffect(() => {
    if (!user) {
      setHasAccess(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const course = await getCourseById(courseId);
        if (!cancelled) setHasAccess(course.has_access !== false);
      } catch {
        if (!cancelled) setHasAccess(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, courseId]);

  if (isLoading || (user && hasAccess === null)) {
    return (
      <div className="mt-6 h-11 animate-pulse bg-[var(--surface-border)]/40 rounded" style={{ borderRadius: 'var(--radius-sm)' }} />
    );
  }

  if (user && hasAccess) {
    return (
      <>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          You have full access to this course.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={courseRedirect}
            className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Open course
          </Link>
        </div>
      </>
    );
  }

  if (user) {
    return (
      <>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          You&apos;re signed in — Unit 1 is free. Unlock the full course for lifetime access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={courseRedirect}
            className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Continue learning
          </Link>
          {price > 0 && (
            <Link
              href={purchaseRedirect}
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold border border-[var(--brand-primary)]/50 text-[var(--brand-foreground)] hover:bg-[var(--brand-primary)]/10 transition-colors"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Unlock full course — ${displayPrice}
            </Link>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm text-[var(--brand-muted)]">
        Create a free account for Unit 1, purchase for lifetime access, or sign in to continue.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <Link
          href={registerHref(courseRedirect)}
          className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          Create account — try Unit 1 free
        </Link>
        <Link
          href={registerHref(purchaseRedirect)}
          className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold border border-[var(--brand-primary)]/50 text-[var(--brand-foreground)] hover:bg-[var(--brand-primary)]/10 transition-colors"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {price > 0 ? `Purchase — $${displayPrice}` : 'Purchase course'}
        </Link>
        <Link
          href={loginHref(courseRedirect)}
          className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
