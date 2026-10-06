/** Public URL for an article: the slug when the API has one, else the numeric id (redirects to the slug). */
export function articlePath(article: { id?: number; slug?: string | null }): string {
  return `/articles/${article.slug || article.id}`;
}

/** URL-safe form of a tag label ("Part 107" → "part-107"); used in /articles?tag= and /rss.xml?tag=. */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function tagHref(tag: string): string {
  return `/articles?tag=${tagSlug(tag)}`;
}

export const RSS_PATH = '/rss.xml';

/** `alternates.types` entry so feed readers can discover the RSS feed from a page. */
export const RSS_ALTERNATE_TYPES = {
  'application/rss+xml': [{ url: RSS_PATH, title: 'Drone Edge articles' }],
};
