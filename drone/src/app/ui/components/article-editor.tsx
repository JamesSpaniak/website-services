'use client';

import { useState } from 'react';
import { ArticleCreateDto, ArticleFull, ContentBlock } from '@/app/lib/types/article';
import { createArticle, updateArticle } from '@/app/lib/api-client';
import { prepareArticleBodyHtml } from '@/app/lib/article-html';
import { tryParseArticleImportJson, type ArticleImportResult } from '@/app/lib/article-import-json';
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
    const [body, setBody] = useState(() =>
        article?.body ? prepareArticleBodyHtml(article.body) : ''
    );
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

        let effectiveTitle = title.trim();
        let effectiveSub = subHeading.trim();
        let effectiveImg = imageUrl.trim();
        let effectiveBody = body;

        if (!useBlocks && body.trim().startsWith('{')) {
            const imp = tryParseArticleImportJson(body.trim());
            if (imp) {
                effectiveTitle = imp.title || effectiveTitle;
                effectiveSub = imp.sub_heading || effectiveSub || 'Overview and key points.';
                effectiveImg = imp.image_url || effectiveImg;
                effectiveBody = imp.body;
            } else {
                effectiveBody = prepareArticleBodyHtml(body);
            }
        } else if (!useBlocks) {
            effectiveBody = prepareArticleBodyHtml(body);
        }

        if (!effectiveTitle) {
            setError('Title is required (paste full article JSON into the body field to auto-fill title and other fields).');
            setSaving(false);
            return;
        }
        if (!effectiveSub) {
            effectiveSub = 'Overview and key points.';
        }

        const dto: ArticleCreateDto = {
            title: effectiveTitle,
            sub_heading: effectiveSub,
            image_url: effectiveImg || undefined,
            body: useBlocks ? '' : effectiveBody,
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

    const input =
        'mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]';

    const applyJsonImport = (imp: ArticleImportResult) => {
        setTitle(imp.title);
        setSubHeading(imp.sub_heading);
        setImageUrl(imp.image_url);
        setBody(imp.body);
        setUseBlocks(false);
    };

    const handleJsonPaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text/plain');
        const imp = tryParseArticleImportJson(text);
        if (!imp) return;
        e.preventDefault();
        applyJsonImport(imp);
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-4xl">
            <h2 className="text-2xl font-bold text-[var(--brand-foreground)]">
                {article?.id ? 'Edit Article' : 'New Article'}
            </h2>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-[var(--brand-foreground)]">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onPaste={handleJsonPaste} className={input} />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--brand-foreground)]">Sub Heading</label>
                <input type="text" value={subHeading} onChange={(e) => setSubHeading(e.target.value)} onPaste={handleJsonPaste} className={input} />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--brand-foreground)]">Hero Image</label>
                <div className="mt-1 flex items-center gap-3">
                    <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Image URL"
                        className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                    <MediaUpload
                        folder="articles"
                        subfolder={article?.id ? String(article.id) : undefined}
                        accept="image/*"
                        label="Upload"
                        onUploadComplete={(url) => setImageUrl(url)}
                    />
                </div>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Hero preview" className="mt-2 max-h-48 rounded-lg object-contain" />
                )}
            </div>

            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-[var(--brand-foreground)]">Hidden</label>
                <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)}
                    className="rounded border-[var(--input-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
            </div>

            <div className="border-t border-[var(--surface-border)] pt-6">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <span className="text-sm font-medium text-[var(--brand-foreground)]">Content Mode:</span>
                    <button type="button" onClick={() => setUseBlocks(false)}
                        className={`px-3 py-1.5 text-sm rounded-lg border ${!useBlocks ? 'bg-[var(--brand-primary)] text-[var(--background)] border-transparent' : 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] border-[var(--surface-border)] hover:bg-[var(--surface-border)]'}`}>
                        HTML Body
                    </button>
                    <button type="button" onClick={() => setUseBlocks(true)}
                        className={`px-3 py-1.5 text-sm rounded-lg border ${useBlocks ? 'bg-[var(--brand-primary)] text-[var(--background)] border-transparent' : 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] border-[var(--surface-border)] hover:bg-[var(--surface-border)]'}`}>
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
                        <label className="block text-sm font-medium text-[var(--brand-foreground)]">Body (HTML)</label>
                        <p className="text-xs text-[var(--brand-muted)] mb-2">
                            You can paste a <strong>full</strong> <code className="font-mono text-[var(--brand-subtle)]">news/articles/*.json</code> export (title, sub_heading, hero_image, body_html, seo_phrases)—fields
                            auto-fill and <code className="font-mono">seo_phrases</code> are appended to the HTML body. Or paste HTML only; saving also accepts JSON in the body field without filling title first.
                        </p>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} onPaste={handleJsonPaste} rows={12}
                            placeholder="Enter HTML or paste full article JSON..."
                            className={`${input} font-mono text-sm whitespace-pre-wrap`} />
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-[var(--surface-border)]">
                <button type="submit" disabled={saving}
                    className="px-6 py-2.5 text-sm font-semibold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Saving...' : (article?.id ? 'Update Article' : 'Create Article')}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-[var(--brand-foreground)] bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--comment-secondary-bg)]">
                    Cancel
                </button>
            </div>
        </form>
    );
}
