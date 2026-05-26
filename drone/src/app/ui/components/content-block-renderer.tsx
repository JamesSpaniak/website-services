'use client';

import { ContentBlock } from '@/app/lib/types/article';
import { prepareArticleBodyHtml } from '@/app/lib/article-html';
import { ARTICLE_PROSE_BODY_CLASS } from '@/app/lib/article-prose';
import ImageComponent from './image';
import VideoComponent from './video';

interface ContentBlockRendererProps {
    blocks: ContentBlock[];
}

export default function ContentBlockRenderer({ blocks }: ContentBlockRendererProps) {
    return (
        <div className="space-y-8">
            {blocks.map((block) => (
                <ContentBlockItem key={block.id} block={block} />
            ))}
        </div>
    );
}

function ContentBlockItem({ block }: { block: ContentBlock }) {
    switch (block.type) {
        case 'text':
            return (
                <div
                    className={ARTICLE_PROSE_BODY_CLASS}
                    dangerouslySetInnerHTML={{ __html: prepareArticleBodyHtml(block.content) }}
                />
            );

        case 'image':
            return (
                <figure className="my-0">
                    <div
                        className="flex justify-center max-h-[70vh] overflow-hidden bg-[var(--background)]"
                        style={{ borderRadius: 'var(--radius-md)' }}
                    >
                        <ImageComponent
                            src={block.content}
                            alt={block.alt || ''}
                            width={1200}
                            height={675}
                            className="w-full h-auto max-h-[70vh] object-contain"
                            style={{ borderRadius: 'var(--radius-md)' }}
                        />
                    </div>
                    {block.caption && (
                        <figcaption className="mt-2 text-xs text-center text-[var(--brand-muted)] font-mono">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );

        case 'video':
            return (
                <figure>
                    <VideoComponent src={block.content} />
                    {block.caption && (
                        <figcaption className="mt-2 text-xs text-center text-[var(--brand-muted)] font-mono">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );

        default:
            return null;
    }
}
