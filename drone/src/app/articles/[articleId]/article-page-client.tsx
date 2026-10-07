'use client';

import { useEffect } from 'react';
import { trackArticleView } from '@/app/lib/analytics';
import { ArticleFull } from '@/app/lib/types/article';
import ArticleComponent from '@/app/ui/components/article';
import ReaderThemeControl from '@/app/ui/components/reader-theme-control';

/** Article HTML is server-rendered by page.tsx; this wrapper only records the view. */
export default function ArticlePageClient({ article }: { article: ArticleFull }) {
  useEffect(() => {
    trackArticleView(article.id, article.title);
  }, [article.id, article.title]);

  return (
    <>
      <ArticleComponent article={article} />
      <ReaderThemeControl />
    </>
  );
}
