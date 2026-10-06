import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { ArticleFull } from '@/app/lib/types/article';
import { articlePath, RSS_ALTERNATE_TYPES } from '@/app/lib/article-url';
import ArticlePageClient from './article-page-client';

const API_BASE = process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';
const SLUG_OR_ID = /^(\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * `param` is a slug (/articles/drone-careers-2026) or an old numeric id (/articles/39).
 * null = no such article (→ 404). Other API failures throw so an outage isn't served as a 404.
 */
const getArticle = cache(async (param: string): Promise<ArticleFull | null> => {
  if (!SLUG_OR_ID.test(param) || param.length > 120) return null;
  const res = await fetch(`${API_BASE}/articles/${param}`, { next: { revalidate: 300 } });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Failed to load article ${param} (${res.status})`);
  return res.json();
});

export async function generateMetadata(
  { params }: { params: Promise<{ articleId: string }> }
): Promise<Metadata> {
  const { articleId } = await params;
  const article = await getArticle(articleId);
  if (!article) notFound();
  const path = articlePath(article);

  return {
    title: article.title,
    description: article.sub_heading,
    alternates: { canonical: path, types: RSS_ALTERNATE_TYPES },
    ...(article.tags?.length ? { keywords: article.tags } : {}),
    openGraph: {
      title: article.title,
      description: article.sub_heading,
      type: 'article',
      url: path,
      publishedTime: new Date(article.submitted_at).toISOString(),
      ...(article.tags?.length ? { tags: article.tags } : {}),
      ...(article.image_url && {
        images: [{ url: article.image_url, width: 1200, height: 630, alt: article.title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.sub_heading,
      ...(article.image_url && { images: [article.image_url] }),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await params;
  const article = await getArticle(articleId);
  if (!article) notFound();
  // Old numeric links (/articles/39) → 308 to the slug URL once the API provides one.
  if (/^\d+$/.test(articleId) && article.slug) permanentRedirect(articlePath(article));
  return <ArticlePageClient article={article} />;
}
