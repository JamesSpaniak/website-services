'use client';

import Link from 'next/link';
import { ArticleSlim } from '@/app/lib/types/article';

interface ArticlePreviewProps {
  article: ArticleSlim;
}

export default function ArticlePreviewComponent({ article }: ArticlePreviewProps) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="group block border border-[var(--surface-border)] bg-[var(--surface)] p-5 hover:border-[var(--brand-primary)]/50 transition-colors ring-focus"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <p className="font-mono text-xs tracking-wide text-[var(--brand-muted)]">
        <time dateTime={new Date(article.submitted_at).toISOString()}>
          {new Date(article.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </time>
      </p>
      <h3 className="mt-2 text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)] transition-colors">
        {article.title}
      </h3>
    </Link>
  );
}