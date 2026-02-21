import { Metadata } from 'next';
import ArticlePageClient from './article-page-client';

const API_BASE = process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';

async function getArticle(id: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ articleId: string }> }
): Promise<Metadata> {
  const { articleId } = await params;
  const article = await getArticle(articleId);
  if (!article) return { title: 'Article Not Found' };

  return {
    title: article.title,
    description: article.sub_heading,
    openGraph: {
      title: article.title,
      description: article.sub_heading,
      type: 'article',
      publishedTime: article.submitted_at,
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
  return <ArticlePageClient articleId={articleId} />;
}
