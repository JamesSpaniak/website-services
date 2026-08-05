'use client';

import { useRouter } from 'next/navigation';
import ArticleEditor from '@/app/ui/components/article-editor';

export default function NewArticlePage() {
    const router = useRouter();
    return (
        <ArticleEditor
            onSave={() => router.push('/admin/articles')}
            onCancel={() => router.push('/admin/articles')}
        />
    );
}
