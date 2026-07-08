'use client';

import { useState, useEffect } from 'react';
import { CourseData, ProgressStatus, UnitData } from "@/app/lib/types/course";
import { updateCourseProgress, updateUnitProgress } from '@/app/lib/api-client';
import PurchaseFlow from './purchase-flow';
import CoursePurchaseBanner from './course-purchase-banner';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import UnitPreviewComponent from './unit-preview';
import VideoComponent from './video';
import Link from 'next/link';
import JsonLd, { courseJsonLd } from './json-ld';
import { debugLog } from '@/app/lib/logger';
import { mergeCourseImages } from '@/app/lib/course-images';
import CourseImageStrip from './course-image-strip';
import CourseExamsSection from './course-exams-section';
import CourseOutlineSidebar from './course-outline-sidebar';
import { isUnitPreviewAccessible } from '@/app/lib/course-tree';

export default function CourseComponent(props: CourseData & { initialShowPurchase?: boolean }) {
    const [course, setCourse] = useState<CourseData>(props);
    const [showPurchase, setShowPurchase] = useState(false);
    const { id, title, sub_title, video_url, units, status, price, has_access, image_focal_point } = course;
    const courseId = id;
    const heroImages = mergeCourseImages(course);
    const paidCourse = Number(price) > 0;
    const fullAccess = has_access !== false;

    useEffect(() => {
        if (props.initialShowPurchase && paidCourse && !fullAccess) {
            setShowPurchase(true);
        }
    }, [props.initialShowPurchase, paidCourse, fullAccess]);

    debugLog('CourseComponent', {
        courseId,
        title,
        heroImagesCount: heroImages.length,
        video_url: video_url ?? null,
        will_render_video: !!video_url,
    });

    const handlePurchaseSuccess = () => {
        setCourse((prev) => ({ ...prev, has_access: true }));
        setShowPurchase(false);
    };

    if (showPurchase && paidCourse && !fullAccess) {
        return (
            <PurchaseFlow
                course={course}
                onPurchaseSuccess={handlePurchaseSuccess}
            />
        );
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
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <JsonLd data={courseJsonLd(course)} />
            {!fullAccess && paidCourse && (
                <CoursePurchaseBanner course={course} onPurchaseClick={() => setShowPurchase(true)} />
            )}
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                <div className="lg:col-span-2">
                    <div className="mb-8 space-y-4 overflow-hidden">
                        {heroImages.length > 0 && (
                            <CourseImageStrip images={heroImages} alt={title} objectPosition={image_focal_point} />
                        )}
                        {video_url && fullAccess && (
                            <div className="overflow-hidden" style={{ borderRadius: 'var(--radius-md)' }}>
                                <VideoComponent src={video_url} className="w-full" title={title} />
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        {units?.map((unit) => (
                            <UnitPreviewComponent
                                key={unit.id}
                                unit={unit}
                                courseId={courseId}
                                locked={!fullAccess && !isUnitPreviewAccessible(units, String(unit.id))}
                                onStatusUpdate={handleUnitStatusUpdate}
                            />
                        ))}
                    </div>
                    {fullAccess && (
                        <CourseExamsSection courseId={courseId} examSummary={course.exam_summary} />
                    )}
                </div>

                <div className="mt-8 lg:mt-0 space-y-6">
                    <div className="p-6 border border-[var(--surface-border)] bg-[var(--surface)]" style={{ borderRadius: 'var(--radius-md)' }}>
                        <h1 className="text-xl font-display font-semibold tracking-tight text-[var(--brand-foreground)]">{title}</h1>
                        {sub_title && <p className="mt-2 text-sm text-[var(--brand-muted)]">{sub_title}</p>}

                        <h3 className="mt-6 pt-6 border-t border-[var(--surface-border)] text-sm font-display font-semibold text-[var(--brand-foreground)]">Info</h3>
                        <div className="mt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[var(--brand-muted)]">Status</span>
                                <div className="flex items-center gap-2">
                                    <StatusIcon status={status} />
                                    <StatusUpdater onStatusSelect={handleCourseStatusUpdate} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[var(--brand-muted)]">Units</span>
                                <span className="font-mono text-xs text-[var(--brand-foreground)]">{units?.length || 0}</span>
                            </div>
                            {paidCourse && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--brand-muted)]">Price</span>
                                    <span className="font-mono text-xs text-[var(--brand-foreground)]">${Number(price)}</span>
                                </div>
                            )}
                        </div>

                        {!fullAccess && paidCourse && (
                            <button
                                type="button"
                                onClick={() => setShowPurchase(true)}
                                className="mt-6 w-full py-2.5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
                                style={{ borderRadius: 'var(--radius-sm)' }}
                            >
                                Unlock for ${Number(price)}
                            </button>
                        )}

                        {fullAccess && (
                            <Link
                                href={`/courses/${courseId}/exams`}
                                className="mt-6 flex items-center justify-between p-3 border border-transparent hover:border-[var(--surface-border)] hover:bg-[var(--background)] transition-colors border-t border-[var(--surface-border)] pt-6"
                                style={{ borderRadius: 'var(--radius-sm)' }}
                            >
                                <span className="text-sm text-[var(--brand-foreground)]">Exams</span>
                                <span className="text-xs text-[var(--brand-muted)]">Practice & final</span>
                            </Link>
                        )}
                    </div>

                    <CourseOutlineSidebar
                        courseId={courseId}
                        units={units}
                        hasAccess={fullAccess}
                    />
                </div>
            </div>
        </div>
    );
}

function updateUnitInState(course: CourseData, updatedUnit: UnitData): CourseData {
    const update = (units: UnitData[]): UnitData[] => {
        return units.map(unit => {
            if (String(unit.id) === String(updatedUnit.id)) {
                return { ...unit, ...updatedUnit };
            }
            if (unit.sub_units) {
                return { ...unit, sub_units: update(unit.sub_units) };
            }
            return unit;
        });
    };
    return { ...course, units: update(course.units || []) };
}
