'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { ProgressStatus } from '@/app/lib/types/course';

interface MarkCompleteBarProps {
    status: ProgressStatus | undefined;
    onComplete: () => Promise<void>;
    nextHref?: string | null;
    nextTitle?: string | null;
}

/**
 * Visible completion CTA at the end of a lesson. The kebab StatusUpdater
 * remains for reverting status; this is the path students actually use.
 */
export default function MarkCompleteBar({
    status,
    onComplete,
    nextHref,
    nextTitle,
}: MarkCompleteBarProps) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const done = status === ProgressStatus.COMPLETED;

    const goNext = () => {
        if (nextHref) router.push(nextHref);
    };

    const markThenContinue = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (!done) await onComplete();
            goNext();
        } catch (err) {
            console.error('Failed to mark complete', err);
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--surface-border)]">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckIcon className="h-5 w-5" aria-hidden />
                    Completed
                </p>
                {nextHref && nextTitle && (
                    <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
                        style={{ borderRadius: 'var(--radius-sm)' }}
                    >
                        Continue: {nextTitle}
                        <ChevronRightIcon className="h-4 w-4" aria-hidden />
                    </button>
                )}
            </div>
        );
    }

    const label = nextHref && nextTitle
        ? `Mark complete & continue`
        : 'Mark as complete';

    return (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
            <button
                type="button"
                onClick={markThenContinue}
                disabled={busy}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 disabled:opacity-60 transition-opacity"
                style={{ borderRadius: 'var(--radius-sm)' }}
            >
                {busy ? 'Saving…' : label}
                {nextHref && <ChevronRightIcon className="h-4 w-4" aria-hidden />}
            </button>
        </div>
    );
}
