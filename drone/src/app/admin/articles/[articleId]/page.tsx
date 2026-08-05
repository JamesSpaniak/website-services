'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArticleFull } from '@/app/lib/types/article';
import { getArticleById } from '@/app/lib/api-client';
import ArticleEditor from '@/app/ui/components/article-editor';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

export default function EditArticlePage() {
    const router = useRouter();
    const params = useParams<{ articleId: string }>();
    const articleId = Number(params.articleId);

    const [article, setArticle] = useState<ArticleFull | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!Number.isFinite(articleId)) {
            setError('Invalid article id.');
            return;
        }
        (async () => {
            try {
                setArticle(await getArticleById(articleId));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load article');
            }
        })();
    }, [articleId]);

    if (error) return <ErrorComponent message={error} />;
    if (!article) return <LoadingComponent />;

    return (
        <ArticleEditor
            article={article}
            onSave={() => router.push('/admin/articles')}
            onCancel={() => router.push('/admin/articles')}
        />
    );
}
