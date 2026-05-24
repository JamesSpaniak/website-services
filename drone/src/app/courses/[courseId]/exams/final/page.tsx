'use client';

import ExamPlayer from '@/app/ui/components/exam-player';
import CourseExamPageShell from '@/app/ui/components/course-exam-page-shell';
import type { CourseData } from '@/app/lib/types/course';

export default function FinalExamPage() {
    return (
        <CourseExamPageShell pageTitle="Charts & figures final" currentCrumb="Final">
            {(course: CourseData, reload) => (
                <>
                    <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-100/90">
                        <p className="font-medium text-amber-200">FAA-CT-8080-2H supplement required</p>
                        <p className="mt-1 text-amber-100/80">
                            Many questions refer to figures in the chart supplement. Keep the book open while you
                            take this exam.
                        </p>
                    </div>
                    <ExamPlayer
                        key={`final-${course.exam_summary?.final?.taken_at ?? 'new'}`}
                        courseId={course.id}
                        scope="full_course"
                        label="Charts & figures"
                        examPool="final_only"
                        questionCount={60}
                        generateButtonLabel="Start final exam"
                        showTopBorder={false}
                        variant="page"
                        onSubmitted={reload}
                    />
                </>
            )}
        </CourseExamPageShell>
    );
}
