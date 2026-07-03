'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourseById } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import AuthGuard from '@/app/lib/auth-guard';
import UnitComponent from '@/app/ui/components/unit';
import CourseUnitNav from '@/app/ui/components/course-unit-nav';
import CourseOutlineSidebar from '@/app/ui/components/course-outline-sidebar';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { CourseData, UnitData } from '@/app/lib/types/course';
import { findUnitInTree, unitNavNeighbors } from '@/app/lib/course-tree';

function UnitPageContent() {
    const { courseId, unitId } = useParams();
    const { isLoading: isAuthLoading } = useAuth();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [unit, setUnit] = useState<UnitData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading || !courseId || !unitId) {
            if (!isAuthLoading) setLoading(false);
            return;
        }

        const fetchUnit = async () => {
            setLoading(true);
            setError(null);
            try {
                const courseData: CourseData = await getCourseById(parseInt(courseId as string));
                const rawId = Array.isArray(unitId) ? unitId[0] : unitId;
                const decodedId = rawId != null ? decodeURIComponent(String(rawId)) : '';
                const foundUnit = findUnitInTree(courseData.units, decodedId);
                setCourse(courseData);
                setUnit(foundUnit ?? null);
                if (!foundUnit) {
                    setError('Unit not found in this course.');
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred while fetching unit.');
            }
            setLoading(false);
        };

        fetchUnit();
    }, [courseId, unitId, isAuthLoading]);

    if (loading || isAuthLoading) {
        return <LoadingComponent />;
    }

    if (error) {
        return <ErrorComponent message={error} />;
    }

    if (!unit || !course) {
        return <ErrorComponent message="Unit not found." />;
    }

    const parsedCourseId = parseInt(courseId as string);
    const decodedUnitId = decodeURIComponent(String(Array.isArray(unitId) ? unitId[0] : unitId));
    const { prev, next } = unitNavNeighbors(course.units, decodedUnitId);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                <div className="lg:col-span-2">
                    <CourseUnitNav
                        courseId={parsedCourseId}
                        courseTitle={course.title}
                        unitTitle={unit.title}
                        prev={prev}
                        next={next}
                    />
                    <UnitComponent unitData={unit} courseId={parsedCourseId} />
                </div>
                <aside className="mt-8 lg:mt-0 hidden lg:block">
                    <CourseOutlineSidebar
                        courseId={parsedCourseId}
                        units={course.units}
                        hasAccess={course.has_access !== false}
                        activeUnitId={decodedUnitId}
                    />
                </aside>
            </div>
        </div>
    );
}

export default function SingleUnitPage() {
    return (
        <AuthGuard>
            <UnitPageContent />
        </AuthGuard>
    );
}
