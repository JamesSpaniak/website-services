'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourse } from '@/app/lib/api_client';
import { useAuth } from '@/app/lib/auth-context';
import { CourseData, UnitData } from '@/app/lib/data/units';
import UnitComponent from '@/app/ui/components/unit';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import ExamComponent from '@/app/ui/components/exam';

export default function SingleUnitPage() {
    const { courseId, unitId } = useParams();
    const { token, isLoading: isAuthLoading } = useAuth();
    const [unit, setUnit] = useState<UnitData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading || !token || !courseId || !unitId) {
            if (!token && !isAuthLoading) setLoading(false);
            return;
        }

        const fetchUnit = async () => {
            setLoading(true);
            const courseData: CourseData | Error = await getCourse(courseId as string, token);
            if (courseData instanceof Error) {
                setError(courseData.message);
            } else {
                let foundUnit: UnitData | undefined = undefined;
                if(courseData.units!=undefined) {
                    for(let i=0; i<courseData?.units.length; i++) {
                        let unit: UnitData = courseData.units[i];
                        if (unit.id === unitId) {
                            foundUnit = unit;
                            setUnit(foundUnit);
                        }
                    }
                }

                if (!foundUnit) {
                    setError('Unit not found in this course.');
                }
            }
            setLoading(false);
        };

        fetchUnit();
    }, [courseId, unitId, token, isAuthLoading]);
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
        <div>
            <UnitComponent {...unit} />
            {unit.exam && unit.exam.questions && <ExamComponent {...unit.exam} />}
        </div>
    );
}
