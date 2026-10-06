import { ArticleSlim } from '../lib/types/article';
import { articlePath, tagSlug } from '../lib/article-url';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';
const API_BASE = process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';

// Built per request (no API during the Docker build); the article fetch is cached for 5 minutes.
export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * RSS 2.0 feed of published articles, newest first. `?tag=schools` narrows it to one topic
 * (same tag slugs as /articles?tag=), so a teacher can follow just the classroom pieces.
 */
export async function GET(request: Request) {
  const res = await fetch(`${API_BASE}/articles`, { next: { revalidate: 300 } });
  if (!res.ok) return new Response('Feed temporarily unavailable', { status: 503 });
  const all = ((await res.json()) as ArticleSlim[]).filter((a) => !a.hidden);

  const tagParam = new URL(request.url).searchParams.get('tag');
  const activeSlug = tagParam ? tagSlug(tagParam) : '';
  const articles = activeSlug ? all.filter((a) => a.tags?.some((t) => tagSlug(t) === activeSlug)) : all;
  const tagLabel = activeSlug ? all.flatMap((a) => a.tags ?? []).find((t) => tagSlug(t) === activeSlug) : undefined;

  const feedUrl = `${SITE_URL}/rss.xml${activeSlug ? `?tag=${activeSlug}` : ''}`;
  const pageUrl = `${SITE_URL}/articles${activeSlug ? `?tag=${activeSlug}` : ''}`;
  const title = tagLabel ? `Drone Edge articles: ${tagLabel}` : 'Drone Edge articles';
  const lastBuild = articles[0] ? new Date(articles[0].updated_at || articles[0].submitted_at) : new Date();

  const items = articles
    .slice(0, 50)
    .map((a) => {
      const link = `${SITE_URL}${articlePath(a)}`;
      const image = a.image_url
        ? `\n      <media:content url="${esc(a.image_url)}" medium="image" />`
        : '';
      const categories = (a.tags ?? []).map((t) => `\n      <category>${esc(t)}</category>`).join('');
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">drone-edge-article-${a.id}</guid>
      <pubDate>${new Date(a.submitted_at).toUTCString()}</pubDate>
      <description>${esc(a.sub_heading || '')}</description>${categories}${image}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(pageUrl)}</link>
    <description>Drone rules, classroom ideas and FAA Part 107 notes from Drone Edge.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
