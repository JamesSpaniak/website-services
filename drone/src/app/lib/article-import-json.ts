import { prepareArticleBodyHtml } from '@/app/lib/article-html';

export type ArticleImportResult = {
  title: string;
  /** Empty when the JSON has none (editor then keeps / generates one). */
  slug: string;
  tags: string[];
  sub_heading: string;
  image_url: string;
  body: string;
};

/**
 * Parses our `news/articles/*.json` shape (and close variants) from a pasted string.
 * Returns null if the text is not a matching article JSON object.
 */
export function tryParseArticleImportJson(text: string): ArticleImportResult | null {
  const t = text.trim();
  if (!t.startsWith('{')) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(t) as Record<string, unknown>;
  } catch {
    return null;
  }
  return normalizeArticleImportObject(o);
}

function normalizeArticleImportObject(o: Record<string, unknown>): ArticleImportResult | null {
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!title) return null;

  const rawBody =
    (typeof o.body_html === 'string' && o.body_html) ||
    (typeof o.body === 'string' && o.body) ||
    '';
  if (!rawBody || !rawBody.includes('<')) return null;

  let sub_heading =
    (typeof o.sub_heading === 'string' && o.sub_heading.trim()) ||
    (typeof o.subHeading === 'string' && o.subHeading.trim()) ||
    '';
  if (!sub_heading) sub_heading = 'Overview and key points.';

  const image_url =
    (typeof o.hero_image === 'string' && o.hero_image.trim()) ||
    (typeof o.image_url === 'string' && o.image_url.trim()) ||
    '';

  // `seo_phrases` stays metadata only — never appended to the body (keyword stuffing).
  const body = prepareArticleBodyHtml(rawBody);

  const slug = typeof o.slug === 'string' ? o.slug.trim() : '';
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '').map((t) => t.trim())
    : [];

  return { title, slug, tags, sub_heading, image_url, body };
}
