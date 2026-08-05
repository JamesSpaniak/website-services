'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CourseData } from '@/app/lib/types/course';
import { getCourses } from '@/app/lib/api-client';
import QuestionBankEditor from '@/app/ui/components/question-bank-editor';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

export default function AdminQuestionsPage() {
    return (
        <Suspense fallback={<LoadingComponent />}>
            <QuestionsPageInner />
        </Suspense>
    );
}

function QuestionsPageInner() {
    const searchParams = useSearchParams();
    const courseParam = searchParams.get('course');
    const initialCourseId = courseParam ? Number(courseParam) : undefined;

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

    if (loading) return <LoadingComponent />;
    if (error) return <ErrorComponent message={error} />;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Question Bank</h2>
                <p className="text-sm text-[var(--brand-muted)] mt-1">
                    Manage questions for each course. Questions are drawn from this bank when generating practice exams.
                </p>
            </div>
            {courses.length === 0 ? (
                <p className="text-sm text-[var(--brand-muted)]">No courses available. Create a course first.</p>
            ) : (
                <QuestionBankEditor courses={courses} initialCourseId={initialCourseId} />
            )}
        </div>
    );
}
