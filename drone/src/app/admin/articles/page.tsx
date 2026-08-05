'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArticleFull } from '@/app/lib/types/article';
import { getAllArticlesAdmin, deleteArticle } from '@/app/lib/api-client';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

export default function AdminArticlesPage() {
    const [articles, setArticles] = useState<ArticleFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setArticles(await getAllArticlesAdmin());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load articles');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this article?')) return;
        try {
            await deleteArticle(id);
            setArticles((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete article');
        }
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {error && <ErrorComponent message={error} />}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Articles ({articles.length})</h2>
                <Link href="/admin/articles/new"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
                    <PlusIcon className="h-4 w-4" /> New Article
                </Link>
            </div>

            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--surface-border)]">
                    <thead className="bg-[var(--comment-secondary-bg)]">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Title</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Status</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Media</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Date</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border)]">
                        {articles.map((article) => (
                            <tr key={article.id} className="hover:bg-[var(--comment-secondary-bg)]">
                                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-[var(--brand-foreground)] max-w-[200px] truncate">{article.title}</td>
                                <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap">
                                    {article.hidden ? (
                                        <span className="inline-flex items-center gap-1 text-yellow-600"><EyeSlashIcon className="h-4 w-4" /> Hidden</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-green-600"><EyeIcon className="h-4 w-4" /> Published</span>
                                    )}
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                    {article.image_url ? 'Has image' : ''}
                                    {article.content_blocks?.length ? ` | ${article.content_blocks.length} blocks` : ''}
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] whitespace-nowrap">
                                    {new Date(article.submitted_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link href={`/admin/articles/${article.id}`}
                                            className="p-1.5 text-[var(--brand-primary)] hover:opacity-90 rounded hover:bg-[var(--comment-secondary-bg)]"
                                            aria-label={`Edit ${article.title}`}>
                                            <PencilSquareIcon className="h-4 w-4" />
                                        </Link>
                                        <button onClick={() => handleDelete(article.id)}
                                            className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                            aria-label={`Delete ${article.title}`}>
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {articles.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--brand-muted)]">No articles yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
