'use client';

import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import { FEATURED_COURSE_ID, registerHref } from '@/app/lib/auth-redirect';

/** Home hero CTA: Sign in vs Profile when session exists */
export default function HomeAuthCta() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <span className="inline-flex min-h-[44px] items-center px-5 text-sm text-[var(--brand-subtle)]" aria-busy>
        …
      </span>
    );
  }

  if (user) {
    return (
      <Link
        href="/profile"
        className="inline-flex min-h-[44px] items-center justify-center px-5 text-[var(--brand-subtle)] font-medium text-sm tracking-wide hover:text-[var(--brand-foreground)] transition-colors ring-focus touch-manipulation"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        Profile
      </Link>
    );
  }

  return (
    <>
      <Link
        href={registerHref(`/courses/${FEATURED_COURSE_ID}`)}
        className="inline-flex items-center justify-center min-h-[44px] bg-[var(--brand-primary)] text-[var(--brand-black)] font-medium text-sm tracking-wide px-5 hover:opacity-90 transition-opacity ring-focus touch-manipulation"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        Create account
      </Link>
      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center justify-center px-5 text-[var(--brand-subtle)] font-medium text-sm tracking-wide hover:text-[var(--brand-foreground)] transition-colors ring-focus touch-manipulation"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        Sign in
      </Link>
    </>
  );
}
