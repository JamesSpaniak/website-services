'use client';

import { useState } from 'react';
import { ArticleCreateDto, ArticleFull, ContentBlock } from '@/app/lib/types/article';
import { createArticle, updateArticle } from '@/app/lib/api-client';
import ContentBlockEditor from './content-block-editor';
import MediaUpload from './media-upload';

interface ArticleEditorProps {
    article?: ArticleFull;
    onSave: (article: ArticleFull) => void;
    onCancel: () => void;
}

export default function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
    const [title, setTitle] = useState(article?.title || '');
    const [subHeading, setSubHeading] = useState(article?.sub_heading || '');
    const [imageUrl, setImageUrl] = useState(article?.image_url || '');
    const [body, setBody] = useState(article?.body || '');
    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(article?.content_blocks || []);
    const [hidden, setHidden] = useState(article?.hidden ?? false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useBlocks, setUseBlocks] = useState(
        (article?.content_blocks && article.content_blocks.length > 0) || false
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const dto: ArticleCreateDto = {
            title,
            sub_heading: subHeading,
            image_url: imageUrl || undefined,
            body: useBlocks ? '' : body,
            content_blocks: useBlocks ? contentBlocks : undefined,
            hidden,
        };

        try {
            let saved: ArticleFull;
            if (article?.id) {
                saved = await updateArticle(article.id, dto);
            } else {
                saved = await createArticle(dto);
            }
            onSave(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save article');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900">
                {article?.id ? 'Edit Article' : 'New Article'}
            </h2>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Sub Heading</label>
                <input type="text" value={subHeading} onChange={(e) => setSubHeading(e.target.value)} required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Hero Image</label>
                <div className="mt-1 flex items-center gap-3">
                    <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Image URL"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    <MediaUpload
                        folder="articles"
                        subfolder={article?.id ? String(article.id) : undefined}
                        accept="image/*"
                        label="Upload"
                        onUploadComplete={(url) => setImageUrl(url)}
                    />
                </div>
                {imageUrl && <img src={imageUrl} alt="Hero preview" className="mt-2 max-h-48 rounded-lg object-contain" />}
            </div>

            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Hidden</label>
                <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </div>

            <div className="border-t pt-6">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-medium text-gray-700">Content Mode:</span>
                    <button type="button" onClick={() => setUseBlocks(false)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${!useBlocks ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        HTML Body
                    </button>
                    <button type="button" onClick={() => setUseBlocks(true)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${useBlocks ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        Content Blocks
                    </button>
                </div>

                {useBlocks ? (
                    <ContentBlockEditor
                        blocks={contentBlocks}
                        onChange={setContentBlocks}
                        folder="articles"
                        subfolder={article?.id ? String(article.id) : undefined}
                    />
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Body (HTML)</label>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12}
                            placeholder="Enter HTML content..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm" />
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
                <button type="submit" disabled={saving}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : (article?.id ? 'Update Article' : 'Create Article')}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                </button>
            </div>
        </form>
    );
}
