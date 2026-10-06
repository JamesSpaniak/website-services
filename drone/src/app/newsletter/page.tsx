import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import PageShell from '@/app/ui/components/page-shell';
import WaitlistForm from '@/app/ui/components/waitlist-form';
import type { PublicIssueSummary } from '@/app/lib/types/newsletter';

const API_BASE = process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';

/** Issues sent at least 7 days ago (the backend applies the delay). */
async function getArchive(): Promise<PublicIssueSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/newsletter/public`, { next: { revalidate: 300 } });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: 'Field Notes newsletter',
  description:
    'Drone Edge Field Notes: one email a month on drone education. What changed in the rules, one classroom idea, notes from building our Drone Building course, and a practice Part 107 question.',
  alternates: { canonical: '/newsletter' },
  openGraph: {
    title: 'Field Notes — Drone Edge',
    description: 'Drone rules, classroom ideas and build notes, once a month.',
  },
};

// Sections per docs/marketing/newsletter-plan.md § 4. Claims stay within
// docs/sales/features.md: no pass rates, no school counts, no grant promises.
const SECTIONS = [
  {
    name: 'The one thing',
    body: "The month's most useful article, summarized in a few sentences with the number or fact that matters most.",
  },
  {
    name: 'Rules watch',
    body: 'What changed, and what did not, in Part 107, Part 108, Remote ID and FCC rules. Every line dated and linked to the source.',
  },
  {
    name: 'Classroom corner',
    body: 'One activity, lesson hook or funding tip a teacher can use this month.',
  },
  {
    name: 'Bench notes',
    body: 'Our Drone Building course, built in the open: a design choice, a part, a failure and how we fixed it.',
  },
  {
    name: 'Practice question',
    body: 'One original Part 107 question, with the answer and explanation on the site.',
  },
] as const;

export default async function NewsletterPage() {
  const archive = await getArchive();
  return (
    <PageShell
      title="Field Notes"
      subtitle="One email a month on drone education: what changed in the rules, what works in classrooms, and what we're learning building a drone course from scratch."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-10">
        <ul className="space-y-4">
          {SECTIONS.map((s) => (
            <li key={s.name} className="flex gap-3">
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
              <p className="text-[var(--brand-muted)] leading-relaxed">
                <strong className="text-[var(--brand-foreground)]">{s.name}.</strong> {s.body}
              </p>
            </li>
          ))}
        </ul>

        <div
          className="border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <WaitlistForm interest="newsletter" heading="Get Field Notes" ctaLabel="Subscribe" />
        </div>

        <div className="space-y-3 text-sm text-[var(--brand-muted)] leading-relaxed">
          <p>
            <strong className="text-[var(--brand-foreground)]">When:</strong> the first Tuesday of each month. July
            and August are one summer issue. At most one extra email in a month, and only for real news, like a
            course opening or a final FAA rule.
          </p>
          <p>
            <strong className="text-[var(--brand-foreground)]">Who it&apos;s for:</strong> teachers and program
            leads, people studying for Part 107, and builders. Signup is for adults 18 and over. Teachers are welcome
            to share an issue with their class; we never email students.
          </p>
          <p>
            <strong className="text-[var(--brand-foreground)]">Leaving:</strong> every issue has a one-click
            unsubscribe, and signed-in users can turn it off on their{' '}
            <Link href="/profile" className="text-[var(--brand-primary)] underline underline-offset-2">
              Profile
            </Link>
            . See the{' '}
            <Link href="/privacy" className="text-[var(--brand-primary)] underline underline-offset-2">
              Privacy Notice
            </Link>{' '}
            for how we use your email.
          </p>
          {archive.length === 0 && <p>The first issue goes out on Tuesday, November 3, 2026.</p>}
        </div>

        {archive.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-3">Recent issues</h2>
            <ul className="divide-y divide-[var(--surface-border)] border-y border-[var(--surface-border)]">
              {archive.map((i) => (
                <li key={i.slug} className="py-3">
                  <Link href={`/newsletter/${i.slug}`} className="text-[var(--brand-foreground)] hover:text-[var(--brand-primary)]">
                    <span className="font-mono text-xs text-[var(--brand-muted)] mr-3">
                      {new Date(i.sent_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    {i.subject}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}
