'use client';

import { ContentBlock } from '@/app/lib/types/article';
import { prepareArticleBodyHtml } from '@/app/lib/article-html';
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
                    className="prose prose-invert prose-sm sm:prose-base max-w-none text-[var(--brand-muted)] prose-headings:text-[var(--brand-foreground)] prose-a:text-[var(--brand-primary)] overflow-hidden break-words [&_figure]:my-8 [&_figure]:max-w-full [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full [&_figcaption]:text-sm [&_figcaption]:text-[var(--brand-muted)]"
                    dangerouslySetInnerHTML={{ __html: prepareArticleBodyHtml(block.content) }}
                />
            );

        case 'image':
            return (
                <figure>
                    <ImageComponent
                        src={block.content}
                        alt={block.alt || ''}
                        width={1200}
                        height={675}
                        className="w-full object-cover"
                        style={{ borderRadius: 'var(--radius-md)' }}
                    />
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
