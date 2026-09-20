'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    getCourses,
    getReportingCohorts,
    getReportingCourseFunnel,
    getReportingHealth,
    getReportingOrganizations,
    getReportingOverview,
    getReportingPro,
    getReportingRevenue,
    getReportingSignals,
    getReportingUtilization,
    refreshReporting,
    reportingCsvUrl,
} from '@/app/lib/api-client';
import type {
    CohortRow,
    CourseFunnelResponse,
    OrgUtilizationRow,
    ReportingHealth,
    ReportingOverview,
    ReportingPro,
    ReportingRevenue,
    ReportingSignals,
    ReportingUtilization,
} from '@/app/lib/types/analytics';
import type { CourseData } from '@/app/lib/types/course';
import { formatCents, formatNumber, formatPct, relativeTime } from '@/app/lib/format-time';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import User360Panel from '@/app/ui/components/user-360-panel';
import ActivityChart from './activity-chart';
import ExamFunnelTable from './exam-funnel';
import { Bars, DataTable, Panel, SourceBadge, Stat, monthLabel, type Column } from './report-widgets';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const TABS = ['overview', 'revenue', 'courses', 'organizations', 'pro', 'signals', 'activity'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    revenue: 'Revenue',
    courses: 'Courses',
    organizations: 'Organizations',
    pro: 'Pro',
    signals: 'Signals',
    activity: 'Activity',
};

/**
 * Company reporting. Every tab is backed by /reporting/* which reads the
 * nightly materialized views (+ a few live tables). The same numbers, with
 * the SQL behind them, are documented in docs/tech/analytics-queries.md so
 * a snapshot report can be produced without the UI.
 */
export default function AdminAnalyticsPage() {
    const [tab, setTab] = useState<Tab>('overview');
    const [user360, setUser360] = useState<number | null>(null);

    useEffect(() => {
        const h = window.location.hash.replace('#', '') as Tab;
        if (TABS.includes(h)) setTab(h);
    }, []);
    const select = (t: Tab) => {
        setTab(t);
        window.history.replaceState(null, '', `#${t}`);
    };

    return (
        <div>
            <div className="mb-5 flex flex-wrap gap-1 border-b border-[var(--surface-border)]">
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => select(t)}
                        className={`px-3 py-2 text-sm -mb-px border-b-2 ${
                            tab === t
                                ? 'border-[var(--brand-primary)] text-[var(--brand-foreground)] font-semibold'
                                : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]'
                        }`}
                    >
                        {TAB_LABELS[t]}
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab />}
            {tab === 'revenue' && <RevenueTab />}
            {tab === 'courses' && <CoursesTab onUser={setUser360} />}
            {tab === 'organizations' && <OrganizationsTab />}
            {tab === 'pro' && <ProTab onUser={setUser360} />}
            {tab === 'signals' && <SignalsTab onUser={setUser360} />}
            {tab === 'activity' && <ActivityChart />}

            {user360 !== null && <User360Panel userId={user360} onClose={() => setUser360(null)} />}
        </div>
    );
}

// ── shared loader ─────────────────────────────────────────────────────────────

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; error: string | null; reload: () => void } {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    useEffect(() => {
        let cancelled = false;
        setError(null);
        fn()
            .then((d) => !cancelled && setData(d))
            .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, tick]);
    return { data, error, reload: () => setTick((t) => t + 1) };
}

