'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourse } from '@/app/lib/api_client';
import { useAuth } from '@/app/lib/auth-context';
import { CourseData } from '@/app/lib/data/units';
import CourseComponent from '@/app/ui/components/course';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

export default function SingleCoursePage() {
    const { courseId } = useParams();
    const { token, isLoading: isAuthLoading } = useAuth();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading || !token || !courseId) {
            if (!token && !isAuthLoading) setLoading(false);
            return;
        }

        const fetchCourse = async () => {
            setLoading(true);
            const courseData = await getCourse(courseId as string, token);

            if (courseData instanceof Error) {
                setError(courseData.message);
            } else {
                setCourse(courseData);
            }
            setLoading(false);
        };

        fetchCourse();
    }, [courseId, token, isAuthLoading]);

    if (loading || isAuthLoading) {
        return <LoadingComponent />;
    }

    if (error) {
        return <ErrorComponent message={error} />;
    }

    if (!course) {
        return <ErrorComponent message="Course not found." />;
    }

    return <CourseComponent {...course} />;
}
