'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseById } from '@/app/lib/api-client';
import type { CourseData } from '@/app/lib/types/course';
import AuthGuard from '@/app/lib/auth-guard';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import CourseExamBreadcrumb from '@/app/ui/components/course-exam-breadcrumb';
import CourseExamsSection from '@/app/ui/components/course-exams-section';

function ExamsHubPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const didInitialLoad = useRef(false);

    const id = parseInt(String(courseId), 10);

    const load = useCallback(async (showSpinner = true) => {
        if (Number.isNaN(id)) {
            setError('Invalid course.');
            setLoading(false);
            return;
        }
        if (showSpinner) setLoading(true);
        setError(null);
        try {
            const data = await getCourseById(id);
            data.id = id;
            setCourse(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load course');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
        didInitialLoad.current = true;
    }, [load]);

    useEffect(() => {
        const onFocus = () => {
            if (didInitialLoad.current) load(false);
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [load]);

    if (loading) return <LoadingComponent />;
    if (error) return <ErrorComponent message={error} />;
    if (!course) return <ErrorComponent message="Course not found." />;

    if (course.has_access === false && course.price && course.price > 0) {
        router.replace(`/courses/${id}`);
        return <LoadingComponent />;
    }

    return (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <CourseExamBreadcrumb
                crumbs={[
                    { label: 'Courses', href: '/courses' },
                    { label: course.title, href: `/courses/${id}` },
                    { label: 'Exams' },
                ]}
            />
            <header className="mb-8">
                <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl">
                    Course exams
                </h1>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">{course.title}</p>
            </header>
            <CourseExamsSection courseId={id} examSummary={course.exam_summary} compact />
        </div>
    );
}

export default function ProtectedExamsHubPage() {
    return (
        <AuthGuard>
            <ExamsHubPage />
        </AuthGuard>
    );
}
