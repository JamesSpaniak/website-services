'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourseById } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import UnitComponent from '@/app/ui/components/unit';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { CourseData, UnitData } from '@/app/lib/types/course';

function findUnitDeep(units: UnitData[] | undefined, id: string): UnitData | undefined {
    if (!units?.length) return undefined;
    const want = String(id);
    for (const u of units) {
        if (String(u.id) === want) return u;
        const nested = findUnitDeep(u.sub_units, id);
        if (nested) return nested;
    }
    return undefined;
}

export default function SingleUnitPage() {
    const { courseId, unitId } = useParams();
    const { isLoading: isAuthLoading } = useAuth();
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
                const foundUnit = findUnitDeep(courseData.units, decodedId);
                if (foundUnit) {
                    setUnit(foundUnit);
                }

                if (!foundUnit) {
                    setError('Unit not found in this course.');
                }
            } catch (e) {
                if (e instanceof Error) {
                    setError(e.message);
                } else {
                    setError('An unknown error occurred while fetching unit.');
                }
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

    if (!unit) {
        return <ErrorComponent message="Unit not found." />;
    }

    return (
        <UnitComponent unitData={unit} courseId={parseInt(courseId as string)} />
    );
}
