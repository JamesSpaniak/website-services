'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useManagerOrg } from '../shell';
import { getOrgEngagement, getOrgUtilization, getOrgClasses } from '@/app/lib/api-client';
import type { OrgEngagementResponse, OrgUtilizationResponse } from '@/app/lib/types/analytics';
import type { OrgClass } from '@/app/lib/types/organization';
import { track } from '@/app/lib/analytics';
import { formatPct, recencyTone, relativeTime } from '@/app/lib/format-time';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

const RANGES = [7, 30, 90] as const;

/**
 * Manager overview: seat utilization (live) + engagement over a window
 * (rollup + today). Same product_events source as the company reporting,
 * scoped to this organization (docs/tech/manager-progress-visibility.md).
 */
export default function ManagerOverviewPage() {
    const { org } = useManagerOrg();
    const orgId = org.id;

    const [days, setDays] = useState<(typeof RANGES)[number]>(30);
    const [classId, setClassId] = useState<number | undefined>(undefined);
    const [classes, setClasses] = useState<OrgClass[]>([]);
    const [utilization, setUtilization] = useState<OrgUtilizationResponse | null>(null);
    const [engagement, setEngagement] = useState<OrgEngagementResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        track('manager_dashboard_viewed', { path: '/manager/overview', properties: { organization_id: orgId } });
    }, [orgId]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([getOrgUtilization(orgId), getOrgEngagement(orgId, days, classId), getOrgClasses(orgId)])
            .then(([u, e, c]) => {
                if (cancelled) return;
                setUtilization(u);
                setEngagement(e);
                setClasses(c);
                setError(null);
            })
            .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load overview'))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [orgId, days, classId]);

    if (loading && !utilization) return <LoadingComponent />;
    if (error && !utilization) return <ErrorComponent message={error} />;
    if (!utilization || !engagement) return null;

    const u = utilization;
    const seatsUsedPct = u.seats_purchased > 0 ? Math.round((100 * u.members) / u.seats_purchased) : null;
    const maxMinutes = Math.max(1, ...engagement.series.map((d) => d.minutes));
    const totalMinutes = engagement.members.reduce((s, m) => s + m.minutes, 0);
    const activeMembers = engagement.members.filter((m) => m.minutes > 0 || m.lessons_viewed > 0).length;
    const stalledIds = new Set(u.stalled_member_ids);

    return (
        <div className="space-y-6">
            {error && <ErrorComponent message={error} />}

            {/* Utilization */}
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)] mb-3">Seats &amp; utilization</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Seats used" value={`${u.members} / ${u.seats_purchased || '∞'}`} sub={seatsUsedPct !== null ? `${seatsUsedPct}% of purchased` : undefined} />
                    <Stat label="Invites redeemed" value={`${u.invites_redeemed} / ${u.invites_sent}`} sub="codes used vs generated" />
                    <Stat label="Activated" value={`${u.members_activated} / ${u.members}`} sub="completed a first lesson" />
                    <Stat label="Active this week" value={`${u.members_engaged_7d}`} sub="any learning activity in 7 days" />
                    <Stat label="Active seats (30d)" value={`${u.members_engaged_30d} / ${u.seats_purchased || u.members}`} sub={`${formatPct(u.utilization_pct_30d)} of seats · active = any learning activity in 30 days`} tone={u.utilization_pct_30d < 40 ? 'warn' : 'ok'} />
                    <Stat label="Avg completion" value={formatPct(u.avg_pct_complete)} sub={`${u.members_completed} finished a course`} />
                    <Stat label="Hours (30d)" value={`${Number(u.hours_engaged_30d).toFixed(1)}h`} sub={`${Number(u.hours_engaged_total).toFixed(1)}h all time`} />
                    <Stat label="Stalled" value={`${u.stalled_member_ids.length}`} sub="started, no activity in 14d" tone={u.stalled_member_ids.length > 0 ? 'warn' : 'ok'} />
                </div>
            </section>

            {/* Engagement */}
            <section className="bg-[var(--surface)] rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--brand-foreground)]">Class time</h2>
                        <p className="text-xs text-[var(--brand-muted)]">
                            {Math.round(totalMinutes / 6) / 10}h across {activeMembers} active students in the last {days} days
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {classes.length > 0 && (
                            <select
                                value={classId ?? ''}
                                onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : undefined)}
                                className="px-2 py-1 border border-[var(--input-border)] rounded-lg text-sm"
                            >
                                <option value="">All classes</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                        <div className="inline-flex rounded-md border border-[var(--surface-border)] text-xs overflow-hidden">
                            {RANGES.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setDays(r)}
                                    className={`px-2.5 py-1 ${days === r ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--brand-muted)] hover:bg-[var(--surface-border)]'}`}
                                >
                                    {r}d
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {engagement.series.length === 0 ? (
                    <p className="text-sm text-[var(--brand-muted)]">No lesson activity yet.</p>
                ) : (
                    <div className="flex items-end gap-[2px] h-32" role="img" aria-label="Minutes of lesson time per day">
                        {engagement.series.map((d) => (
                            <div
                                key={d.day}
                                className="flex-1 bg-[var(--brand-primary)]/70 hover:bg-[var(--brand-primary)] rounded-t"
                                style={{ height: `${Math.max(2, (100 * d.minutes) / maxMinutes)}%` }}
                                title={`${new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${Math.round(d.minutes)} min · ${d.active_members} active`}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Per-student table */}
            <section className="bg-[var(--surface)] rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[var(--brand-foreground)]">Students — last {days} days</h2>
                    <Link href="/manager/progress" className="text-xs text-[var(--brand-primary)] hover:underline">Course progress →</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--surface-border)] text-sm">
                        <thead className="bg-[var(--comment-secondary-bg)] text-xs uppercase text-[var(--brand-muted)]">
                            <tr>
                                <th className="px-4 sm:px-6 py-2 text-left font-medium">Student</th>
                                <th className="px-4 py-2 text-right font-medium">Minutes</th>
                                <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Active days</th>
                                <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Lessons</th>
                                <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Videos</th>
                                <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Units done</th>
                                <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Exams</th>
                                <th className="px-4 sm:px-6 py-2 text-left font-medium">Last active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--surface-border)]">
                            {engagement.members.length === 0 && (
                                <tr><td colSpan={8} className="px-6 py-6 text-center text-[var(--brand-muted)]">No students yet.</td></tr>
                            )}
                            {engagement.members.map((m) => {
                                const name = m.first_name || m.last_name ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : m.username;
                                return (
                                    <tr key={m.user_id} className={stalledIds.has(m.user_id) ? 'bg-amber-50/40' : ''}>
                                        <td className="px-4 sm:px-6 py-2 font-medium text-[var(--brand-foreground)]">
                                            {name}
                                            {stalledIds.has(m.user_id) && <span className="ml-2 text-[10px] uppercase text-amber-700">stalled</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{Math.round(m.minutes)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums hidden sm:table-cell">{m.active_days}</td>
                                        <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">{m.lessons_viewed}</td>
                                        <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">{m.videos_completed}</td>
                                        <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">{m.units_completed}</td>
                                        <td className="px-4 py-2 text-right tabular-nums hidden sm:table-cell">{m.exams_submitted}</td>
                                        <td className={`px-4 sm:px-6 py-2 ${recencyTone(m.last_activity_at)}`}>{relativeTime(m.last_activity_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function Stat({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'neutral' | 'ok' | 'warn' }) {
    const valueTone = tone === 'warn' ? 'text-amber-700' : tone === 'ok' ? 'text-emerald-700' : 'text-[var(--brand-foreground)]';
    return (
        <div className="bg-[var(--surface)] rounded-xl shadow-sm p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">{label}</div>
            <div className={`mt-1 text-xl font-semibold tabular-nums ${valueTone}`}>{value}</div>
            {sub && <div className="text-xs text-[var(--brand-muted)] mt-0.5">{sub}</div>}
        </div>
    );
}
