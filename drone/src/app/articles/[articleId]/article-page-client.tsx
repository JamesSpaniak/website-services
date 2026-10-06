'use client';

import { useEffect } from 'react';
import { trackArticleView } from '@/app/lib/analytics';
import { ArticleFull } from '@/app/lib/types/article';
import ArticleComponent from '@/app/ui/components/article';

/** Article HTML is server-rendered by page.tsx; this wrapper only records the view. */
export default function ArticlePageClient({ article }: { article: ArticleFull }) {
  useEffect(() => {
    trackArticleView(article.id, article.title);
  }, [article.id, article.title]);

  return <ArticleComponent article={article} />;
}