function CsvLink({ report, courseId }: { report: string; courseId?: number }) {
    return (
        <a
            href={reportingCsvUrl(report, courseId)}
            download
            className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline"
        >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" /> CSV
        </a>
    );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab() {
    const { data, error, reload } = useLoad(
        () => Promise.all([getReportingOverview(), getReportingHealth()]),
        [],
    );
    const [refreshing, setRefreshing] = useState(false);
    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshReporting();
            reload();
        } finally {
            setRefreshing(false);
        }
    }, [reload]);

    if (error) return <ErrorComponent message={error} />;
    if (!data) return <LoadingComponent />;
    const [o, h] = data as [ReportingOverview, ReportingHealth];
    const paidPct = o.learners_entitled > 0 ? Math.round((100 * o.paying_learners) / o.learners_entitled) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-[var(--brand-muted)]">
                <span>
                    Views refreshed {relativeTime(o.views_refreshed_at)} · rollup {relativeTime(h.rollup_computed_at)} · {formatNumber(o.events_24h)} events / 24h ·{' '}
                    {h.product_events_size} in {h.partitions} partitions · {h.clean_nights_of_last_14}/14 clean reconciliation nights
                </span>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--surface-border)] rounded-md hover:bg-[var(--surface)] disabled:opacity-50"
                    title="Run the nightly maintenance now (rollup, view refresh, reconciliation)"
                >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh views
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Stat label="Activation rate" value={formatPct(o.activation_rate_pct)} sub={`paid learners 7–90d old, n=${o.activation_denominator}`} tone={o.activation_rate_pct !== null && o.activation_rate_pct < 60 ? 'warn' : 'ok'} title="Share of paid entitlements that completed a first unit within 7 days" />
                <Stat label="Median utilization" value={formatPct(o.median_utilization_pct)} sub="paid, ≥30d since access" title="Median % of course completed among paid learners with ≥30 days of access" />
                <Stat label="Contribution / payer" value={formatCents(o.contribution_per_payer_cents)} sub={`${formatCents(o.contribution_total_cents, { compact: true })} total`} title="Net revenue minus hardware COGS, averaged per paying user" />
                <Stat label="MRR" value={formatCents(o.mrr_cents)} sub={`${o.pro_active} active Pro`} />
                <Stat label="Org utilization" value={formatPct(o.avg_org_utilization_pct)} sub={`${o.organizations} organizations`} tone={o.avg_org_utilization_pct !== null && o.avg_org_utilization_pct < 40 ? 'warn' : 'ok'} title="Average of members active in 30d ÷ seats purchased" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Learners entitled" value={formatNumber(o.learners_entitled)} sub={`${o.paying_learners} paying (${paidPct}%)`} />
                <Stat label="Active 7d" value={formatNumber(o.active_7d)} sub={`${formatNumber(o.active_30d)} in 30d`} />
                <Stat label="Revenue 30d" value={formatCents(o.revenue_30d_cents)} sub="net of refunds" />
                <Stat label="Events 24h" value={formatNumber(o.events_24h)} sub={`${formatNumber(h.events_1h)} last hour`} />
            </div>

            <Panel title="By access source" action={<CsvLink report="utilization" />}>
                <DataTable
                    rows={o.by_source}
                    rowKey={(r) => r.primary_source}
                    columns={[
                        { key: 'src', label: 'Source', render: (r) => <SourceBadge source={r.primary_source} /> },
                        { key: 'ent', label: 'Entitlements', align: 'right', render: (r) => formatNumber(r.entitlements) },
                        { key: 'users', label: 'Users', align: 'right', render: (r) => formatNumber(r.users) },
                        { key: 'act', label: 'Activation', align: 'right', render: (r) => formatPct(r.activation_pct) },
                        { key: 'pct', label: 'Avg complete', align: 'right', render: (r) => formatPct(r.avg_pct_complete) },
                        { key: 'done', label: 'Completed', align: 'right', render: (r) => formatNumber(r.completed) },
                        { key: 'stalled', label: 'Stalled', align: 'right', render: (r) => <span className={r.stalled > 0 ? 'text-amber-700' : ''}>{formatNumber(r.stalled)}</span> },
                    ]}
                />
            </Panel>

            <Panel title="Reconciliation (nightly)">
                <DataTable
                    rows={h.reconciliation}
                    rowKey={(r) => r.check_name}
                    empty="Not run yet — nightly job at 00:30 UTC, or click Refresh views."
                    columns={[
                        { key: 'c', label: 'Check', render: (r) => r.check_name.replace(/_/g, ' ') },
                        { key: 'm', label: 'Mismatches', align: 'right', render: (r) => <span className={r.mismatches > 0 ? 'text-red-600 font-semibold' : 'text-emerald-700'}>{r.mismatches}</span> },
                        { key: 't', label: 'Ran', render: (r) => relativeTime(r.ran_at) },
                    ]}
                />
            </Panel>
        </div>
    );
}

// ── Revenue ───────────────────────────────────────────────────────────────────

