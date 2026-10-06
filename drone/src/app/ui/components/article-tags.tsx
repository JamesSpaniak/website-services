import Link from 'next/link';
import { tagHref, tagSlug } from '@/app/lib/article-url';

interface ArticleTagsProps {
  tags?: string[];
  /** Highlights the chip for the tag currently filtered on /articles. */
  activeSlug?: string;
  className?: string;
}

/** Tag chips linking to /articles?tag=…. Renders nothing when there are no tags. */
export default function ArticleTags({ tags, activeSlug, className = '' }: ArticleTagsProps) {
  if (!tags?.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Topics">
      {tags.map((tag) => {
        const active = tagSlug(tag) === activeSlug;
        return (
          <li key={tag}>
            <Link
              href={tagHref(tag)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center min-h-[32px] px-3 text-xs font-medium tracking-wide border transition-colors ${
                active
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  : 'border-[var(--surface-border)] text-[var(--brand-muted)] hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)]'
              }`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {tag}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
