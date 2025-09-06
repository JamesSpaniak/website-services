'use client';

import { useState } from 'react';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import { updateUnitProgress } from '@/app/lib/api-client';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';

interface UnitComponentProps {
    unitData: UnitData;
    courseId: number;
}

export default function UnitComponent({ unitData, courseId }: UnitComponentProps) {
    const [unit, setUnit] = useState<UnitData>(unitData);
    const { id, title, sub_units, description, status } = unit;

    const handleStatusUpdate = async (newStatus: ProgressStatus) => {
        const updatedUnit = await updateUnitProgress(courseId, id, newStatus);
        setUnit(prevUnit => ({ ...prevUnit, status: updatedUnit.status }));
    };

    return (
        <div key={id} className="p-4 md:p-8 mb-6 bg-white rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                <StatusIcon status={status} />
                <StatusUpdater onStatusSelect={handleStatusUpdate} />
            </div>
            
            {description && <p className="text-gray-700 mb-6">{description}</p>}

            {sub_units && sub_units.length > 0 && (
                <>
                    <h2 className="text-2xl font-semibold mt-8 mb-4 border-t pt-4">Sub-Units</h2>
                    <div className="space-y-2">
                        {sub_units.map((sub_unit) => (
                            <div key={sub_unit.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded"><StatusIcon status={sub_unit.status} /><p className="text-gray-800">{sub_unit.title}</p></div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}