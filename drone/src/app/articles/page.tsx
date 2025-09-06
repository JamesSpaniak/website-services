'use client';

import { useEffect, useState } from 'react';
import { getArticles } from '@/app/lib/api-client';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import ArticlePreviewComponent from '../ui/components/article-preview';
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
    <div className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">From the Blog</h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            Learn about the latest in drone technology, regulations, and best practices.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {articles.map((article) => (
            <ArticlePreviewComponent key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}
