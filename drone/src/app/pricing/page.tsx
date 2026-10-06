import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import PageShell from '@/app/ui/components/page-shell';
import { FEATURED_COURSE_ID, registerHref } from '@/app/lib/auth-redirect';
import PricingViewTracker from './pricing-view-tracker';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Try Unit 1 of FAA Part 107 free, buy the full Part 107 course for $129 one-time, or bring Drone Edge to your school starting at $79 per seat.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — Drone Edge',
    description: 'Unit 1 free · Part 107 course $129 one-time · Schools from $79/seat.',
  },
};

type Tier = {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  blurb: string;
  includes: string[];
  excludes?: string[];
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  highlight?: boolean;
  footnote?: string;
  /** Optional link appended after the footnote. */
  footnoteLink?: { label: string; href: string };
};

// Ladder per docs/sales/money-model.md § 7 and launch plan X1. Course inclusions
// match the course preview FAQ and docs/sales/features.md — keep them in sync.
const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceNote: 'No card needed',
    blurb: 'Start the FAA Part 107 course with a free account.',
    includes: ['Unit 1 of the Part 107 course', 'Section practice questions in Unit 1', 'Progress tracking'],
    cta: { label: 'Try Unit 1 free', href: registerHref(`/courses/${FEATURED_COURSE_ID}`) },
  },
  {
    id: 'part107',
    name: 'Part 107 course',
    price: '$129',
    priceNote: 'One-time payment',
    blurb: 'Everything you need to prepare for the FAA Remote Pilot knowledge test.',
    includes: [
      'Every unit — regulations, airspace, weather, performance, emergencies, decision-making, and radio procedures',
      'Hundreds of ACS-aligned practice questions',
      'Unit, section, and full-course practice exams',
      'Progress tracking across units and exams',
      'Lifetime access on any device',
    ],
    excludes: ['FAA knowledge test fee — paid to the testing center, not to us'],
    cta: { label: 'View the course', href: `/courses/${FEATURED_COURSE_ID}/preview` },
    highlight: true,
    footnote: 'Full refund available.',
    footnoteLink: { label: 'Refund policy', href: '/refunds' },
  },
  // DRAFT_PRO — price and benefits pending owner confirmation (launch plan E5 / money-model MM2).
  {
    id: 'pro',
    name: 'Pro',
    price: '$35',
    priceNote: 'per month',
    blurb: 'Every course on Drone Edge for as long as you subscribe.',
    includes: ['All courses', 'New courses and updates while subscribed'],
    cta: { label: 'Go Pro', href: registerHref('/profile') },
    footnote: 'Cancel anytime.',
  },
  {
    id: 'schools',
    name: 'Schools',
    price: 'From $79',
    priceNote: 'per seat',
    blurb: 'Many options available for classes, programs, and districts.',
    includes: ['Teacher and manager dashboards', 'Class progress and exam reporting', 'Help planning your pacing'],
    cta: { label: 'Book a call', href: '/consultation' },
    secondary: { label: 'Drone Edge for schools', href: '/schools' },
  },
];

const FAQ = [
  {
    q: 'Do I need to verify my email to buy?',
    a: 'No. You can buy right after creating an account. We’ll still send an email so you can confirm your address.',
  },
  {
    q: 'Does the price include the FAA test?',
    a: 'No. The FAA knowledge test is scheduled and paid separately at an FAA-authorized testing center. Our course prepares you for it.',
  },
  {
    q: 'How long do I have access?',
    a: 'A course purchase is one-time with lifetime access — it stays on your account. Pro gives you every course while your subscription is active. Details are in our refund & access policy.',
  },
  {
    q: 'Do you offer group or school pricing?',
    a: 'Yes. School and program pricing starts at $79 per seat, with options for different class sizes and programs. Book a call and we will put together a quote.',
  },
];

const btnBase =
  'inline-flex w-full items-center justify-center gap-2 min-h-[44px] px-5 text-sm font-semibold tracking-wide transition-opacity ring-focus touch-manipulation';

export default function PricingPage() {
  return (
    <PageShell
      title="Pricing"
      subtitle="Start free, buy the course once, or bring Drone Edge to your school."
      maxWidthClass="max-w-6xl"
    >
      <PricingViewTracker />

      {/* Ladder */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => (
          <section
            key={tier.id}
            aria-labelledby={`tier-${tier.id}`}
            className={`relative flex flex-col p-5 sm:p-6 bg-[var(--surface)] border ${
              tier.highlight ? 'border-2 border-[var(--brand-primary)]' : 'border-[var(--surface-border)]'
            }`}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {tier.highlight && (
              <span
                className="absolute -top-3 left-5 px-2 py-0.5 text-xs font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)]"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Recommended
              </span>
            )}
            <h2 id={`tier-${tier.id}`} className="text-base font-display font-semibold text-[var(--brand-foreground)]">
              {tier.name}
            </h2>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-semibold text-[var(--brand-foreground)]">{tier.price}</span>
              <span className="text-xs text-[var(--brand-muted)]">{tier.priceNote}</span>
            </p>
            <p className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed">{tier.blurb}</p>

            <ul className="mt-5 space-y-2 flex-1">
              {tier.includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--brand-foreground)]">
                  <CheckIcon className="h-4 w-4 mt-0.5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
                  {item}
                </li>
              ))}
              {tier.excludes?.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--brand-muted)]">
                  <XMarkIcon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                  <span>
                    <span className="sr-only">Not included: </span>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {tier.footnote && (
              <p className="mt-4 text-xs text-[var(--brand-muted)]">
                {tier.footnote}
                {tier.footnoteLink && (
                  <>
                    {' '}
                    <Link
                      href={tier.footnoteLink.href}
                      className="text-[var(--brand-primary)] underline underline-offset-2"
                    >
                      {tier.footnoteLink.label}
                    </Link>
                  </>
                )}
              </p>
            )}

            <div className="mt-5 space-y-2">
              <Link
                href={tier.cta.href}
                className={`${btnBase} ${
                  tier.highlight
                    ? 'bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90'
                    : 'border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--background)]'
                }`}
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                {tier.cta.label}
              </Link>
              {tier.secondary && (
                <Link
                  href={tier.secondary.href}
                  className="flex min-h-[44px] items-center justify-center gap-1 text-sm font-medium text-[var(--brand-primary)] hover:opacity-80"
                >
                  {tier.secondary.label}
                  <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Guarantees — short taglines; full terms on /refunds (launch plan E7, decided Oct 3 2026) */}
      <section
        aria-label="Refunds and access"
        className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:px-6 border border-[var(--surface-border)] bg-[var(--surface)]"
        style={{ borderRadius: 'var(--radius-md)' }}
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[var(--brand-foreground)]">
          {['Full refund available', 'Lifetime course access', 'Cancel Pro anytime'].map((tag) => (
            <li key={tag} className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden />
              {tag}
            </li>
          ))}
        </ul>
        <Link
          href="/refunds"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[var(--brand-primary)] hover:opacity-80 shrink-0 touch-manipulation"
        >
          Refund &amp; access policy
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mt-12">
        <h2 id="faq-heading" className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-4">
          Questions
        </h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div
              key={q}
              className="p-5 border border-[var(--surface-border)] bg-[var(--surface)]"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <dt className="text-sm font-semibold text-[var(--brand-foreground)]">{q}</dt>
              <dd className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PageShell>
  );
}