function RevenueTab() {
    const [months, setMonths] = useState(12);
    const { data, error } = useLoad(() => getReportingRevenue(months), [months]);
    if (error) return <ErrorComponent message={error} />;
    if (!data) return <LoadingComponent />;
    const r: ReportingRevenue = data;

    const byMonth = new Map<string, { net: number; digital: number; hardware: number; seats: number; pro: number }>();
    for (const m of r.monthly) {
        const k = m.month;
        const cur = byMonth.get(k) ?? { net: 0, digital: 0, hardware: 0, seats: 0, pro: 0 };
        const net = Number(m.net_cents);
        cur.net += net;
        if (m.product_type === 'course' || m.product_type === 'bundle') cur.digital += net;
        else if (m.product_type === 'hardware') cur.hardware += net;
        else if (m.product_type === 'seats') cur.seats += net;
        else if (m.product_type === 'subscription') cur.pro += net;
        byMonth.set(k, cur);
    }
    const series = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Net revenue" value={formatCents(r.totals.net_cents)} sub={`${formatCents(r.totals.gross_cents, { compact: true })} gross · ${formatCents(r.totals.refunded_cents, { compact: true })} refunded`} />
                <Stat label="Contribution" value={formatCents(r.totals.contribution_cents)} sub="net − hardware COGS" />
                <Stat label="Avg net / payer" value={formatCents(r.totals.avg_net_per_payer_cents)} sub={`${r.totals.payers} payers · ${r.totals.repeat_buyers} repeat`} />
                <Stat label="Digital vs hardware" value={`${formatCents(r.totals.digital_cents, { compact: true })} / ${formatCents(r.totals.hardware_cents, { compact: true })}`} sub={`MRR ${formatCents(r.totals.mrr_cents)}`} />
            </div>

            <Panel
                title="Net revenue by month"
                action={
                    <div className="flex items-center gap-3">
                        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="text-xs border border-[var(--input-border)] rounded-md px-2 py-1">
                            {[6, 12, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
                        </select>
                        <CsvLink report="orders" />
                    </div>
                }
            >
                <Bars
                    label="Net revenue per month"
                    height={140}
                    data={series.map(([month, v]) => ({
                        key: month,
                        value: v.net,
                        title: `${monthLabel(month)}: ${formatCents(v.net)} (courses ${formatCents(v.digital)}, hardware ${formatCents(v.hardware)}, seats ${formatCents(v.seats)}, pro ${formatCents(v.pro)})`,
                    }))}
                />
                <DataTable
                    rows={series}
                    rowKey={([m]) => m}
                    columns={[
                        { key: 'm', label: 'Month', render: ([m]) => monthLabel(m) },
                        { key: 'net', label: 'Net', align: 'right', render: ([, v]) => formatCents(v.net) },
                        { key: 'd', label: 'Courses', align: 'right', render: ([, v]) => formatCents(v.digital) },
                        { key: 'h', label: 'Hardware', align: 'right', render: ([, v]) => formatCents(v.hardware) },
                        { key: 's', label: 'Seats', align: 'right', render: ([, v]) => formatCents(v.seats) },
                        { key: 'p', label: 'Pro', align: 'right', render: ([, v]) => formatCents(v.pro) },
                    ]}
                />
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="By SKU">
                    <DataTable
                        rows={r.by_sku}
                        rowKey={(s) => s.sku}
                        columns={[
                            { key: 'sku', label: 'SKU', render: (s) => <span title={s.name ?? ''}>{s.sku}</span> },
                            { key: 't', label: 'Type', render: (s) => s.product_type },
                            { key: 'u', label: 'Units', align: 'right', render: (s) => formatNumber(s.units) },
                            { key: 'b', label: 'Buyers', align: 'right', render: (s) => formatNumber(s.buyers) },
                            { key: 'n', label: 'Net', align: 'right', render: (s) => formatCents(s.net_cents) },
                        ]}
                    />
                </Panel>
                <Panel title="Payment methods">
                    <DataTable
                        rows={r.payment_methods}
                        rowKey={(p) => p.payment_method}
                        columns={[
                            { key: 'pm', label: 'Method', render: (p) => p.payment_method },
                            { key: 'o', label: 'Orders', align: 'right', render: (p) => formatNumber(p.orders) },
                            { key: 'n', label: 'Net', align: 'right', render: (p) => formatCents(p.net_cents) },
                        ]}
                    />
                </Panel>
            </div>
        </div>
    );
}

// ── Courses ───────────────────────────────────────────────────────────────────

function CoursesTab({ onUser }: { onUser?: (userId: number) => void }) {
    const { data, error } = useLoad(() => Promise.all([getReportingUtilization(), getCourses(), getReportingCohorts()]), []);
    const [courseId, setCourseId] = useState<number | null>(null);
    const funnel = useLoad(() => (courseId ? getReportingCourseFunnel(courseId) : Promise.resolve(null)), [courseId]);

    if (error) return <ErrorComponent message={error} />;
    if (!data) return <LoadingComponent />;
    const [util, courses, cohorts] = data as [ReportingUtilization, CourseData[], CohortRow[]];
    const f = funnel.data as CourseFunnelResponse | null;

    return (
        <div className="space-y-6">
            <Panel title="Utilization by course" action={<CsvLink report="usage" />}>
                <DataTable
                    rows={util.by_course}
                    rowKey={(c) => c.course_id}
                    onRowClick={(c) => setCourseId(c.course_id)}
                    columns={[
                        { key: 't', label: 'Course', render: (c) => <span className="font-medium text-[var(--brand-foreground)]">{c.title}</span> },
                        { key: 'e', label: 'Entitled', align: 'right', render: (c) => formatNumber(c.entitled) },
                        { key: 's', label: 'Started', align: 'right', render: (c) => `${formatNumber(c.started)} (${c.entitled ? Math.round((100 * c.started) / c.entitled) : 0}%)` },
                        { key: 'c', label: 'Completed', align: 'right', render: (c) => `${formatNumber(c.completed)} (${c.entitled ? Math.round((100 * c.completed) / c.entitled) : 0}%)` },
                        { key: 'm', label: 'Median %', align: 'right', render: (c) => formatPct(c.median_pct) },
                        { key: 'min', label: 'Avg minutes', align: 'right', render: (c) => formatNumber(c.avg_minutes) },
                        { key: 'v', label: 'Avg videos done', align: 'right', render: (c) => c.avg_videos_completed == null ? '—' : Number(c.avg_videos_completed).toFixed(1) },
                    ]}
                />
            </Panel>

            <Panel
                title={courseId ? `Lesson funnel — ${courses.find((c) => c.id === courseId)?.title ?? courseId}` : 'Lesson funnel'}
                action={
                    <div className="flex items-center gap-3">
                        <select value={courseId ?? ''} onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : null)} className="text-xs border border-[var(--input-border)] rounded-md px-2 py-1">
                            <option value="">Select a course…</option>
                            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        {courseId && <CsvLink report="funnel" courseId={courseId} />}
                    </div>
                }
            >
                {!courseId ? (
                    <p className="text-sm text-[var(--brand-muted)] px-4 py-6">Pick a course to see where learners drop off, lesson by lesson.</p>
                ) : funnel.error ? (
                    <p className="text-sm text-[var(--brand-muted)] px-4 py-6">{funnel.error}</p>
                ) : !f ? (
                    <div className="p-6"><LoadingComponent /></div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4">
                            <Stat label="Entitled" value={formatNumber(f.summary.entitled)} />
                            <Stat label="Started" value={formatNumber(f.summary.started)} />
                            <Stat label="Activated" value={formatNumber(f.summary.activated)} sub="first unit ≤7d" />
                            <Stat label="Completed" value={formatNumber(f.summary.completed)} sub="marked the course done" title="Course-level COMPLETED — students almost never tap this. Use Viewed and Quiz passed in the table." />
                            <Stat label="Median %" value={formatPct(f.summary.median_pct)} sub={`${formatNumber(f.summary.avg_minutes)} min avg`} title="Share of the unit tree marked complete. Opening a lesson does not count." />
                            <Stat label="Avg best score" value={f.summary.avg_best_score == null ? '—' : `${f.summary.avg_best_score}%`} />
                        </div>
                        <p className="px-4 pb-2 text-xs text-[var(--brand-muted)]">
                            <strong>Completed</strong> is a student tap (or a passed lesson quiz from now on). <strong>Viewed</strong> means they opened the lesson. <strong>Quiz passed</strong> is anyone who scored ≥70 on that lesson&apos;s quiz — the honest finish signal for Part 107.
                        </p>
                        <DataTable
                            rows={f.units}
                            rowKey={(u) => u.unit_ref}
                            columns={[
                                { key: 'u', label: 'Lesson', render: (u) => <span style={{ paddingLeft: u.depth * 12 }} className={u.depth === 0 ? 'font-medium text-[var(--brand-foreground)]' : ''}>{u.title}{u.has_video ? ' ▶' : ''}</span> },
                                { key: 'v', label: 'Viewed', align: 'right', render: (u) => `${formatNumber(u.viewed)} (${u.entitled ? Math.round((100 * u.viewed) / u.entitled) : 0}%)` },
                                { key: 'q', label: 'Quiz passed', align: 'right', render: (u) => u.quiz_passed ? `${formatNumber(u.quiz_passed)} (${u.entitled ? Math.round((100 * u.quiz_passed) / u.entitled) : 0}%)` : '—' },
                                { key: 'c', label: 'Marked done', align: 'right', render: (u) => `${formatNumber(u.completed)} (${u.entitled ? Math.round((100 * u.completed) / u.entitled) : 0}%)` },
                                { key: 'vc', label: 'Video done', align: 'right', render: (u) => u.has_video ? formatNumber(u.video_completed) : '—' },
                                { key: 'm', label: 'Median min', align: 'right', render: (u) => u.median_minutes == null ? '—' : Number(u.median_minutes).toFixed(0) },
                            ]}
                        />
                        {f.exams.length > 0 && (
                            <div className="border-t border-[var(--surface-border)]">
                                <h4 className="px-4 pt-3 text-xs font-semibold uppercase text-[var(--brand-muted)]">Exams</h4>
                                <p className="px-4 pt-1 text-xs text-[var(--brand-muted)]">Click a row for who took it, scores, and section breakdown.</p>
                                <ExamFunnelTable courseId={courseId} exams={f.exams} onUser={onUser} />
                            </div>
                        )}
                    </>
                )}
            </Panel>

            <Panel title="Cohorts by month of first access" action={<CsvLink report="cohorts" />}>
                <DataTable
                    rows={cohorts}
                    rowKey={(c) => `${c.cohort_month}-${c.primary_source}`}
                    columns={[
                        { key: 'm', label: 'Cohort', render: (c) => monthLabel(c.cohort_month) },
                        { key: 's', label: 'Source', render: (c) => <SourceBadge source={c.primary_source} /> },
                        { key: 'e', label: 'Entitled', align: 'right', render: (c) => formatNumber(c.entitled) },
                        { key: 'a', label: 'Activated', align: 'right', render: (c) => `${formatNumber(c.activated)} (${c.entitled ? Math.round((100 * c.activated) / c.entitled) : 0}%)` },
                        { key: 'c', label: 'Completed', align: 'right', render: (c) => formatNumber(c.completed) },
                        { key: 'st', label: 'Stalled', align: 'right', render: (c) => formatNumber(c.stalled) },
                        { key: '2nd', label: '2nd purchase', align: 'right', render: (c) => formatNumber(c.second_purchase_users) },
                        { key: 'r', label: 'Refunded', align: 'right', render: (c) => formatNumber(c.refunded_users) },
                    ]}
                />
            </Panel>
        </div>
    );
}

