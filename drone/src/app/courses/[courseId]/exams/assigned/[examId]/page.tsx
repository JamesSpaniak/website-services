'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ExamPlayer from '@/app/ui/components/exam-player';
import CourseExamBreadcrumb from '@/app/ui/components/course-exam-breadcrumb';
import AuthGuard from '@/app/lib/auth-guard';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { getAssignedClassExams, getPublicCourseById } from '@/app/lib/api-client';
import type { AssignedClassExam } from '@/app/lib/types/question';
import type { CourseData } from '@/app/lib/types/course';

function AssignedExamPageInner() {
    const { courseId, examId } = useParams();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [assignment, setAssignment] = useState<AssignedClassExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const id = parseInt(String(courseId), 10);
    const examIdNum = parseInt(String(examId), 10);

    const reload = useCallback(async () => {
        const assignments = await getAssignedClassExams();
        const match = assignments.find(
            (a) => a.course_id === id && a.exam_id === examIdNum,
        );
        setAssignment(match ?? null);
    }, [id, examIdNum]);

    useEffect(() => {
        if (Number.isNaN(id) || Number.isNaN(examIdNum)) {
            setError('Invalid exam.');
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [courseData, assignments] = await Promise.all([
                    getPublicCourseById(id),
                    getAssignedClassExams(),
                ]);
                if (cancelled) return;
                courseData.id = id;
                setCourse(courseData);

                const match = assignments.find(
                    (a) => a.course_id === id && a.exam_id === examIdNum,
                );
                if (!match) {
                    setError('This exam is not assigned to you.');
                    return;
                }
                setAssignment(match);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Failed to load exam');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, examIdNum]);

    if (loading) return <LoadingComponent />;
    if (error) return <ErrorComponent message={error} />;
    if (!course || !assignment) {
        return <ErrorComponent message="Exam not found." />;
    }

    const crumbs = [
        { label: 'Courses', href: '/courses' },
        { label: course.title, href: `/courses/${id}` },
        { label: 'Exams', href: `/courses/${id}/exams` },
        { label: assignment.label ?? 'Assigned' },
    ];

    return (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <CourseExamBreadcrumb crumbs={crumbs} />
            <header className="mb-8">
                <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl">
                    {assignment.label ?? 'Assigned exam'}
                </h1>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">{course.title}</p>
            </header>
            <ExamPlayer
                key={`assigned-${assignment.exam_id}-${assignment.attempt?.taken_at ?? 'new'}`}
                courseId={id}
                examId={assignment.exam_id}
                scope={assignment.scope}
                label={assignment.label ?? 'Assigned exam'}
                questionCount={assignment.question_count}
                generateButtonLabel="Start assigned exam"
                showTopBorder={false}
                variant="page"
                hideRetake
                onSubmitted={reload}
            />
        </div>
    );
}

export default function AssignedExamPage() {
    return (
        <AuthGuard>
            <AssignedExamPageInner />
        </AuthGuard>
    );
}
