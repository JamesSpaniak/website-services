'use client';

import { useEffect, useState } from 'react';
import { getArticles } from '@/app/lib/api-client';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import ArticlePreviewComponent from '../ui/components/article-preview';
import PageShell from '../ui/components/page-shell';
import { ArticleSlim } from '../lib/types/article';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleSlim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const articlesData = await getArticles();
        setArticles(articlesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load articles.');
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent message={error} />;

  return (
    <PageShell
      title="Articles"
      subtitle="Drone technology, regulations, and practice."
      maxWidthClass="max-w-4xl"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticlePreviewComponent key={article.id} article={article} />
        ))}
      </div>
    </PageShell>
  );
}
