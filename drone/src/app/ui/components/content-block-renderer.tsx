'use client';

import { ContentBlock } from '@/app/lib/types/article';
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
                    className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-600 prose-img:rounded-xl overflow-hidden break-words"
                    dangerouslySetInnerHTML={{ __html: block.content }}
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
                        className="w-full rounded-xl bg-gray-50 object-cover"
                    />
                    {block.caption && (
                        <figcaption className="mt-2 text-sm text-center text-gray-500">
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
                        <figcaption className="mt-2 text-sm text-center text-gray-500">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );

        default:
            return null;
    }
}
