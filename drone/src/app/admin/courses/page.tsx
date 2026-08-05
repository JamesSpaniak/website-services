'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CourseData } from '@/app/lib/types/course';
import { getCourses, deleteCourse } from '@/app/lib/api-client';
import { mergeCourseImages } from '@/app/lib/course-images';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, PencilSquareIcon, TrashIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

export default function AdminCoursesPage() {
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setCourses(await getCourses());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load courses');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
            await deleteCourse(id);
            setCourses((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete course');
        }
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {error && <ErrorComponent message={error} />}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Courses ({courses.length})</h2>
                <Link href="/admin/courses/new"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
                    <PlusIcon className="h-4 w-4" /> New Course
                </Link>
            </div>

            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--surface-border)]">
                    <thead className="bg-[var(--comment-secondary-bg)]">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Title</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Price</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Units</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Media</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border)]">
                        {courses.map((course) => (
                            <tr key={course.id} className="hover:bg-[var(--comment-secondary-bg)]">
                                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-[var(--brand-foreground)] max-w-[200px] truncate">{course.title}</td>
                                <td className="px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] whitespace-nowrap">{course.price > 0 ? `$${course.price}` : 'Free'}</td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{course.units?.length || 0}</td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                    {mergeCourseImages(course).length ? 'Image' : ''}
                                    {course.video_url ? ' Video' : ''}
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link href={`/admin/questions?course=${course.id}`}
                                            className="p-1.5 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded hover:bg-[var(--comment-secondary-bg)]"
                                            aria-label={`Question bank for ${course.title}`}
                                            title="Question bank">
                                            <ClipboardDocumentListIcon className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/admin/courses/${course.id}`}
                                            className="p-1.5 text-[var(--brand-primary)] hover:opacity-90 rounded hover:bg-[var(--comment-secondary-bg)]"
                                            aria-label={`Edit ${course.title}`}
                                            title="Edit course">
                                            <PencilSquareIcon className="h-4 w-4" />
                                        </Link>
                                        <button onClick={() => handleDelete(course.id)}
                                            className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                            aria-label={`Delete ${course.title}`}
                                            title="Delete course">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {courses.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--brand-muted)]">No courses yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
