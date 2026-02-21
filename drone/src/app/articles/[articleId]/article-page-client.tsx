'use client';

import { useEffect, useState } from 'react';
import { getArticleById } from '@/app/lib/api-client';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { ArticleFull } from '@/app/lib/types/article';
import ArticleComponent from '@/app/ui/components/article';

export default function ArticlePageClient({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const id = parseInt(articleId);
        if (isNaN(id)) throw new Error("Invalid article ID.");
        const articleData = await getArticleById(id);
        setArticle(articleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article.');
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [articleId]);

  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent message={error} />;
  if (!article) return <ErrorComponent message="Article not found." />;

  return <ArticleComponent article={article} />;
}
