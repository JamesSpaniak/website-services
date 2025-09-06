'use client';

import { ArticleFull } from '@/app/lib/types/article';
import Image from 'next/image';

interface ArticleProps {
  article: ArticleFull;
}

export default function ArticleComponent({ article }: ArticleProps) {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            {new Date(article.submitted_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{article.title}</p>
          <p className="mt-6 text-lg leading-8 text-gray-600">{article.sub_title}</p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl lg:mx-0 lg:max-w-none">
          {article.image_url && (
              <div className="my-8">
                  <Image
                      src={article.image_url}
                      alt={article.title}
                      width={1200}
                      height={675}
                      className="aspect-video rounded-xl bg-gray-50 object-cover"
                  />
              </div>
          )}
          <div
            className="mt-10 prose lg:prose-lg max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </div>
  );
}
