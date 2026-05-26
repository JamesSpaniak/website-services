/** Default hero when `image_url` is missing or blank (matches news import JSON). */
export const ARTICLE_HERO_FALLBACK = '/images/articles/hero-default.svg';

export function articleHeroSrc(imageUrl?: string | null): string {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : ARTICLE_HERO_FALLBACK;
}
