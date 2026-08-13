'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import CourseExamBreadcrumb from './course-exam-breadcrumb';
import type { FlatUnitNode } from '@/app/lib/course-tree';
import { unitPath } from '@/app/lib/auth-redirect';

interface CourseUnitNavProps {
    courseId: number;
    courseTitle: string;
    unitTitle: string;
    /** Ancestor units of the current one (top-level first), each linked in the breadcrumb. */
    ancestors?: FlatUnitNode[];
    prev: FlatUnitNode | null;
    next: FlatUnitNode | null;
}

export default function CourseUnitNav({
    courseId,
    courseTitle,
    unitTitle,
    ancestors = [],
    prev,
    next,
}: CourseUnitNavProps) {
    const unitHref = (node: FlatUnitNode) =>
        unitPath(courseId, node.rootUnitId, node.depth > 0 ? node.id : null);

    return (
        <div className="mb-8">
            <CourseExamBreadcrumb
                crumbs={[
                    { label: 'Courses', href: '/courses' },
                    { label: courseTitle, href: `/courses/${courseId}` },
                    ...ancestors.map((a) => ({ label: a.title, href: unitHref(a) })),
                    { label: unitTitle },
                ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                {prev ? (
                    <Link
                        href={unitHref(prev)}
                        aria-label={`Previous unit: ${prev.title}`}
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors"
                    >
                        <ChevronLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate max-w-[12rem] sm:max-w-xs">{prev.title}</span>
                    </Link>
                ) : (
                    <span />
                )}
                {next ? (
                    <Link
                        href={unitHref(next)}
                        aria-label={`Next unit: ${next.title}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-80 transition-opacity ml-auto"
                    >
                        <span className="truncate max-w-[12rem] sm:max-w-xs">{next.title}</span>
                        <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden />
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
