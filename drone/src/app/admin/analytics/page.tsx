'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsOverview, getAnalyticsDaily } from '@/app/lib/api-client';
import type { OverviewStats, DailyMetric } from '@/app/lib/types/audit';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

const CHART_ACTIONS = ['LOGIN', 'REGISTER', 'COURSE_STARTED', 'COURSE_COMPLETED', 'EXAM_SUBMITTED', 'COURSE_PURCHASED'] as const;
const ACTION_COLORS: Record<string, string> = {
    LOGIN: '#6366f1',
    REGISTER: '#10b981',
    COURSE_STARTED: '#3b82f6',
    COURSE_COMPLETED: '#059669',
    EXAM_SUBMITTED: '#8b5cf6',
    COURSE_PURCHASED: '#f59e0b',
};

export default function AdminAnalyticsPage() {
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [daily, setDaily] = useState<DailyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [o, d] = await Promise.all([getAnalyticsOverview(), getAnalyticsDaily(days)]);
                setOverview(o);
                setDaily(d);
            } catch { /* empty */ }
            finally { setLoading(false); }
        })();
    }, [days]);

    if (loading) return <LoadingComponent />;
    if (!overview) return <ErrorComponent message="Failed to load analytics." />;

    const statCards: { label: string; value: number | string; sub?: string }[] = [
        { label: 'Total Signups', value: overview.total_signups, sub: `${overview.signups_7d} this week` },
        { label: 'Daily Active Users', value: overview.dau },
        { label: 'Weekly Active Users', value: overview.wau },
        { label: 'Monthly Active Users', value: overview.mau },
        { label: 'Courses Started', value: overview.total_course_starts },
        { label: 'Courses Completed', value: overview.total_course_completions },
        { label: 'Exams Submitted', value: overview.total_exams_submitted },
        { label: 'Purchases', value: overview.total_purchases },
    ];

    const dateSet = new Set<string>();
    for (const d of daily) dateSet.add(d.date);
    const dates = Array.from(dateSet).sort();

    const dailyByAction = new Map<string, Map<string, number>>();
    for (const d of daily) {
        if (!dailyByAction.has(d.action)) dailyByAction.set(d.action, new Map());
        dailyByAction.get(d.action)!.set(d.date, d.count);
    }

    const maxCount = Math.max(1, ...daily.map((d) => d.count));

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {statCards.map((s) => (
                    <div key={s.label} className="bg-[var(--surface)] rounded-xl shadow-sm p-4 sm:p-5">
                        <p className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">{s.label}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--brand-foreground)]">{s.value}</p>
                        {s.sub && <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{s.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="bg-[var(--surface)] rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--brand-foreground)]">Daily Activity</h3>
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="text-xs border border-[var(--input-border)] rounded-md px-2 py-1"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>

                {dates.length === 0 ? (
                    <p className="text-sm text-[var(--brand-muted)] text-center py-8">No activity data for this period.</p>
                ) : (
                    <div>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {CHART_ACTIONS.map((a) => (
                                <span key={a} className="flex items-center gap-1.5 text-xs text-[var(--brand-muted)]">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACTION_COLORS[a] }} />
                                    {a.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            <div className="flex items-end gap-px" style={{ minWidth: dates.length * 24, height: 200 }}>
                                {dates.map((date) => {
                                    const segments = CHART_ACTIONS.map((action) => ({
                                        action,
                                        count: dailyByAction.get(action)?.get(date) || 0,
                                    })).filter((s) => s.count > 0);

                                    const total = segments.reduce((s, seg) => s + seg.count, 0);
                                    const barHeight = Math.max(2, (total / maxCount) * 180);

                                    return (
                                        <div key={date} className="flex-1 flex flex-col items-center min-w-[20px] group relative">
                                            <div className="w-full flex flex-col justify-end" style={{ height: 180 }}>
                                                <div className="w-full rounded-t" style={{ height: barHeight }}>
                                                    {segments.map((seg, i) => {
                                                        const segHeight = (seg.count / total) * barHeight;
                                                        return (
                                                            <div
                                                                key={seg.action}
                                                                style={{
                                                                    height: segHeight,
                                                                    backgroundColor: ACTION_COLORS[seg.action],
                                                                    borderRadius: i === 0 ? '4px 4px 0 0' : undefined,
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <span className="text-[9px] text-[var(--brand-muted)] mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                                                {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>

                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--brand-foreground)] text-[var(--background)] text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
                                                <p className="font-semibold mb-1">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                {segments.map((seg) => (
                                                    <p key={seg.action}>{seg.action.replace(/_/g, ' ')}: {seg.count}</p>
                                                ))}
                                                {segments.length === 0 && <p>No activity</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
