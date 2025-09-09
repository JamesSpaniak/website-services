'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourseById } from '@/app/lib/api-client';
import CourseComponent from '@/app/ui/components/course';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { CourseData } from '@/app/lib/types/course';
import AuthGuard from '@/app/lib/auth-guard';

function SingleCoursePage() {
    const { courseId } = useParams();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId) {
            setLoading(false);
            return;
        }

        const fetchCourse = async () => {
            setLoading(true);
            try {
                const courseData = await getCourseById(parseInt(courseId as string));
                setCourse(courseData);
            } catch (e) {
                if (e instanceof Error) {
                    setError(e);
                } else {
                    setError(new Error(`An unknown error occurred while fetching course ${courseId}.`));
                }
            }
            setLoading(false);
        };

        fetchCourse();
    }, [courseId]);

    if (loading) {
        return <LoadingComponent />;
    }

    if (error) {
        return <ErrorComponent message={error.message} />;
    }

    if (!course) {
        return <ErrorComponent message="Course not found." />;
    }
    course.id = parseInt(courseId as string);
    return <CourseComponent {...course} />;
}

/**
 * This is the page export, which wraps the page content with our AuthGuard.
 */
export default function ProtectedCoursePage() {
    return (
        <AuthGuard>
            <SingleCoursePage />
        </AuthGuard>
    );
}