'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';
import WaitlistForm from './waitlist-form';

/**
 * Routes where no newsletter signup appears (newsletter plan § 6 "Not on"):
 * the student product (lessons, exams, profile), staff tools, checkout and
 * account flows. Public marketing pages only.
 */
const HIDDEN_ROUTE = /^\/(admin|manager|profile|settings|login|register|forgot-password|reset-password|verify-email|unsubscribe|account-deleted|newsletter)(\/|$)|^\/courses\/[^/]+\/(units|exams|preview)(\/|$)/;

const ARTICLES_ROUTE = /^\/articles(\/|$)/;

interface NewsletterSignupProps {
  /** `card` = article end, `band` = slim strip under a page heading, `footer` = site footer column. */
  variant?: 'card' | 'band' | 'footer';
  className?: string;
}

/**
 * Field Notes signup (newsletter plan § 6). Hidden on private routes and for
 * signed-in students in a school account; WaitlistForm and POST /leads enforce
 * the same rule again.
 */
export default function NewsletterSignup({ variant = 'card', className = '' }: NewsletterSignupProps) {
  const pathname = usePathname() ?? '/';
  const { user, isLoading } = useAuth();

  if (HIDDEN_ROUTE.test(pathname)) return null;
  // Wait for the session check so school students never see the form flash in.
  if (isLoading) return null;
  // Articles already carry an inline signup (index band, end-of-article card); skip the footer copy there.
  if (variant === 'footer' && ARTICLES_ROUTE.test(pathname)) return null;
  if (user?.organization?.role === 'member') return null;

  if (variant === 'footer') {
    return (
      // Full-width row on md+: blurb left, form right (stacks on phones).
      <div className={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10 ${className}`}>
        <div className="md:max-w-sm">
          <p className="text-xs font-semibold tracking-widest text-[var(--brand-foreground)] uppercase mb-2">
            Field Notes
          </p>
          <p className="text-sm text-[var(--brand-muted)]">
            Drone rules, classroom ideas and build notes on the first Tuesday of each month.{' '}
            <Link href="/newsletter" className="text-[var(--brand-primary)] hover:underline">
              What&apos;s in it
            </Link>
          </p>
        </div>
        <WaitlistForm interest="newsletter" ctaLabel="Subscribe" compact className="w-full md:w-[26rem] md:shrink-0" />
      </div>
    );
  }

  if (variant === 'band') {
    return (
      <div
        className={`border border-[var(--surface-border)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}
        style={{ borderRadius: 'var(--radius-md)' }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="md:max-w-sm">
            <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase">Field Notes · monthly</p>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              New articles, rule changes and classroom ideas in one email on the first Tuesday of each month.
            </p>
          </div>
          <WaitlistForm interest="newsletter" ctaLabel="Subscribe" compact className="md:w-[26rem]" />
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Field Notes newsletter"
      className={`border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6 ${className}`}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase">Field Notes · monthly</p>
      <p className="mt-2 text-base font-display font-semibold text-[var(--brand-foreground)]">
        Drone rules, classroom ideas and build notes on the first Tuesday of each month.
      </p>
      <p className="mt-1 text-sm text-[var(--brand-muted)]">Five-minute read. No spam.</p>
      <WaitlistForm interest="newsletter" ctaLabel="Subscribe" compact className="mt-4" />
      <p className="mt-3 text-xs">
        <Link href="/newsletter" className="text-[var(--brand-primary)] hover:underline">
          What&apos;s in each issue →
        </Link>
      </p>
    </section>
  );
}
