'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArticleSlim } from '@/app/lib/types/article';

interface ArticlePreviewProps {
  article: ArticleSlim;
}

export default function ArticlePreviewComponent({ article }: ArticlePreviewProps) {
  return (
    <Link href={`/articles/${article.id}`} className="group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-8 pb-8 pt-80 sm:pt-48 lg:pt-80">
      <Image 
        src={article.image_url || '/globe.svg'} 
        alt="" 
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        layout="fill"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40" />
      <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-inset ring-gray-900/10" />

      <div className="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
        <time dateTime={new Date(article.submitted_at).toISOString()} className="mr-8">
          {new Date(article.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-6 text-white">
          <span className="absolute inset-0" />
          {article.title}
      </h3>
    </Link>
  );
}