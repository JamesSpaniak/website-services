import { prepareArticleBodyHtml } from '@/app/lib/article-html';

export type ArticleImportResult = {
  title: string;
  sub_heading: string;
  image_url: string;
  body: string;
};

const SEO_SECTION_MARKER = 'Topics & related search terms';

/**
 * Appends a short block so `seo_phrases` from imports are always present in the
 * indexable HTML body (in addition to natural use elsewhere).
 */
export function mergeSeoPhrasesIntoBody(html: string, phrases: string[] | undefined): string {
  if (!phrases?.length) return html;
  if (html.includes(SEO_SECTION_MARKER)) return html;

  const parts = phrases.map((p) => `<strong>${escapeHtml(p)}</strong>`).join(', ');
  const block = `<h2>${SEO_SECTION_MARKER}</h2>\n<p>Topics and queries covered in this piece: ${parts}.</p>`;
  return `${html.trimEnd()}\n\n${block}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

  const phrases = Array.isArray(o.seo_phrases)
    ? o.seo_phrases.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    : [];

  const bodyPrepared = prepareArticleBodyHtml(rawBody);
  const body = mergeSeoPhrasesIntoBody(bodyPrepared, phrases);

  return { title, sub_heading, image_url, body };
}
