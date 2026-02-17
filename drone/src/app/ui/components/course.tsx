'use client';

import { useState } from 'react';
import { CourseData, ProgressStatus, UnitData } from "@/app/lib/types/course";
import { updateCourseProgress, updateUnitProgress } from '@/app/lib/api-client';
import PurchaseFlow from './purchase-flow';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import UnitPreviewComponent from './unit-preview';
import ImageComponent from './image';
import Link from 'next/link';

export default function CourseComponent(props: CourseData) {
    const [course, setCourse] = useState<CourseData>(props);
    const { id, title, sub_title, image_url, units, status, price, has_access } = course;
    const courseId = id;
    const handlePurchaseSuccess = () => {
        setCourse(prevCourse => ({ ...prevCourse, hasAccess: true }));
    };

    if (has_access === false && price && price > 0) {
        return <PurchaseFlow course={course} onPurchaseSuccess={handlePurchaseSuccess} />;
    }

    const handleCourseStatusUpdate = async (newStatus: ProgressStatus) => {
        await updateCourseProgress(courseId, newStatus);
        setCourse(prevCourse => ({ ...prevCourse, status: newStatus }));
    };

    const handleUnitStatusUpdate = async (unitId: string, newStatus: ProgressStatus) => {
        const updatedUnit = await updateUnitProgress(courseId, unitId, newStatus);
        setCourse(prev => updateUnitInState(prev, updatedUnit));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    <div className="mb-8">
                        <ImageComponent 
                            src={image_url} alt={title} width={1200} height={675} 
                            className="aspect-video w-full rounded-2xl bg-gray-100 object-cover"
                        />
                    </div>
                    <div className="space-y-8">
                        {units?.map((unit) => (
                            <UnitPreviewComponent key={unit.id} unit={unit} courseId={courseId} onStatusUpdate={handleUnitStatusUpdate} />
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="mt-8 lg:mt-0">
                    <div className="p-6 bg-white rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
                        </div>
                        {sub_title && <p className="text-md leading-7 text-gray-600">{sub_title}</p>}

                        <h3 className="mt-6 pt-6 border-t text-lg font-semibold text-gray-900">Course Information</h3>
                        <div className="mt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Status</span>
                                <div className="flex items-center gap-2">
                                    <StatusIcon status={status} />
                                    <StatusUpdater onStatusSelect={handleCourseStatusUpdate} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Units</span>
                                <span className="text-sm text-gray-800">{units?.length || 0}</span>
                            </div>
                        </div>

                        <h3 className="mt-6 pt-6 border-t text-lg font-semibold text-gray-900">Course Units</h3>
                        <div className="mt-4 space-y-2">
                            {units?.map((unit) => (
                                <Link key={unit.id} href={`/courses/${courseId}/units/${unit.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="text-sm font-medium text-gray-800">{unit.title}</span>
                                    <StatusIcon status={unit.status} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Helper function to recursively update a unit in the state without re-fetching
function updateUnitInState(course: CourseData, updatedUnit: UnitData): CourseData {
    const update = (units: UnitData[]): UnitData[] => {
        return units.map(unit => {
            if (unit.id === updatedUnit.id) {
                return { ...unit, status: updatedUnit.status };
            }
            if (unit.sub_units) {
                return { ...unit, sub_units: update(unit.sub_units) };
            }
            return unit;
        });
    };
    return { ...course, units: update(course.units || []) };
}