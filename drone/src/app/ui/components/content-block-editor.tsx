'use client';

import { useState } from 'react';
import { ContentBlock } from '@/app/lib/types/article';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import MediaUpload from './media-upload';
import { v4 as uuidv4 } from 'uuid';

interface ContentBlockEditorProps {
    blocks: ContentBlock[];
    onChange: (blocks: ContentBlock[]) => void;
    folder: 'articles' | 'courses';
    subfolder?: string;
}

const field =
    'rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]';

export default function ContentBlockEditor({ blocks, onChange, folder, subfolder }: ContentBlockEditorProps) {
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

    const addBlock = (type: ContentBlock['type']) => {
        const newBlock: ContentBlock = {
            id: uuidv4(),
            type,
            content: '',
        };
        onChange([...blocks, newBlock]);
        setExpandedBlockId(newBlock.id);
    };

    const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
        onChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    };

    const removeBlock = (id: string) => {
        onChange(blocks.filter((b) => b.id !== id));
    };

    const moveBlock = (index: number, direction: -1 | 1) => {
        const newBlocks = [...blocks];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newBlocks.length) return;
        [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
        onChange(newBlocks);
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-[var(--brand-foreground)]">Content Blocks</label>

            {blocks.map((block, index) => (
                <div key={block.id} className="border border-[var(--surface-border)] rounded-lg p-4 bg-[var(--comment-secondary-bg)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)] bg-[var(--surface)] border border-[var(--surface-border)] px-2 py-1 rounded">
                                {block.type}
                            </span>
                            <span className="text-xs text-[var(--brand-muted)]">#{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => moveBlock(index, -1)}
                                disabled={index === 0}
                                className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] disabled:opacity-30"
                            >
                                <ArrowUpIcon className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveBlock(index, 1)}
                                disabled={index === blocks.length - 1}
                                className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] disabled:opacity-30"
                            >
                                <ArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                                className="px-2 py-1 text-xs text-[var(--brand-primary)] hover:opacity-90"
                            >
                                {expandedBlockId === block.id ? 'Collapse' : 'Edit'}
                            </button>
                            <button type="button" onClick={() => removeBlock(block.id)} className="p-1 text-red-400 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {expandedBlockId === block.id && (
                        <BlockEditor
                            block={block}
                            onUpdate={(updates) => updateBlock(block.id, updates)}
                            folder={folder}
                            subfolder={subfolder}
                        />
                    )}

                    {expandedBlockId !== block.id && block.content && (
                        <p className="text-sm text-[var(--brand-muted)] truncate">
                            {block.type === 'text'
                                ? block.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
                                : block.content}
                        </p>
                    )}
                </div>
            ))}

            <div className="flex gap-2 pt-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => addBlock('text')}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--brand-foreground)] bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--comment-secondary-bg)]"
                >
                    <PlusIcon className="h-4 w-4" /> Text
                </button>
                <button
                    type="button"
                    onClick={() => addBlock('image')}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--brand-foreground)] bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--comment-secondary-bg)]"
                >
                    <PlusIcon className="h-4 w-4" /> Image
                </button>
                <button
                    type="button"
                    onClick={() => addBlock('video')}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--brand-foreground)] bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--comment-secondary-bg)]"
                >
                    <PlusIcon className="h-4 w-4" /> Video
                </button>
            </div>
        </div>
    );
}

function BlockEditor({
    block,
    onUpdate,
    folder,
    subfolder,
}: {
    block: ContentBlock;
    onUpdate: (updates: Partial<ContentBlock>) => void;
    folder: 'articles' | 'courses';
    subfolder?: string;
}) {
    if (block.type === 'text') {
        return (
            <textarea
                value={block.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                rows={6}
                placeholder="Enter HTML content..."
                className={`w-full ${field} text-sm font-mono`}
            />
        );
    }

    if (block.type === 'image') {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={block.content}
                        onChange={(e) => onUpdate({ content: e.target.value })}
                        placeholder="Image URL (or upload below)"
                        className={`flex-1 ${field} text-sm`}
                    />
                    <MediaUpload
                        folder={folder}
                        subfolder={subfolder}
                        accept="image/*"
                        label="Upload"
                        onUploadComplete={(url) => onUpdate({ content: url })}
                    />
                </div>
                <input
                    type="text"
                    value={block.alt || ''}
                    onChange={(e) => onUpdate({ alt: e.target.value })}
                    placeholder="Alt text"
                    className={`w-full ${field} text-sm`}
                />
                <input
                    type="text"
                    value={block.caption || ''}
                    onChange={(e) => onUpdate({ caption: e.target.value })}
                    placeholder="Caption (optional)"
                    className={`w-full ${field} text-sm`}
                />
                {block.content && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.content} alt={block.alt || ''} className="max-h-48 rounded-lg object-contain" />
                )}
            </div>
        );
    }

    if (block.type === 'video') {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={block.content}
                        onChange={(e) => onUpdate({ content: e.target.value })}
                        placeholder="Video URL (YouTube, Vimeo, or direct MP4/WebM link)"
                        className={`flex-1 ${field} text-sm`}
                    />
                    <MediaUpload
                        folder={folder}
                        subfolder={subfolder}
                        accept="video/*"
                        label="Upload"
                        onUploadComplete={(url) => onUpdate({ content: url })}
                    />
                </div>
                <input
                    type="text"
                    value={block.caption || ''}
                    onChange={(e) => onUpdate({ caption: e.target.value })}
                    placeholder="Caption (optional)"
                    className={`w-full ${field} text-sm`}
                />
            </div>
        );
    }

    return null;
}