// ── Organizations ─────────────────────────────────────────────────────────────

function OrganizationsTab() {
    const { data, error } = useLoad(() => getReportingOrganizations(), []);
    if (error) return <ErrorComponent message={error} />;
    if (!data) return <LoadingComponent />;
    const rows: OrgUtilizationRow[] = data;
    const cols: Column<OrgUtilizationRow>[] = [
        { key: 'n', label: 'Organization', render: (o) => <Link href={`/admin/organizations`} className="font-medium text-[var(--brand-foreground)] hover:underline">{o.name}</Link> },
        { key: 'seats', label: 'Seats', align: 'right', render: (o) => `${o.members} / ${o.seats_purchased || '∞'}` },
        { key: 'inv', label: 'Invites', align: 'right', render: (o) => `${o.invites_redeemed} / ${o.invites_sent}` },
        { key: 'act', label: 'Activated', align: 'right', render: (o) => formatNumber(o.members_activated) },
        { key: 'e30', label: 'Active seats 30d', align: 'right', render: (o) => `${o.members_engaged_30d} (${o.members_engaged_7d} this week)` },
        { key: 'u', label: 'Seat utilization', align: 'right', render: (o) => <span className={o.utilization_pct_30d < 40 ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>{formatPct(o.utilization_pct_30d)}</span> },
        { key: 'pct', label: 'Avg complete', align: 'right', render: (o) => formatPct(o.avg_pct_complete) },
        { key: 'h', label: 'Hours 30d', align: 'right', render: (o) => Number(o.hours_engaged_30d).toFixed(1) },
        { key: 'mgr', label: 'Manager seen', render: (o) => relativeTime(o.manager_last_seen_at) },
    ];
    const totals = rows.reduce(
        (a, o) => ({ seats: a.seats + o.seats_purchased, members: a.members + o.members, engaged: a.engaged + o.members_engaged_30d }),
        { seats: 0, members: 0, engaged: 0 },
    );
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Organizations" value={formatNumber(rows.length)} />
                <Stat label="Seats sold" value={formatNumber(totals.seats)} sub={`${totals.members} members`} />
                <Stat label="Active seats 30d" value={formatNumber(totals.engaged)} sub={totals.seats ? `${Math.round((100 * totals.engaged) / totals.seats)}% of seats sold` : undefined} />
                <Stat label="Below 40 %" value={formatNumber(rows.filter((o) => o.members === 0 || o.utilization_pct_30d < 40).length)} sub="renewal risk · tracked only (MM9)" tone="warn" />
            </div>
            <Panel title="Seat utilization (lowest first) — active seat = any learning activity in 30 days (PD7); teacher view uses 7 days" action={<CsvLink report="organizations" />}>
                <DataTable rows={rows} rowKey={(o) => o.organization_id} columns={cols} empty="No organizations yet." />
            </Panel>
        </div>
    );
}

