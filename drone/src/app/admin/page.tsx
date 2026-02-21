'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/app/ui/components/admin-guard';
import { ArticleFull } from '@/app/lib/types/article';
import { CourseData } from '@/app/lib/types/course';
import { getAllArticlesAdmin, getCourses, deleteArticle, deleteCourse } from '@/app/lib/api-client';
import ArticleEditor from '@/app/ui/components/article-editor';
import CourseEditor from '@/app/ui/components/course-editor';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

type EditorState =
    | { type: 'none' }
    | { type: 'article'; article?: ArticleFull }
    | { type: 'course'; course?: CourseData };

export default function AdminPage() {
    return (
        <AdminGuard>
            <AdminDashboard />
        </AdminGuard>
    );
}

function AdminDashboard() {
    const [tab, setTab] = useState<'articles' | 'courses'>('articles');
    const [articles, setArticles] = useState<ArticleFull[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editor, setEditor] = useState<EditorState>({ type: 'none' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [articlesData, coursesData] = await Promise.all([
                getAllArticlesAdmin(),
                getCourses(),
            ]);
            setArticles(articlesData);
            setCourses(coursesData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteArticle = async (id: number) => {
        if (!confirm('Are you sure you want to delete this article?')) return;
        try {
            await deleteArticle(id);
            setArticles(articles.filter(a => a.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete article');
        }
    };

    const handleDeleteCourse = async (id: number) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
            await deleteCourse(id);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete course');
        }
    };

    const handleArticleSaved = (saved: ArticleFull) => {
        setArticles(prev => {
            const idx = prev.findIndex(a => a.id === saved.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
            }
            return [saved, ...prev];
        });
        setEditor({ type: 'none' });
    };

    const handleCourseSaved = (saved: CourseData) => {
        setCourses(prev => {
            const idx = prev.findIndex(c => c.id === saved.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
            }
            return [saved, ...prev];
        });
        setEditor({ type: 'none' });
    };

    if (loading) return <LoadingComponent />;

    if (editor.type === 'article') {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <ArticleEditor
                    article={editor.article}
                    onSave={handleArticleSaved}
                    onCancel={() => setEditor({ type: 'none' })}
                />
            </div>
        );
    }

    if (editor.type === 'course') {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <CourseEditor
                    course={editor.course}
                    onSave={handleCourseSaved}
                    onCancel={() => setEditor({ type: 'none' })}
                />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">Manage articles, courses, and media content.</p>
            </div>

            {error && <ErrorComponent message={error} />}

            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex gap-6">
                        <button onClick={() => setTab('articles')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'articles'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}>
                            Articles ({articles.length})
                        </button>
                        <button onClick={() => setTab('courses')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'courses'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}>
                            Courses ({courses.length})
                        </button>
                    </nav>
                </div>
            </div>

            {tab === 'articles' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Articles</h2>
                        <button onClick={() => setEditor({ type: 'article' })}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            <PlusIcon className="h-4 w-4" /> New Article
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {articles.map((article) => (
                                    <tr key={article.id} className="hover:bg-gray-50">
                                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">{article.title}</td>
                                        <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap">
                                            {article.hidden ? (
                                                <span className="inline-flex items-center gap-1 text-yellow-600"><EyeSlashIcon className="h-4 w-4" /> Hidden</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-green-600"><EyeIcon className="h-4 w-4" /> Published</span>
                                            )}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">
                                            {article.image_url ? 'Has image' : ''}
                                            {article.content_blocks?.length ? ` | ${article.content_blocks.length} blocks` : ''}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {new Date(article.submitted_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setEditor({ type: 'article', article })}
                                                    className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                                                    aria-label={`Edit ${article.title}`}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteArticle(article.id)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                    aria-label={`Delete ${article.title}`}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {articles.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No articles yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'courses' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Courses</h2>
                        <button onClick={() => setEditor({ type: 'course' })}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            <PlusIcon className="h-4 w-4" /> New Course
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-gray-50">
                                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">{course.title}</td>
                                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{course.price > 0 ? `$${course.price}` : 'Free'}</td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">{course.units?.length || 0}</td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">
                                            {course.image_url ? 'Image' : ''}
                                            {course.video_url ? ' Video' : ''}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setEditor({ type: 'course', course })}
                                                    className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                                                    aria-label={`Edit ${course.title}`}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteCourse(course.id)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                    aria-label={`Delete ${course.title}`}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {courses.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No courses yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
