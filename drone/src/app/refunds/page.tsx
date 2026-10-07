import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '../ui/components/page-shell';

export const metadata: Metadata = {
  title: 'Refund & Access Policy',
  description:
    'When Drone Edge course purchases are refundable, how Pro cancellation works, and what lifetime access means.',
  alternates: { canonical: '/refunds' },
  openGraph: {
    title: 'Refund & Access Policy — Drone Edge',
    description: 'Full refund available on individual course purchases. Cancel Pro anytime.',
  },
};

/**
 * Launch plan E7 / TODO D9 — approved 2026-10-03. Short taglines live on
 * /pricing; this page is the full text. Mirror into the Terms of Service (X2)
 * and keep docs/tech/legal-and-privacy-site-sync.md in step.
 */
const REFUNDS_LAST_UPDATED = '2026-10-06';

const SUPPORT_EMAIL = 'support@thedroneedge.com';

function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--brand-primary)] underline underline-offset-2">
      {SUPPORT_EMAIL}
    </a>
  );
}

export default function RefundsPage() {
  const h2 = 'text-base font-display font-semibold text-[var(--brand-foreground)] mb-3';
  return (
    <PageShell maxWidthClass="max-w-3xl" title="Refund & Access Policy" subtitle="Individual course purchases and Pro">
      <p className="text-xs text-[var(--brand-muted)] mb-8">Last updated: {REFUNDS_LAST_UPDATED}</p>

      <article className="space-y-8 text-sm text-[var(--brand-muted)] leading-relaxed">
        <p>
          This policy covers courses and Pro subscriptions bought by individuals on thedroneedge.com. School,
          district, and organization orders follow the terms in your quote and our{' '}
          <Link href="/legal" className="text-[var(--brand-primary)] underline underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>

        <section>
          <h2 className={h2}>1. Tried it and it isn&apos;t working for you</h2>
          <p>We&apos;ll refund a course purchase in full if all of these are true:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>You ask within 30 days of purchase.</li>
            <li>You&apos;ve completed the first 3 units and at least one practice exam.</li>
            <li>You haven&apos;t completed more than half the course or taken the final exam.</li>
          </ul>
          <p className="mt-3">
            We can see your progress in your account, so there&apos;s nothing to upload — just tell us it isn&apos;t
            helping.
          </p>
        </section>

        <section>
          <h2 className={h2}>2. Changed your mind</h2>
          <p>
            Full refund within 14 days of purchase if you haven&apos;t gone past Unit 1 (which is free for everyone).
          </p>
        </section>

        <section>
          <h2 className={h2}>3. Pro subscriptions</h2>
          <p>
            Cancel anytime from your profile. You keep access until the end of the period you&apos;ve already paid
            for, and you won&apos;t be charged again. We don&apos;t refund partial months.
          </p>
        </section>

        <section>
          <h2 className={h2}>4. How to request a refund</h2>
          <p>
            Email <SupportLink /> from the address on your Drone Edge account. Refunds go back to your original payment
            method; your bank may take several business days to show it. Access to the refunded course ends once the
            refund is issued.
          </p>
        </section>

        <section>
          <h2 className={h2}>5. Lifetime access</h2>
          <p>
            A course purchase is a one-time payment. Lifetime access means the course stays on your account for as long
            as Drone Edge offers it, including updates we make to it.
          </p>
        </section>

        <section>
          <h2 className={h2}>6. What we don&apos;t refund</h2>
          <p>
            The FAA knowledge test fee is paid to the testing center, not to us, so we can&apos;t refund it. Our
            refunds and guarantees are never tied to whether you pass the FAA test.
          </p>
        </section>

        <section>
          <h2 className={h2}>7. Buying with an AI assistant</h2>
          <p>
            You can have an AI assistant or other automated tool create your account and buy a course or Pro for you.
            When it does:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>The account and purchase are yours, as if you had made them yourself.</li>
            <li>This refund policy applies the same way. Request refunds from the email on the account.</li>
            <li>The account should use your own email address so receipts and password resets reach you.</li>
          </ul>
          <p className="mt-3">
            Creating accounts in bulk, or trying several payment cards, isn&apos;t allowed whether a person or a tool
            does it. We may cancel those accounts and refund or block the payments.
          </p>
        </section>

        <section>
          <h2 className={h2}>8. Questions</h2>
          <p>
            Contact <SupportLink />.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