// ── Pro ───────────────────────────────────────────────────────────────────────

function ProTab({ onUser }: { onUser: (id: number) => void }) {
    const { data, error } = useLoad(() => Promise.all([getReportingPro(12), getReportingSignals()]), []);
    if (error) return <ErrorComponent message={error} />;
    if (!data) return <LoadingComponent />;
    const [p, signals] = data as [ReportingPro, ReportingSignals];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Stat label="Active Pro" value={formatNumber(p.active)} sub={`${p.active_yearly} yearly`} />
                <Stat label="MRR" value={formatCents(p.mrr_cents)} />
                <Stat label="Payment failed 30d" value={formatNumber(p.payment_failed_30d)} tone={p.payment_failed_30d > 0 ? 'warn' : 'neutral'} />
                <Stat label="Cancel scheduled 30d" value={formatNumber(p.cancel_scheduled_30d)} tone={p.cancel_scheduled_30d > 0 ? 'warn' : 'neutral'} />
                <Stat label="Pro engagement" value={formatPct(p.avg_pct_complete)} sub={`${p.avg_courses_touched ?? '—'} courses touched avg`} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Lifecycle events by month">
                    <DataTable
                        rows={p.monthly}
                        rowKey={(m) => m.month}
                        columns={[
                            { key: 'm', label: 'Month', render: (m) => monthLabel(m.month) },
                            { key: 's', label: 'Started', align: 'right', render: (m) => m.started },
                            { key: 'r', label: 'Renewed', align: 'right', render: (m) => m.renewed },
                            { key: 'c', label: 'Cancelled', align: 'right', render: (m) => m.cancelled },
                            { key: 'e', label: 'Expired', align: 'right', render: (m) => m.expired },
                            { key: 'f', label: 'Pay failed', align: 'right', render: (m) => m.payment_failed },
                        ]}
                    />
                </Panel>
                <Panel title="Retention by start month">
                    <DataTable
                        rows={p.cohorts}
                        rowKey={(c) => c.cohort_month}
                        columns={[
                            { key: 'm', label: 'Cohort', render: (c) => monthLabel(c.cohort_month) },
                            { key: 's', label: 'Started', align: 'right', render: (c) => c.started },
                            { key: 'a', label: 'Still active', align: 'right', render: (c) => `${c.still_active} (${c.started ? Math.round((100 * c.still_active) / c.started) : 0}%)` },
                            { key: 'c', label: 'Cancelled', align: 'right', render: (c) => c.cancelled },
                            { key: 'e', label: 'Expired', align: 'right', render: (c) => c.expired },
                            { key: 'avg', label: 'Avg months', align: 'right', render: (c) => c.avg_months ?? '—' },
                        ]}
                    />
                </Panel>
            </div>
            <SignalTable title="Pro at risk (ends ≤14d, payment failed, cancel scheduled, or idle 21d)" rows={signals.pro_at_risk} onUser={onUser}
                columns={['username', 'email', 'ends_at', 'failed_30d', 'last_activity_at']} />
        </div>
    );
}

