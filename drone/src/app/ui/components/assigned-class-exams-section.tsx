'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AcademicCapIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { getAssignedClassExams } from '@/app/lib/api-client';
import type { AssignedClassExam } from '@/app/lib/types/question';

interface AssignedClassExamsSectionProps {
    courseId: number;
}

function formatDueDate(due: string | null): string | null {
    if (!due) return null;
    try {
        return new Date(due).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return null;
    }
}

export default function AssignedClassExamsSection({ courseId }: AssignedClassExamsSectionProps) {
    const [assignments, setAssignments] = useState<AssignedClassExam[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getAssignedClassExams();
            setAssignments(all.filter((a) => a.course_id === courseId));
        } catch {
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading || assignments.length === 0) return null;

    return (
        <section className="mt-10 pt-8 border-t border-[var(--surface-border)]">
            <h2 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
                Assigned by your teacher
            </h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Class exams from your organization. Scores are shared with your instructor.
            </p>
            <div className="mt-4 grid gap-4">
                {assignments.map((assignment) => {
                    const due = formatDueDate(assignment.due_date);
                    const href = `/courses/${courseId}/exams/assigned/${assignment.exam_id}`;
                    return (
                        <div
                            key={assignment.class_exam_id}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 border border-[var(--surface-border)] bg-[var(--surface)]"
                            style={{ borderRadius: 'var(--radius-md)' }}
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg shrink-0">
                                    <AcademicCapIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-display font-semibold text-[var(--brand-foreground)]">
                                        {assignment.label ?? 'Class exam'}
                                    </p>
                                    <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                                        {assignment.question_count} questions
                                        {due ? ` · Due ${due}` : ''}
                                    </p>
                                    {assignment.attempt && (
                                        <p className="text-xs font-mono mt-1 text-[var(--brand-primary)]">
                                            Score: {assignment.attempt.score}%
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Link
                                href={href}
                                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity shrink-0"
                                style={{ borderRadius: 'var(--radius-sm)' }}
                            >
                                {assignment.attempt ? 'Review exam' : 'Take exam'}
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
