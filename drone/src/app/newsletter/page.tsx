import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import PageShell from '@/app/ui/components/page-shell';
import WaitlistForm from '@/app/ui/components/waitlist-form';
import type { PublicIssueSummary } from '@/app/lib/types/newsletter';
import type { ArticleSlim } from '@/app/lib/types/article';
import { articlePath } from '@/app/lib/article-url';

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

/** Newest published article — the live example for "The one thing" in the sample issue. */
async function getLatestArticle(): Promise<ArticleSlim | null> {
  try {
    const res = await fetch(`${API_BASE}/articles`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const articles: ArticleSlim[] = await res.json();
    return articles.find((a) => !a.hidden) ?? null;
  } catch {
    return null;
  }
}

const FIRST_ISSUE_DATE = 'Tuesday, November 3, 2026';

export const metadata: Metadata = {
  title: 'Field Notes newsletter',
  description:
    'Drone Edge Field Notes: one email a month on drone education. What changed in the rules, one classroom idea, notes from building our Drone Building course, and a practice Part 107 question.',
  alternates: { canonical: '/newsletter' },
  openGraph: {
    title: 'Field Notes — Drone Edge',
    description: 'Drone rules, classroom ideas and build notes on the first Tuesday of each month.',
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
  const [archive, latest] = await Promise.all([getArchive(), getLatestArticle()]);
  const [lead, ...rest] = SECTIONS;
  return (
    <PageShell
      title="Field Notes"
      subtitle="One email a month on drone education: what changed in the rules, what works in classrooms, and what we're learning building a drone course from scratch."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-10">
        <div
          className="border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <WaitlistForm interest="newsletter" heading="Get Field Notes" ctaLabel="Subscribe" />
        </div>

        {/* Sample issue: the real section layout. Until issue 1 is sent, "The one thing" shows the
            newest published article as a live example; nothing else is invented. */}
        <section aria-labelledby="sample-heading">
          <h2 id="sample-heading" className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-3">
            Inside each issue
          </h2>
          <div
            className="border border-[var(--surface-border)] bg-[var(--background)] overflow-hidden"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-border)] bg-[var(--surface)] px-5 py-3">
              <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase">Field Notes</p>
              <p className="text-xs text-[var(--brand-muted)]">5-minute read</p>
            </div>
            <div className="divide-y divide-[var(--surface-border)]">
              <div className="px-5 py-4">
                <p className="text-sm font-semibold text-[var(--brand-foreground)]">{lead.name}</p>
                <p className="mt-1 text-sm text-[var(--brand-muted)] leading-relaxed">{lead.body}</p>
                {latest && (
                  <Link
                    href={articlePath(latest)}
                    className="mt-3 block border-l-2 border-[var(--brand-primary)] pl-3 hover:opacity-90"
                  >
                    <span className="block text-xs text-[var(--brand-muted)]">For example, from our latest article:</span>
                    <span className="block text-sm font-medium text-[var(--brand-foreground)]">{latest.title}</span>
                    {latest.sub_heading && (
                      <span className="block text-sm text-[var(--brand-muted)] line-clamp-2">{latest.sub_heading}</span>
                    )}
                  </Link>
                )}
              </div>
              {rest.map((s) => (
                <div key={s.name} className="flex gap-3 px-5 py-4">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden />
                  <p className="text-sm text-[var(--brand-muted)] leading-relaxed">
                    <strong className="text-[var(--brand-foreground)]">{s.name}.</strong> {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="issues-heading">
          <h2 id="issues-heading" className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-3">
            Issues
          </h2>
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
            {archive.length === 0 && (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-[var(--brand-foreground)]">
                  <span className="font-mono text-xs text-[var(--brand-muted)] mr-3">Nov 2026</span>
                  Issue 1
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium border border-[var(--surface-border)] text-[var(--brand-muted)]"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Coming {FIRST_ISSUE_DATE}
                </span>
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-[var(--brand-muted)]">
            Past issues appear here a week after they&apos;re sent, so subscribers read them first.
          </p>
        </section>

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
          <p>
            <strong className="text-[var(--brand-foreground)]">Prefer a feed?</strong> New articles are also on our{' '}
            <a href="/rss.xml" className="text-[var(--brand-primary)] underline underline-offset-2">
              RSS feed
            </a>
            .
          </p>
        </div>
      </div>
    </PageShell>
  );
}
