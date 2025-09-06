'use client'
import { getCourses } from '@/app/lib/api-client';
import { useEffect, useState } from 'react';
import LoadingComponent from "@/app/ui/components/loading";
import ErrorComponent from '@/app/ui/components/error';
import { useAuth } from '@/app/lib/auth-context';
import CoursePreviewComponent from '@/app/ui/components/course-preview';
import { CourseData } from '@/app/lib/types/course';

export default function CoursePage() {
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const { isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        // Don't fetch courses until auth state is resolved and we have a token.
        if (isAuthLoading) return;

        async function getCoursesData() {
            setLoading(true);
            try {
                const coursesRes = await getCourses();
                if (coursesRes instanceof Error) {
                    setError(coursesRes);
                } else {
                    setCourses(coursesRes as CourseData[]);
                }
            } catch (e) {
                if (e instanceof Error) {
                    setError(e);
                } else {
                    setError(new Error('An unknown error occurred while fetching courses.'));
                }
            } finally {
                setLoading(false);
            }
        }
        getCoursesData();
    }, [isAuthLoading]);

    if (loading || isAuthLoading) {
        return <LoadingComponent />;
    }

    if (error) {
        return <ErrorComponent message={error.message} />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Available Courses</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length > 0 ? (
                    courses.map((course) => (
                        <CoursePreviewComponent
                            key={`crs-${course.id} `}
                            {...course} 
                            unitCount={course.units?.length || 0} />
                    ))
                ) : (
                    <p>No courses found.</p>
                )}
            </div>
        </div>
    )
}

