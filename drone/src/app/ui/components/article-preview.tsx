'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { ArticleSlim } from '@/app/lib/types/article';
import { articleHeroSrc } from '@/app/lib/article-images';
import { articlePath } from '@/app/lib/article-url';
import ImageComponent from './image';

interface ArticlePreviewProps {
  article: ArticleSlim;
  /** Surface card on page background (default) vs elevated card on a surface section (home). */
  cardTone?: 'surface' | 'background';
  /** Show “Read article” row at the bottom (default true). */
  showCta?: boolean;
}

export default function ArticlePreviewComponent({
  article,
  cardTone = 'surface',
  showCta = true,
}: ArticlePreviewProps) {
  const href = articlePath(article);
  const heroSrc = articleHeroSrc(article.image_url);
  const bgClass =
    cardTone === 'background' ? 'bg-[var(--background)]' : 'bg-[var(--surface)]';

  return (
    <article
      className={`group/card border border-[var(--surface-border)] ${bgClass} hover:border-[var(--brand-primary)]/50 transition-colors overflow-hidden flex flex-col h-full`}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <Link
        href={href}
        className="flex flex-col h-full min-h-0 touch-manipulation ring-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        style={{ borderRadius: 'var(--radius-md)' }}
      >
        {/* Heroes are 3:2 (1536×1024) with a caption bar baked into the bottom edge — keep the full frame. */}
        <div className="shrink-0 px-5 pt-5 pb-4">
          <div
            className="relative w-full aspect-[3/2] overflow-hidden"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <ImageComponent
              src={heroSrc}
              alt={`${article.title} — preview`}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 90vw, (max-width: 1024px) 45vw, 33vw"
              fallbackSrc={articleHeroSrc(null)}
            />
          </div>
        </div>

        <div className="flex flex-col flex-grow min-h-0 px-5 pb-5">
          <p className="font-mono text-xs tracking-wide text-[var(--brand-muted)]">
            <time dateTime={new Date(article.submitted_at).toISOString()}>
              {new Date(article.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
            {article.read_minutes ? <> · {article.read_minutes} min read</> : null}
            {article.tags?.length ? <> · {article.tags.join(', ')}</> : null}
          </p>
          <h3 className="mt-2 text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)] group-hover/card:text-[var(--brand-primary)] transition-colors leading-snug line-clamp-3 break-words">
            {article.title}
          </h3>
          {article.sub_heading && (
            <p className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed line-clamp-2 flex-grow">
              {article.sub_heading}
            </p>
          )}
          {showCta && (
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] mt-4 pt-1">
              Read article
              <ArrowRightIcon className="h-3.5 w-3.5 group-hover/card:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
