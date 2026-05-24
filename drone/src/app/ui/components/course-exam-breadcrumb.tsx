'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface Crumb {
    label: string;
    href?: string;
}

interface CourseExamBreadcrumbProps {
    crumbs: Crumb[];
}

export default function CourseExamBreadcrumb({ crumbs }: CourseExamBreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-1 text-[var(--brand-muted)]">
                {crumbs.map((crumb, i) => (
                    <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                        {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />}
                        {crumb.href ? (
                            <Link
                                href={crumb.href}
                                className="hover:text-[var(--brand-foreground)] transition-colors"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className="text-[var(--brand-foreground)] font-medium">{crumb.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
