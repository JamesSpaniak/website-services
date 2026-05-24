'use client';

import CourseExamCard, { type CourseExamScore } from './course-exam-card';

const QUESTION_COUNT = 60;

export interface CourseExamSummary {
    practice?: CourseExamScore | null;
    final?: CourseExamScore | null;
}

interface CourseExamsSectionProps {
    courseId: number;
    examSummary?: CourseExamSummary | null;
    compact?: boolean;
}

export default function CourseExamsSection({
    courseId,
    examSummary,
    compact = false,
}: CourseExamsSectionProps) {
    const base = `/courses/${courseId}/exams`;

    return (
        <section id="course-exams" className={compact ? 'mt-6' : 'mt-10 scroll-mt-24'}>
            <h2 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
                Course exams
            </h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Full-length practice and chart-heavy finals. Each attempt is randomized from the question bank.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <CourseExamCard
                    variant="practice"
                    title="Full-course practice exam"
                    description="All course topics except chart-only final items. Use this to gauge readiness before the figures exam."
                    questionCount={QUESTION_COUNT}
                    href={`${base}/practice`}
                    ctaLabel="Start practice exam"
                    lastScore={examSummary?.practice ?? null}
                />
                <CourseExamCard
                    variant="final"
                    title="Charts & figures final"
                    description="Cross-section and chart questions from the FAA-CT-8080-2H supplement. Have the book handy."
                    questionCount={QUESTION_COUNT}
                    href={`${base}/final`}
                    ctaLabel="Start final exam"
                    lastScore={examSummary?.final ?? null}
                />
            </div>
        </section>
    );
}
