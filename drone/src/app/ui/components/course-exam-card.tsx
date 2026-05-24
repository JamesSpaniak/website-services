'use client';

import Link from 'next/link';
import { AcademicCapIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export interface CourseExamScore {
    score: number;
    taken_at: string;
}

interface CourseExamCardProps {
    title: string;
    description: string;
    questionCount: number;
    href: string;
    ctaLabel: string;
    lastScore?: CourseExamScore | null;
    variant?: 'practice' | 'final';
}

export default function CourseExamCard({
    title,
    description,
    questionCount,
    href,
    ctaLabel,
    lastScore,
    variant = 'practice',
}: CourseExamCardProps) {
    const passed = lastScore != null && lastScore.score >= 70;
    const iconWrap =
        variant === 'final' ? 'bg-amber-500/10' : 'bg-[var(--brand-primary)]/10';
    const iconColor =
        variant === 'final' ? 'text-amber-400' : 'text-[var(--brand-primary)]';

    return (
        <div
            className="flex flex-col h-full p-5 border border-[var(--surface-border)] bg-[var(--surface)] hover:border-[var(--brand-primary)]/40 transition-colors"
            style={{ borderRadius: 'var(--radius-md)' }}
        >
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${iconWrap}`}>
                    <AcademicCapIcon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <h3 className="text-base font-display font-semibold text-[var(--brand-foreground)] leading-snug">
                    {title}
                </h3>
            </div>
            <p className="text-sm text-[var(--brand-muted)] mt-2 flex-1 leading-relaxed">{description}</p>
            <p className="text-xs text-[var(--brand-muted)] mt-3 font-mono">
                {questionCount} questions · randomized
            </p>
            {lastScore != null && (
                <p
                    className={`text-xs mt-2 font-medium ${passed ? 'text-green-400' : 'text-[var(--brand-muted)]'}`}
                >
                    Last score: {lastScore.score}%
                    {passed ? ' · Passed' : ''}
                </p>
            )}
            <Link
                href={href}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 transition-opacity"
            >
                {ctaLabel}
                <ArrowRightIcon className="h-4 w-4" />
            </Link>
        </div>
    );
}
