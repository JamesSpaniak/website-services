import { Metadata } from 'next';
import Link from 'next/link';
import ArticlePreviewComponent from '../ui/components/article-preview';
import ArticleTags from '../ui/components/article-tags';
import PageShell from '../ui/components/page-shell';
import NewsletterSignup from '../ui/components/newsletter-signup';
import { ArticleSlim } from '../lib/types/article';
import { RSS_ALTERNATE_TYPES, RSS_PATH, tagSlug } from '../lib/article-url';

const API_BASE = process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';

// Rendered per request (the API isn't reachable during the Docker build); the fetch itself is cached for 5 minutes.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // Tag-filtered views (/articles?tag=…) share the index's canonical.
  alternates: { canonical: '/articles', types: RSS_ALTERNATE_TYPES },
};

async function getArticles(): Promise<ArticleSlim[]> {
  const res = await fetch(`${API_BASE}/articles`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to load articles (${res.status})`);
  const articles: ArticleSlim[] = await res.json();
  return articles.filter((a) => !a.hidden);
}

/** Every tag in use, most-used first, keeping the first spelling seen. */
function allTags(articles: ArticleSlim[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const a of articles) {
    for (const tag of a.tags ?? []) {
      const key = tagSlug(tag);
      const entry = counts.get(key) ?? { label: tag, n: 0 };
      entry.n += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).map((e) => e.label);
}

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ tag?: string | string[] }> }) {
  const [articles, { tag }] = await Promise.all([getArticles(), searchParams]);
  const activeSlug = typeof tag === 'string' ? tagSlug(tag) : '';
  const tags = allTags(articles);
  const activeLabel = tags.find((t) => tagSlug(t) === activeSlug);
  const shown = activeLabel ? articles.filter((a) => a.tags?.some((t) => tagSlug(t) === activeSlug)) : articles;

  return (
    <PageShell
      title={activeLabel ? `Articles: ${activeLabel}` : 'Articles'}
      subtitle="Drone technology, regulations, and practice."
      maxWidthClass="max-w-6xl"
    >
      <NewsletterSignup variant="band" className="mb-8" />

      <nav aria-label="Filter by topic" className="mb-8 flex flex-wrap items-center gap-2">
        {tags.length > 0 && (
          <>
            <Link
              href="/articles"
              aria-current={!activeLabel ? 'page' : undefined}
              className={`inline-flex items-center min-h-[32px] px-3 text-xs font-medium tracking-wide border transition-colors ${
                !activeLabel
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  : 'border-[var(--surface-border)] text-[var(--brand-muted)] hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)]'
              }`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              All
            </Link>
            <ArticleTags tags={tags} activeSlug={activeSlug} />
          </>
        )}
        <a
          href={activeLabel ? `${RSS_PATH}?tag=${activeSlug}` : RSS_PATH}
          className="ml-auto text-xs text-[var(--brand-muted)] hover:text-[var(--brand-primary)] transition-colors"
        >
          RSS feed{activeLabel ? ` for ${activeLabel}` : ''}
        </a>
      </nav>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((article) => (
          <ArticlePreviewComponent key={article.id} article={article} />
        ))}
      </div>
    </PageShell>
  );
}
