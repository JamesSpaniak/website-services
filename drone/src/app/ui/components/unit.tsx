'use client';

import { useEffect, useState } from 'react';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import { updateUnitProgress } from '@/app/lib/api-client';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import SectionComponent from './section';
import ExamPlayer from './exam-player';

interface UnitComponentProps {
    unitData: UnitData;
    courseId: number;
}

export default function UnitComponent({ unitData, courseId }: UnitComponentProps) {
    const [unit, setUnit] = useState<UnitData>(unitData);
    const { id, title, sub_units, description, text_content, status } = unit;

    useEffect(() => {
        let cancelled = false;
        const s = unitData.status;
        if (s != null && s !== ProgressStatus.NOT_STARTED) return;
        (async () => {
            try {
                const updated = await updateUnitProgress(
                    courseId,
                    String(unitData.id),
                    ProgressStatus.IN_PROGRESS,
                );
                if (!cancelled) {
                    setUnit((prev) => ({ ...prev, status: updated.status }));
                }
            } catch {
                /* guest or offline */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [courseId, unitData.id, unitData.status]);

    const handleStatusUpdate = async (newStatus: ProgressStatus) => {
        const updatedUnitFromApi = await updateUnitProgress(courseId, id, newStatus);
        setUnit((prevUnit) => ({ ...prevUnit, status: updatedUnitFromApi.status }));
    };

    const handleSubUnitStatusUpdate = async (unitId: string, newStatus: ProgressStatus) => {
        const updatedSubUnit = await updateUnitProgress(courseId, unitId, newStatus);
        setUnit((prevUnit) => updateUnitInState(prevUnit, updatedSubUnit));
    };

    const unitScopeId = typeof id === 'string' ? parseInt(id, 10) : id;

    return (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="p-8 border border-[var(--surface-border)] bg-[var(--surface)]" style={{ borderRadius: 'var(--radius-md)' }}>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl">{title}</h1>
                    <StatusIcon status={status} />
                    <StatusUpdater onStatusSelect={handleStatusUpdate} />
                </div>

                
                    <div className="mt-8 prose prose-invert prose-sm sm:prose-base max-w-none text-[var(--brand-muted)] prose-headings:text-[var(--brand-foreground)] prose-a:text-[var(--brand-primary)]" dangerouslySetInnerHTML={{ __html: description?.replace(/\n/g, '<br />') || ''}} />
                
                {text_content && <div className="mt-4 prose prose-invert prose-sm sm:prose-base max-w-none text-[var(--brand-muted)]" dangerouslySetInnerHTML={{ __html: text_content.replace(/\n/g, '<br />') }} />}

                {sub_units && sub_units.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">Sections</h2>
                        {sub_units?.map((sub_unit) => (
                            <SectionComponent
                                key={sub_unit.id}
                                section={sub_unit}
                                courseId={courseId}
                                onStatusUpdate={handleSubUnitStatusUpdate}
                            />
                        ))}
                    </div>
                )}

                {!Number.isNaN(unitScopeId) && (
                    <ExamPlayer
                        courseId={courseId}
                        scope="unit"
                        scopeId={unitScopeId}
                        label={`Unit: ${title}`}
                        questionCount={25}
                    />
                )}
            </div>
        </div>
    );
}

function updateUnitInState(unit: UnitData, updatedSubUnit: UnitData): UnitData {
    const update = (units: UnitData[]): UnitData[] => {
        return units.map((u) => {
            if (String(u.id) === String(updatedSubUnit.id)) {
                return { ...u, ...updatedSubUnit };
            }
            if (u.sub_units) {
                return { ...u, sub_units: update(u.sub_units) };
            }
            return u;
        });
    };
    return { ...unit, sub_units: update(unit.sub_units || []) };
}
