'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { getCourseById } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import AuthGuard from '@/app/lib/auth-guard';
import UnitComponent from '@/app/ui/components/unit';
import CourseUnitNav from '@/app/ui/components/course-unit-nav';
import CourseOutlineSidebar from '@/app/ui/components/course-outline-sidebar';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { CourseData } from '@/app/lib/types/course';
import {
    findUnitInTree,
    isUnitPreviewAccessible,
    unitAncestors,
    unitNavNeighbors,
    unitPageTarget,
} from '@/app/lib/course-tree';
import { coursePath, unitPath, FOCUS_QUERY } from '@/app/lib/auth-redirect';

function LockedUnitNotice({ courseId, unitTitle, price }: { courseId: number; unitTitle: string; price: number }) {
    return (
        <div className="mt-6 p-8 border border-[var(--surface-border)] bg-[var(--surface)] text-center" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="inline-flex p-3 bg-[var(--brand-primary)]/10 rounded-xl mb-4">
                <LockClosedIcon className="h-7 w-7 text-[var(--brand-primary)]" />
            </div>
            <h1 className="text-xl font-display font-semibold text-[var(--brand-foreground)]">{unitTitle}</h1>
            <p className="mt-3 text-sm text-[var(--brand-muted)] leading-relaxed">
                This unit is part of the full course. Unit 1 is free — unlock the rest with a one-time purchase
                for lifetime access to all units, practice exams, and progress tracking.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Link
                    href={coursePath(courseId, true)}
                    className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                >
                    {price > 0 ? `Unlock full course — $${price}` : 'Unlock full course'}
                </Link>
                <Link
                    href={coursePath(courseId)}
                    className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                >
                    Back to course
                </Link>
            </div>
        </div>
    );
}

function UnitPageContent() {
    const { courseId, unitId } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedFocusUnitId = searchParams.get(FOCUS_QUERY);
    const { isLoading: isAuthLoading } = useAuth();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const parsedCourseId = parseInt(courseId as string);
    const decodedUnitId = useMemo(() => {
        const rawId = Array.isArray(unitId) ? unitId[0] : unitId;
        return rawId != null ? decodeURIComponent(String(rawId)) : '';
    }, [unitId]);

    useEffect(() => {
        if (isAuthLoading || !courseId || !unitId) {
            if (!isAuthLoading) setLoading(false);
            return;
        }

        const fetchCourse = async () => {
            setLoading(true);
            setError(null);
            try {
                const courseData: CourseData = await getCourseById(parseInt(courseId as string));
                setCourse(courseData);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred while fetching unit.');
            }
            setLoading(false);
        };

        fetchCourse();
    }, [courseId, unitId, isAuthLoading]);

    // Only top-level units own pages. Preserve legacy descendant URLs by
    // redirecting them to the root unit with the descendant focused.
    const pageTarget = course ? unitPageTarget(course.units, decodedUnitId) : null;
    const needsPageRedirect =
        pageTarget != null && pageTarget.pageUnitId !== decodedUnitId;
    const requestedFocusTarget =
        course && requestedFocusUnitId
            ? unitPageTarget(course.units, requestedFocusUnitId)
            : null;
    const validFocusUnitId =
        requestedFocusUnitId &&
        requestedFocusTarget?.pageUnitId === decodedUnitId &&
        requestedFocusTarget.focusUnitId === requestedFocusUnitId
            ? requestedFocusUnitId
            : null;
    const hasInvalidFocus =
        course != null &&
        requestedFocusUnitId != null &&
        !needsPageRedirect &&
        validFocusUnitId == null;
    const redirectFocusUnitId =
        needsPageRedirect &&
        requestedFocusUnitId &&
        requestedFocusTarget?.pageUnitId === pageTarget?.pageUnitId
            ? requestedFocusTarget.focusUnitId
            : pageTarget?.focusUnitId;

    useEffect(() => {
        if (needsPageRedirect && pageTarget) {
            router.replace(unitPath(parsedCourseId, pageTarget.pageUnitId, redirectFocusUnitId));
        } else if (hasInvalidFocus) {
            router.replace(unitPath(parsedCourseId, decodedUnitId));
        }
    }, [
        decodedUnitId,
        hasInvalidFocus,
        needsPageRedirect,
        pageTarget,
        parsedCourseId,
        redirectFocusUnitId,
        router,
    ]);

    if (loading || isAuthLoading || needsPageRedirect || hasInvalidFocus) {
        return <LoadingComponent />;
    }

    if (error) {
        return <ErrorComponent message={error} />;
    }

    const pageUnit = course ? findUnitInTree(course.units, decodedUnitId) : undefined;
    const activeUnitId = validFocusUnitId ?? decodedUnitId;
    const activeUnit = course ? findUnitInTree(course.units, activeUnitId) : undefined;
    if (!pageUnit || !activeUnit || !course) {
        return <ErrorComponent message="Unit not found in this course." />;
    }

    const ancestors = unitAncestors(course.units, activeUnitId);
    const { prev, next } = unitNavNeighbors(course.units, activeUnitId);
    const unitLocked =
        course.has_access === false &&
        !isUnitPreviewAccessible(course.units, activeUnitId);

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
                <div className="min-w-0">
                    <CourseUnitNav
                        courseId={parsedCourseId}
                        courseTitle={course.title}
                        unitTitle={activeUnit.title}
                        ancestors={ancestors}
                        prev={prev}
                        next={next}
                    />
                    {unitLocked ? (
                        <LockedUnitNotice
                            courseId={parsedCourseId}
                            unitTitle={activeUnit.title}
                            price={Number(course.price) || 0}
                        />
                    ) : (
                        <UnitComponent
                            key={pageUnit.id}
                            unitData={pageUnit}
                            courseId={parsedCourseId}
                            focusUnitId={validFocusUnitId}
                            questionCounts={course.question_counts}
                        />
                    )}
                </div>
                <aside className="mt-8 lg:mt-0">
                    <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
                        <CourseOutlineSidebar
                            courseId={parsedCourseId}
                            units={course.units}
                            hasAccess={course.has_access !== false}
                            activeUnitId={activeUnitId}
                        />
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default function SingleUnitPage() {
    return (
        <AuthGuard>
            <Suspense fallback={<LoadingComponent />}>
                <UnitPageContent />
            </Suspense>
        </AuthGuard>
    );
}
