import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageShell from '@/app/ui/components/page-shell';
import type { PublicIssue } from '@/app/lib/types/newsletter';

const API_BASE = process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';

async function getIssue(slug: string): Promise<PublicIssue | null> {
  try {
    const res = await fetch(`${API_BASE}/newsletter/public/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return { title: 'Issue not found', robots: { index: false, follow: false } };
  return {
    title: `${issue.subject}`,
    description: 'Drone Edge Field Notes — drone rules, classroom ideas and build notes on the first Tuesday of each month.',
    alternates: { canonical: `/newsletter/${issue.slug}` },
    // Subscribers get it first: unlisted and noindex until 7 days after send (NL-D6).
    robots: issue.listed ? undefined : { index: false, follow: true },
  };
}

/**
 * Web copy of a sent Field Notes issue — the email's "View in browser" link,
 * and the page teachers share with a class. No sales (segment) block and no
 * signup form: students may read it. Corrections made after sending are
 * listed at the top.
 */
export default async function NewsletterIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) notFound();

  const sent = new Date(issue.sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <PageShell title={issue.subject} subtitle={`Field Notes · sent ${sent}`} maxWidthClass="max-w-3xl">
      {issue.corrections.length > 0 && (
        <div className="mb-8 border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-sm text-[var(--brand-muted)]">
          {issue.corrections.map((c) => (
            <p key={c.at}>
              <strong className="text-[var(--brand-foreground)]">
                Updated {new Date(c.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}:
              </strong>{' '}
              {c.note}
            </p>
          ))}
        </div>
      )}
      <article
        className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-a:text-[var(--brand-primary)]"
        // Rendered by the backend from markdown with raw HTML disabled.
        dangerouslySetInnerHTML={{ __html: issue.html }}
      />
      <p className="mt-12 text-sm text-[var(--brand-muted)]">
        Field Notes is a free monthly email from Drone Edge for adults 18+.{' '}
        <Link href="/newsletter" className="text-[var(--brand-primary)] underline underline-offset-2">
          About Field Notes and past issues
        </Link>
        .
      </p>
    </PageShell>
  );
}
