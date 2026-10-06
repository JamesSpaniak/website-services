'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { ApiError, createLead } from '@/app/lib/api-client';
import { leadAttributionFields } from '@/app/lib/attribution';
import { useAuth } from '@/app/lib/auth-context';
import type { LeadInterest } from '@/app/lib/types/lead';

/** What the consent line says we'll email about, per interest. */
const CONSENT_TOPIC: Record<LeadInterest, string> = {
  building: 'Drone Building early access',
  part107: 'the Part 107 course',
  schools: 'Drone Edge for schools and programs',
  newsletter: 'Drone Edge Field Notes, once a month',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WaitlistFormProps {
  interest: LeadInterest;
  /** Optional heading rendered above the form. */
  heading?: string;
  /** Submit button label (default "Join the waitlist"). */
  ctaLabel?: string;
  className?: string;
  /** Tighter consent line for inline placements (article end, footer, bands). */
  compact?: boolean;
  /** Adds an unchecked "also send me Field Notes" box; ticking it creates a second `newsletter` lead. */
  offerNewsletter?: boolean;
}

/**
 * Email capture for the waitlist / lead list (POST /api/leads). Includes a
 * hidden honeypot field named `website` (bots fill it; the server drops those
 * silently) and first-touch attribution from the `de_attr` cookie. The
 * server answers 202 `{ ok: true }` for any valid input — it never reveals
 * whether an email was already on the list — and records `lead_captured`
 * server-side.
 *
 * Never shown to students in a school account (privacy § 3–4): marketing
 * signups are adults-only and the backend ignores them from org members too.
 */
export default function WaitlistForm({
  interest,
  heading,
  ctaLabel = 'Join the waitlist',
  className = '',
  compact = false,
  offerNewsletter = false,
}: WaitlistFormProps) {
  const id = useId();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [alsoNewsletter, setAlsoNewsletter] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (user?.organization?.role === 'member') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setStatus('submitting');
    try {
      const base = { ...leadAttributionFields(), email: trimmed, website, source_path: window.location.pathname };
      await createLead({ ...base, interest });
      if (offerNewsletter && alsoNewsletter && interest !== 'newsletter') {
        await createLead({ ...base, interest: 'newsletter' });
      }
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many tries, please wait a minute.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please check your email address and try again.');
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    }
  };

  if (status === 'success') {
    return (
      <div
        className={`flex items-start gap-3 border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 p-4 text-sm text-[var(--brand-foreground)] ${className}`}
        style={{ borderRadius: 'var(--radius-md)' }}
        role="status"
        aria-live="polite"
      >
        <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
        <p>You&apos;re on the list — check your inbox for a confirmation.</p>
      </div>
    );
  }

  const emailId = `${id}-email`;
  const errorId = `${id}-error`;

  return (
    <form onSubmit={handleSubmit} noValidate className={className}>
      {heading && (
        <p className="mb-3 text-base font-display font-semibold text-[var(--brand-foreground)]">{heading}</p>
      )}

      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <EnvelopeIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]"
            aria-hidden
          />
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            required
            className="w-full min-h-[44px] pl-9 pr-3 text-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold tracking-wide bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 disabled:opacity-50 transition-opacity ring-focus touch-manipulation"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {status === 'submitting' ? 'Joining…' : ctaLabel}
        </button>
      </div>

      {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p id={errorId} className="mt-2 text-xs text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {offerNewsletter && interest !== 'newsletter' && (
        <label className="mt-3 flex items-start gap-2 text-xs text-[var(--brand-muted)] leading-relaxed">
          <input
            type="checkbox"
            checked={alsoNewsletter}
            onChange={(e) => setAlsoNewsletter(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-primary)]"
          />
          <span>
            Also send me <strong className="text-[var(--brand-foreground)]">Field Notes</strong>, the monthly
            newsletter (adults 18+).
          </span>
        </label>
      )}

      <p className={`${compact ? 'mt-2' : 'mt-3'} text-xs text-[var(--brand-muted)] leading-relaxed`}>
        We&apos;ll email you about {CONSENT_TOPIC[interest]}.
        {interest === 'newsletter' && ' For adults 18+.'} Unsubscribe anytime. See our{' '}
        <Link href="/privacy" className="text-[var(--brand-primary)] underline underline-offset-2 hover:opacity-80">
          Privacy Notice
        </Link>
        .
      </p>
    </form>
  );
}
