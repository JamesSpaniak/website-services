'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseById } from '@/app/lib/api-client';
import type { CourseData } from '@/app/lib/types/course';
import AuthGuard from '@/app/lib/auth-guard';
import LoadingComponent from './loading';
import ErrorComponent from './error';
import CourseExamBreadcrumb from './course-exam-breadcrumb';

interface CourseExamPageShellProps {
    pageTitle: string;
    currentCrumb: string;
    children: (course: CourseData, reload: () => Promise<void>) => ReactNode;
}

function CourseExamPageInner({ pageTitle, currentCrumb, children }: CourseExamPageShellProps) {
    const { courseId } = useParams();
    const router = useRouter();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const id = parseInt(String(courseId), 10);

    const loadCourse = useCallback(async () => {
        if (!courseId || Number.isNaN(id)) {
            setError('Invalid course.');
            return;
        }
        setError(null);
        const data = await getCourseById(id);
        data.id = id;
        setCourse(data);
    }, [courseId, id]);

    useEffect(() => {
        if (!courseId || Number.isNaN(id)) {
            setLoading(false);
            setError('Invalid course.');
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                await loadCourse();
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Failed to load course');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [courseId, id, loadCourse]);

    if (loading) return <LoadingComponent />;
    if (error) return <ErrorComponent message={error} />;
    if (!course) return <ErrorComponent message="Course not found." />;

    if (course.has_access === false && course.price && course.price > 0) {
        router.replace(`/courses/${id}`);
        return <LoadingComponent />;
    }

    const crumbs = [
        { label: 'Courses', href: '/courses' },
        { label: course.title, href: `/courses/${id}` },
        { label: 'Exams', href: `/courses/${id}/exams` },
        { label: currentCrumb },
    ];

    return (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <CourseExamBreadcrumb crumbs={crumbs} />
            <header className="mb-8">
                <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl">
                    {pageTitle}
                </h1>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">{course.title}</p>
            </header>
            {children(course, loadCourse)}
        </div>
    );
}

export default function CourseExamPageShell(props: CourseExamPageShellProps) {
    return (
        <AuthGuard>
            <CourseExamPageInner {...props} />
        </AuthGuard>
    );
}
