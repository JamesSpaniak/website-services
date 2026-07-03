'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import CourseExamBreadcrumb from './course-exam-breadcrumb';
import type { FlatUnitNode } from '@/app/lib/course-tree';

interface CourseUnitNavProps {
    courseId: number;
    courseTitle: string;
    unitTitle: string;
    prev: FlatUnitNode | null;
    next: FlatUnitNode | null;
}

export default function CourseUnitNav({
    courseId,
    courseTitle,
    unitTitle,
    prev,
    next,
}: CourseUnitNavProps) {
    const unitHref = (id: string) =>
        `/courses/${courseId}/units/${encodeURIComponent(id)}`;

    return (
        <div className="mb-8">
            <CourseExamBreadcrumb
                crumbs={[
                    { label: 'Courses', href: '/courses' },
                    { label: courseTitle, href: `/courses/${courseId}` },
                    { label: unitTitle },
                ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                {prev ? (
                    <Link
                        href={unitHref(prev.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors"
                    >
                        <ChevronLeftIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[12rem] sm:max-w-xs">{prev.title}</span>
                    </Link>
                ) : (
                    <span />
                )}
                {next ? (
                    <Link
                        href={unitHref(next.id)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-80 transition-opacity ml-auto"
                    >
                        <span className="truncate max-w-[12rem] sm:max-w-xs">{next.title}</span>
                        <ChevronRightIcon className="h-4 w-4 shrink-0" />
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
