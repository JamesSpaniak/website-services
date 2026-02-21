'use client';

import { ArticleFull } from '@/app/lib/types/article';
import ImageComponent from './image';
import ContentBlockRenderer from './content-block-renderer';
import JsonLd, { articleJsonLd } from './json-ld';

interface ArticleProps {
  article: ArticleFull;
}

export default function ArticleComponent({ article }: ArticleProps) {
  const hasContentBlocks = article.content_blocks && article.content_blocks.length > 0;

  return (
    <article className="bg-white py-10 sm:py-16 lg:py-24">
      <JsonLd data={articleJsonLd(article)} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            <time dateTime={new Date(article.submitted_at).toISOString()}>
              {new Date(article.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </h2>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">{article.title}</h1>
          <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-6 sm:text-lg sm:leading-8">{article.sub_heading}</p>
        </div>
        <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
          {article.image_url && (
              <div className="my-6 sm:my-8">
                  <ImageComponent
                      src={article.image_url}
                      alt={article.title}
                      width={1200}
                      height={675}
                      className="w-full aspect-video rounded-xl bg-gray-50 object-cover"
                  />
              </div>
          )}

          {hasContentBlocks ? (
            <div className="mt-8 sm:mt-10">
              <ContentBlockRenderer blocks={article.content_blocks!} />
            </div>
          ) : (
            <div
              className="mt-8 sm:mt-10 prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-600 prose-img:rounded-xl overflow-hidden break-words"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />
          )}
        </div>
      </div>
    </article>
  );
}
