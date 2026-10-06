'use client';

import { useEffect, useState } from 'react';
import { getArticles } from '@/app/lib/api-client';
import { ArticleSlim } from '@/app/lib/types/article';
import ArticlePreviewComponent from './article-preview';

/**
 * Newest articles, fetched in the browser. For pages rendered once at build time
 * (the 404 page), where a server fetch would be frozen at build with no API.
 */
export default function RecentArticles({ limit = 3, className = '' }: { limit?: number; className?: string }) {
  const [articles, setArticles] = useState<ArticleSlim[]>([]);

  useEffect(() => {
    getArticles()
      .then((all) => setArticles(all.filter((a) => !a.hidden).slice(0, limit)))
      .catch(() => setArticles([]));
  }, [limit]);

  if (articles.length === 0) return null;
  return (
    <section className={className} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-4">
        Recent articles
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {articles.map((a) => (
          <ArticlePreviewComponent key={a.id} article={a} showCta={false} />
        ))}
      </div>
    </section>
  );
}