// ── Signals ───────────────────────────────────────────────────────────────────

function SignalsTab({ onUser }: { onUser: (id: number) => void }) {
    const { data, error } = useLoad(() => getReportingSignals(), []);
    if (error) return <ErrorComponent message={error} />;
    if (!data) return <LoadingComponent />;
    const s: ReportingSignals = data;
    return (
        <div className="space-y-6">
            <p className="text-xs text-[var(--brand-muted)]">
                Each list is a queue for a specific offer or action (docs/sales/money-model.md). Click a row to open the user 360.
            </p>
            <SignalTable title={`Stalled paid learners (${s.stalled_paid_learners.length}) — nudge / coaching offer`} rows={s.stalled_paid_learners} onUser={onUser}
                columns={['username', 'email', 'title', 'primary_source', 'pct_complete', 'last_activity_at']} />
            <SignalTable title={`Completed, no hardware (${s.completed_not_upsold.length}) — kit / parts upsell`} rows={s.completed_not_upsold} onUser={onUser}
                columns={['username', 'email', 'title', 'completed_at']} />
            <SignalTable title={`Engaged free users (${s.engaged_free_users.length}) — convert to paid`} rows={s.engaged_free_users} onUser={onUser}
                columns={['username', 'email', 'title', 'primary_source', 'minutes_engaged', 'pct_complete']} />
            <SignalTable title={`Hot streak learners (${s.hot_streak_learners.length}) — Pro / next course`} rows={s.hot_streak_learners} onUser={onUser}
                columns={['username', 'minutes_7d', 'active_days_7d']} />
            <SignalTable title={`Pro at risk (${s.pro_at_risk.length})`} rows={s.pro_at_risk} onUser={onUser}
                columns={['username', 'email', 'ends_at', 'failed_30d', 'last_activity_at']} />
            <SignalTable title={`Low-utilization organizations (${s.low_utilization_orgs.length}) — manager check-in`} rows={s.low_utilization_orgs}
                columns={['name', 'seats_purchased', 'members', 'members_engaged_30d', 'utilization_pct_30d', 'invites_redeemed', 'manager_last_seen_at']} />
        </div>
    );
}

function SignalTable({
    title,
    rows,
    columns,
    onUser,
}: {
    title: string;
    rows: Record<string, unknown>[];
    columns: string[];
    onUser?: (id: number) => void;
}) {
    const fmt = (k: string, v: unknown): string => {
        if (v === null || v === undefined) return '—';
        if (/_at$/.test(k)) return relativeTime(String(v));
        if (/_cents$/.test(k)) return formatCents(v as string);
        if (/pct/.test(k)) return formatPct(v as number);
        return String(v);
    };
    return (
        <Panel title={title}>
            <DataTable
                rows={rows}
                rowKey={(r, i) => String(r.user_id ?? r.organization_id ?? i)}
                onRowClick={onUser ? (r) => typeof r.user_id === 'number' && onUser(r.user_id) : undefined}
                empty="Nothing in this queue."
                columns={columns.map((k) => ({
                    key: k,
                    label: k.replace(/_/g, ' '),
                    align: /pct|minutes|cents|_30d|_7d|seats|members/.test(k) && !/_at$/.test(k) ? 'right' : 'left',
                    render: (r: Record<string, unknown>) => (k === 'primary_source' ? <SourceBadge source={String(r[k])} /> : fmt(k, r[k])),
                }))}
            />
        </Panel>
    );
}
