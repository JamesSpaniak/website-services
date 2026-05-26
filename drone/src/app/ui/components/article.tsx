'use client';

import { ArticleFull } from '@/app/lib/types/article';
import { prepareArticleBodyHtml } from '@/app/lib/article-html';
import { articleHeroSrc } from '@/app/lib/article-images';
import { ARTICLE_PROSE_BODY_CLASS } from '@/app/lib/article-prose';
import ImageComponent from './image';
import ContentBlockRenderer from './content-block-renderer';
import JsonLd, { articleJsonLd } from './json-ld';
import CommentSection from './comment-section';

interface ArticleProps {
  article: ArticleFull;
}

export default function ArticleComponent({ article }: ArticleProps) {
  const hasContentBlocks = article.content_blocks && article.content_blocks.length > 0;
  const bodyHtml = !hasContentBlocks ? prepareArticleBodyHtml(article.body) : '';

  return (
    <article className="relative z-10 py-10 sm:py-16 lg:py-24">
      <JsonLd data={articleJsonLd(article)} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header>
          <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase">
            <time dateTime={new Date(article.submitted_at).toISOString()}>
              {new Date(article.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </time>
          </p>
          <h1 className="mt-2 text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl lg:text-4xl">{article.title}</h1>
          {article.sub_heading && <p className="mt-4 text-[var(--brand-muted)] leading-relaxed">{article.sub_heading}</p>}
        </header>
        <div className="mt-10">
          <div
            className="my-8 flex justify-center max-h-[70vh] overflow-hidden bg-[var(--background)]"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <ImageComponent
              src={articleHeroSrc(article.image_url)}
              alt={article.title}
              width={1200}
              height={675}
              className="w-full h-auto max-h-[70vh] object-contain"
              style={{ borderRadius: 'var(--radius-md)' }}
              fallbackSrc={articleHeroSrc(null)}
            />
          </div>

          {hasContentBlocks ? (
            <ContentBlockRenderer blocks={article.content_blocks!} />
          ) : (
            <div
              className={ARTICLE_PROSE_BODY_CLASS}
              style={{ ['--tw-prose-links' as string]: 'var(--brand-primary)' }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}

          <CommentSection articleId={article.id} />
        </div>
      </div>
    </article>
  );
}
