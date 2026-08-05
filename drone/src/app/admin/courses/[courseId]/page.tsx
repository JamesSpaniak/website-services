'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CourseData } from '@/app/lib/types/course';
import { getCourseById } from '@/app/lib/api-client';
import CourseEditor from '@/app/ui/components/course-editor';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

export default function EditCoursePage() {
    const router = useRouter();
    const params = useParams<{ courseId: string }>();
    const courseId = Number(params.courseId);

    const [course, setCourse] = useState<CourseData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!Number.isFinite(courseId)) {
            setError('Invalid course id.');
            return;
        }
        // List endpoint strips `sub_units` for each unit; load full payload for editing.
        (async () => {
            try {
                setCourse(await getCourseById(courseId));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load course');
            }
        })();
    }, [courseId]);

    if (error) return <ErrorComponent message={error} />;
    if (!course) return <LoadingComponent />;

    return (
        <div>
            <div className="flex items-center justify-end mb-4">
                <Link
                    href={`/admin/questions?course=${course.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:underline"
                >
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    Question bank for this course
                </Link>
            </div>
            <CourseEditor
                course={course}
                onSave={() => router.push('/admin/courses')}
                onCancel={() => router.push('/admin/courses')}
            />
        </div>
    );
}
