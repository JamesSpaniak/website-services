'use client';

import { useState } from 'react';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import { updateUnitProgress } from '@/app/lib/api-client';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import ExamComponent from './exam';
import SectionComponent from './section';

interface UnitComponentProps {
    unitData: UnitData;
    courseId: number;
}

export default function UnitComponent({ unitData, courseId }: UnitComponentProps) {
    const [unit, setUnit] = useState<UnitData>(unitData);
    const { id, title, sub_units, description, text_content, status, exam } = unit;

    const handleStatusUpdate = async (newStatus: ProgressStatus) => {
        const updatedUnitFromApi = await updateUnitProgress(courseId, id, newStatus);
        setUnit(prevUnit => ({ ...prevUnit, status: updatedUnitFromApi.status }));
        console.log(unit);
    };

    const handleSubUnitStatusUpdate = async (unitId: string, newStatus: ProgressStatus) => {
        const updatedSubUnit = await updateUnitProgress(courseId, unitId, newStatus);
        setUnit(prevUnit => updateUnitInState(prevUnit, updatedSubUnit));
        console.log(unit);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="p-8 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
                    <StatusIcon status={status} />
                    <StatusUpdater onStatusSelect={handleStatusUpdate} />
                </div>
                
                <div className="mt-8 prose lg:prose-lg max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: description?.replace(/\n/g, '<br />') || ''}} />
                {text_content && <div className="mt-4 prose lg:prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: text_content.replace(/\n/g, '<br />') }} />}

                {sub_units && sub_units.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sections</h2>
                        {sub_units?.map((sub_unit) => (
                            <SectionComponent key={sub_unit.id} section={sub_unit} courseId={courseId} onStatusUpdate={handleSubUnitStatusUpdate} />
                        ))}
                    </div>
                )}

                {/* Main Unit Exam */}
                <UnitExamSection exam={exam} />
            </div>
        </div>
    );
}

// Helper function to recursively update a sub-unit in the state
function updateUnitInState(unit: UnitData, updatedSubUnit: UnitData): UnitData {
    const update = (units: UnitData[]): UnitData[] => {
        return units.map(u => {
            if (u.id === updatedSubUnit.id) {
                return { ...u, status: updatedSubUnit.status };
            }
            if (u.sub_units) {
                return { ...u, sub_units: update(u.sub_units) };
            }
            return u;
        });
    };
    return { ...unit, sub_units: update(unit.sub_units || []) };
}

function UnitExamSection({ exam }: { exam?: UnitData['exam'] }) {
    const [showExam, setShowExam] = useState(false);

    if (!exam || !exam.questions) return null;

    return (
        <div className="mt-12 pt-8 border-t">
            {!showExam ? (
                <div className="text-center">
                    <button 
                        onClick={() => setShowExam(true)}
                        className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Take Unit Exam
                    </button>
                </div>
            ) : (
                <ExamComponent {...exam} />
            )}
        </div>
    );
}