'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourseById } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import UnitComponent from '@/app/ui/components/unit';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import ExamComponent from '@/app/ui/components/exam';
import { CourseData, UnitData } from '@/app/lib/types/course';

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
            try {
                const courseData: CourseData = await getCourseById(parseInt(courseId as string));
                let foundUnit: UnitData | undefined = undefined;
                if(courseData.units!=undefined) {
                    for(let i=0; i<courseData?.units.length; i++) {
                        const unit: UnitData = courseData.units[i];
                        if (unit.id === unitId) {
                            foundUnit = unit;
                            setUnit(foundUnit);
                        }
                    }
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
        <div>
            <UnitComponent unitData={unit} courseId={parseInt(courseId as string)} />
            {unit.exam && unit.exam.questions && <ExamComponent {...unit.exam} />}
        </div>
    );
}
