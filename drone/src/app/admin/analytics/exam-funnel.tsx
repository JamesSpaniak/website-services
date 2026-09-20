'use client';

import { useEffect, useState } from 'react';
import { getReportingCourseExamAttempts } from '@/app/lib/api-client';
import type { CourseFunnelExam, CourseFunnelExamAttempt } from '@/app/lib/types/analytics';
import { formatNumber, relativeTime } from '@/app/lib/format-time';
import { ChevronRightIcon } from '@heroicons/react/24/solid';

function sectionLabel(s: NonNullable<CourseFunnelExamAttempt['section_breakdown']>[number]): string {
    const unit = s.unit_title || s.unit_ref;
    const section = s.sub_unit_title || s.sub_unit_ref;
    if (unit && section) return `${unit} · ${section}`;
    return unit || section || 'Cross-section';
}

export default function ExamFunnelTable({
    courseId,
    exams,
    onUser,
}: {
    courseId: number;
    exams: CourseFunnelExam[];
    onUser?: (userId: number) => void;
}) {
    const [openId, setOpenId] = useState<number | null>(null);
    const [attempts, setAttempts] = useState<CourseFunnelExamAttempt[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (openId == null) {
            setAttempts(null);
            setError(null);
            return;
        }
        let cancelled = false;
        setAttempts(null);
        setError(null);
        getReportingCourseExamAttempts(courseId, openId)
            .then((rows) => {
                if (!cancelled) setAttempts(rows);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load attempts');
            });
        return () => {
            cancelled = true;
        };
    }, [courseId, openId]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--surface-border)] text-sm">
                <thead className="bg-[var(--comment-secondary-bg)] text-xs uppercase text-[var(--brand-muted)]">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium">Lesson</th>
                        <th className="px-4 py-2 text-right font-medium">Attempts</th>
                        <th className="px-4 py-2 text-right font-medium">Users</th>
                        <th className="px-4 py-2 text-right font-medium">Avg score</th>
                        <th className="px-4 py-2 text-right font-medium">Pass ≥70</th>
                        <th className="px-4 py-2 text-right font-medium">Last taken</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                    {exams.map((e) => {
                        const open = openId === e.exam_id;
                        return (
                            <ExamRows
                                key={e.exam_id}
                                exam={e}
                                open={open}
                                attempts={open ? attempts : null}
                                error={open ? error : null}
                                onToggle={() => setOpenId(open ? null : e.exam_id)}
                                onUser={onUser}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ExamRows({
    exam: e,
    open,
    attempts,
    error,
    onToggle,
    onUser,
}: {
    exam: CourseFunnelExam;
    open: boolean;
    attempts: CourseFunnelExamAttempt[] | null;
    error: string | null;
    onToggle: () => void;
    onUser?: (userId: number) => void;
}) {
    return (
        <>
            <tr className="cursor-pointer hover:bg-[var(--comment-secondary-bg)]" onClick={onToggle}>
                <td className="px-4 py-2">
                    <div className="flex items-start gap-2">
                        <ChevronRightIcon
                            className={`mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-muted)] transition-transform ${open ? 'rotate-90' : ''}`}
                            aria-hidden
                        />
                        <div>
                            <div className="font-medium text-[var(--brand-foreground)]">{e.title}</div>
                            <div className="text-xs text-[var(--brand-muted)]">
                                {e.scope}
                                {e.exam_pool ? ` · ${e.exam_pool}` : ''}
                                {e.scope_refs?.length ? ` · ${e.scope_refs.join(', ')}` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatNumber(e.attempts)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatNumber(e.users)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{e.avg_score}%</td>
                <td className="px-4 py-2 text-right tabular-nums">{e.pass_pct}%</td>
                <td className="px-4 py-2 text-right text-[var(--brand-muted)]">{relativeTime(e.last_submitted_at)}</td>
            </tr>
            {open && (
                <tr>
                    <td colSpan={6} className="px-4 py-3 bg-[var(--comment-secondary-bg)]/40">
                        {error ? (
                            <p className="text-sm text-red-600">{error}</p>
                        ) : attempts == null ? (
                            <p className="text-sm text-[var(--brand-muted)]">Loading attempts…</p>
                        ) : attempts.length === 0 ? (
                            <p className="text-sm text-[var(--brand-muted)]">No attempts recorded.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-xs uppercase text-[var(--brand-muted)]">
                                    <tr>
                                        <th className="py-1 pr-3 text-left font-medium">Student</th>
                                        <th className="py-1 px-3 text-right font-medium">Try</th>
                                        <th className="py-1 px-3 text-right font-medium">Score</th>
                                        <th className="py-1 px-3 text-left font-medium">When</th>
                                        <th className="py-1 pl-3 text-left font-medium">Breakdown</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attempts.map((a) => (
                                        <tr key={a.id} className="border-t border-[var(--surface-border)]">
                                            <td className="py-1.5 pr-3">
                                                {onUser ? (
                                                    <button
                                                        type="button"
                                                        className="text-left text-[var(--brand-primary)] hover:underline"
                                                        onClick={() => onUser(a.user_id)}
                                                    >
                                                        {a.username}
                                                    </button>
                                                ) : (
                                                    <span className="text-[var(--brand-foreground)]">{a.username}</span>
                                                )}
                                                <div className="text-xs text-[var(--brand-muted)]">{a.email}</div>
                                            </td>
                                            <td className="py-1.5 px-3 text-right tabular-nums">{a.attempt_no}</td>
                                            <td className="py-1.5 px-3 text-right tabular-nums">
                                                <span className={a.passed ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                                                    {a.score}%
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-3 text-[var(--brand-muted)] whitespace-nowrap">
                                                {new Date(a.submitted_at).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                            <td className="py-1.5 pl-3 text-xs text-[var(--brand-muted)]">
                                                {(a.section_breakdown ?? [])
                                                    .map((s) => `${sectionLabel(s)} ${s.correct}/${s.total}`)
                                                    .join(' · ') || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}
