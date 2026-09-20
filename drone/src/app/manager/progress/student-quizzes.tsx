'use client';

import { useEffect, useState } from 'react';
import { getOrgMemberExams } from '@/app/lib/api-client';
import type { MemberQuizHistory } from '@/app/lib/types/organization';
import { relativeTime } from '@/app/lib/format-time';

const EFFORT_COPY: Record<string, { label: string; hint: string; tone: string }> = {
    passing: { label: 'Passing', hint: 'At least one quiz ≥70%', tone: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' },
    trying: { label: 'Trying', hint: 'Failing quizzes but still active this week', tone: 'text-sky-700 bg-sky-500/10 border-sky-500/20' },
    struggling: { label: 'Struggling', hint: 'Retaking and not improving — needs help', tone: 'text-amber-800 bg-amber-500/15 border-amber-500/25' },
    stopped: { label: 'Stopped', hint: 'Failed a quiz, then went quiet', tone: 'text-red-700 bg-red-500/10 border-red-500/20' },
    browsing: { label: 'Browsing', hint: 'In the course, has not submitted a quiz yet', tone: 'text-indigo-700 bg-indigo-500/10 border-indigo-500/20' },
    not_trying: { label: 'Not started', hint: 'No recent activity and no quizzes', tone: 'text-[var(--brand-muted)] bg-[var(--surface)] border-[var(--surface-border)]' },
};

export function EffortBadge({ effort }: { effort?: string | null }) {
    const cfg = EFFORT_COPY[effort ?? ''] ?? EFFORT_COPY.not_trying;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.tone}`} title={cfg.hint}>
            {cfg.label}
        </span>
    );
}

function sectionLabel(s: NonNullable<MemberQuizHistory['attempts'][number]['section_breakdown']>[number]): string {
    const unit = s.unit_title || s.unit_ref;
    const section = s.sub_unit_title || s.sub_unit_ref;
    if (unit && section) return `${unit} · ${section}`;
    return unit || section || 'Cross-section';
}

export default function StudentQuizzes({ orgId, userId }: { orgId: number; userId: number }) {
    const [data, setData] = useState<MemberQuizHistory | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setData(null);
        setError(null);
        getOrgMemberExams(orgId, userId)
            .then((d) => !cancelled && setData(d))
            .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load quizzes'));
        return () => {
            cancelled = true;
        };
    }, [orgId, userId]);

    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!data) return <p className="text-sm text-[var(--brand-muted)]">Loading quizzes…</p>;

    const cfg = EFFORT_COPY[data.effort] ?? EFFORT_COPY.not_trying;
    const abandoned = Math.max(0, data.exam_starts_30d - data.exam_submits_30d);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <EffortBadge effort={data.effort} />
                <span className="text-xs text-[var(--brand-muted)]">{cfg.hint}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-[var(--brand-muted)]">
                <span>{Math.round(data.minutes_7d)} min in lessons (7d)</span>
                <span>{data.exam_submits_30d} quizzes submitted (30d)</span>
                {abandoned > 0 && (
                    <span title="Started a quiz in the last 30 days without a matching submit">
                        {abandoned} started, not submitted
                    </span>
                )}
            </div>

            {data.quizzes.length === 0 ? (
                <p className="text-sm text-[var(--brand-muted)]">No quizzes submitted yet. Use Time 7d and the timeline to see if they are opening lessons.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs uppercase text-[var(--brand-muted)]">
                            <tr>
                                <th className="py-1 pr-3 text-left font-medium">Lesson quiz</th>
                                <th className="py-1 px-3 text-right font-medium">Tries</th>
                                <th className="py-1 px-3 text-right font-medium">First</th>
                                <th className="py-1 px-3 text-right font-medium">Best</th>
                                <th className="py-1 px-3 text-right font-medium">Latest</th>
                                <th className="py-1 pl-3 text-left font-medium">When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.quizzes.map((q) => {
                                const trend =
                                    q.latest > q.first ? '↑' : q.latest < q.first ? '↓' : '→';
                                return (
                                    <tr key={`${q.course_id}-${q.scope}-${q.scope_ref}`} className="border-t border-[var(--surface-border)]">
                                        <td className="py-1.5 pr-3">
                                            <div className="text-[var(--brand-foreground)]">{q.title}</div>
                                            <div className="text-xs text-[var(--brand-muted)]">{q.course_title}</div>
                                        </td>
                                        <td className="py-1.5 px-3 text-right tabular-nums">{q.attempts}</td>
                                        <td className="py-1.5 px-3 text-right tabular-nums">{q.first}%</td>
                                        <td className={`py-1.5 px-3 text-right tabular-nums font-semibold ${q.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                                            {q.best}%
                                        </td>
                                        <td className="py-1.5 px-3 text-right tabular-nums">
                                            {q.latest}% {q.attempts > 1 && <span className="text-[var(--brand-muted)]">{trend}</span>}
                                        </td>
                                        <td className="py-1.5 pl-3 text-[var(--brand-muted)] whitespace-nowrap">{relativeTime(q.last_submitted_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {data.attempts.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold uppercase text-[var(--brand-muted)] mb-2">Attempt log</h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.attempts.map((a) => (
                            <div key={a.id} className="text-sm border-t border-[var(--surface-border)] pt-2">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                    <span className={a.passed ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                                        {a.score}%
                                    </span>
                                    <span className="text-[var(--brand-foreground)]">{a.title}</span>
                                    <span className="text-xs text-[var(--brand-muted)]">try {a.attempt_no}</span>
                                    <span className="text-xs text-[var(--brand-muted)]">
                                        {new Date(a.submitted_at).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                {(a.section_breakdown ?? []).length > 0 && (
                                    <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                                        {(a.section_breakdown ?? [])
                                            .map((s) => `${sectionLabel(s)} ${s.correct}/${s.total}`)
                                            .join(' · ')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
