'use client';

import ExamPlayer from '@/app/ui/components/exam-player';
import CourseExamPageShell from '@/app/ui/components/course-exam-page-shell';
import type { CourseData } from '@/app/lib/types/course';

export default function PracticeExamPage() {
    return (
        <CourseExamPageShell pageTitle="Full-course practice exam" currentCrumb="Practice">
            {(course: CourseData, reload) => (
                <ExamPlayer
                    key={`practice-${course.exam_summary?.practice?.taken_at ?? 'new'}`}
                    courseId={course.id}
                    scope="full_course"
                    label="Full course"
                    examPool="scoped"
                    questionCount={60}
                    generateButtonLabel="Start practice exam"
                    showTopBorder={false}
                    variant="page"
                    onSubmitted={reload}
                />
            )}
        </CourseExamPageShell>
    );
}
