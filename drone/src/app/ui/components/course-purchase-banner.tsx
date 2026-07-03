'use client';

import Link from 'next/link';
import type { CourseData } from '@/app/lib/types/course';

interface CoursePurchaseBannerProps {
    course: CourseData;
    onPurchaseClick?: () => void;
}

export default function CoursePurchaseBanner({ course, onPurchaseClick }: CoursePurchaseBannerProps) {
    const price = Number(course.price) || 0;
    if (course.has_access || price <= 0) return null;

    return (
        <div
            className="mb-8 p-5 border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/8 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ borderRadius: 'var(--radius-md)' }}
            role="region"
            aria-label="Unlock full course"
        >
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--brand-foreground)]">
                    Unit 1 is free — unlock the full course for ${price}
                </p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    Lifetime access to all units, practice exams, and progress tracking.
                </p>
            </div>
            {onPurchaseClick ? (
                <button
                    type="button"
                    onClick={onPurchaseClick}
                    className="shrink-0 px-5 py-2.5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                >
                    Unlock full course
                </button>
            ) : (
                <Link
                    href={`/courses/${course.id}/preview#purchase`}
                    className="shrink-0 px-5 py-2.5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity text-center"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                >
                    View pricing
                </Link>
            )}
        </div>
    );
}
