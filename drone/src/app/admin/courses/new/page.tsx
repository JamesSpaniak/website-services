'use client';

import { useRouter } from 'next/navigation';
import CourseEditor from '@/app/ui/components/course-editor';

export default function NewCoursePage() {
    const router = useRouter();
    return (
        <CourseEditor
            onSave={() => router.push('/admin/courses')}
            onCancel={() => router.push('/admin/courses')}
        />
    );
}
