import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '../ui/components/page-shell';
import TermsOfServiceBody from './terms-of-service-body';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Drone Edge Sales Agreement — terms and conditions for digital and physical offerings. Governs purchases subject to your quote unless superseded by a signed agreement.',
  openGraph: {
    title: 'Terms of Service — Drone Edge',
    description: 'General Sales Agreement terms attached to Drone Edge quotes and invoices.',
  },
};

/** Keep in sync with invoice/PDF and docs/legal-and-privacy-site-sync.md */
const TERMS_LAST_UPDATED = '2026-04-21';

export default function LegalPage() {
  return (
    <PageShell maxWidthClass="max-w-3xl" title="Terms of Service" subtitle="Sales Agreement — general terms">
      <div className="mb-8 rounded-md border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-sm text-[var(--brand-muted)] leading-relaxed">
        <p className="font-medium text-[var(--brand-foreground)]">How this page relates to your order</p>
        <p className="mt-2">
          This page publishes the general Sales Agreement terms Drone Edge attaches to quotes and invoices.{' '}
          <strong className="text-[var(--brand-foreground)]">
            Your specific purchase is governed by your signed quote, any exhibits (including Appendix A — subscription
            term, fees, and Authorized User limits), and any separate written agreement executed by you and Drone Edge.
          </strong>{' '}
          If anything on this page differs from those signed documents, the signed documents control.
        </p>
        <p className="mt-2">
          For privacy practices, see our{' '}
          <Link href="/privacy" className="text-[var(--brand-primary)] underline underline-offset-2 hover:opacity-90">
            Privacy Notice
          </Link>
          .
        </p>
        <p className="mt-3 text-xs text-[var(--brand-muted)]">Last updated: {TERMS_LAST_UPDATED}</p>
      </div>

      <article className="prose prose-sm max-w-none text-[var(--brand-muted)] prose-headings:font-display prose-headings:text-[var(--brand-foreground)] prose-strong:text-[var(--brand-foreground)] prose-a:text-[var(--brand-primary)] dark:prose-invert">
        <TermsOfServiceBody />
      </article>
    </PageShell>
  );
}
