'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownTrayIcon, CheckCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { getLeadsAdmin, leadsCsvUrl, sendMarketingBroadcast } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import {
    LEAD_INTERESTS,
    leadInterestLabel,
    type AdminLeadRow,
    type BroadcastMode,
    type MarketingBroadcastResult,
} from '@/app/lib/types/lead';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

function isActive(lead: AdminLeadRow): boolean {
    return !lead.unsubscribed_at && !lead.bounced_at;
}

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<AdminLeadRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // One unfiltered fetch so the per-interest counts are complete; the
                // table filters client-side and the CSV link carries the filters.
                setLeads(await getLeadsAdmin({ include_unsubscribed: true }));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load leads');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <LoadingComponent />;

    return (
        <div className="space-y-10">
            {error && <ErrorComponent message={error} />}
            <LeadsPanel leads={leads} />
            <BroadcastPanel />
        </div>
    );
}

// ── Leads table ──────────────────────────────────────────────────────────────

function LeadsPanel({ leads }: { leads: AdminLeadRow[] }) {
    const [interest, setInterest] = useState<string>('');
    const [includeUnsubscribed, setIncludeUnsubscribed] = useState(false);

    const counts = useMemo(() => {
        const map = new Map<string, { active: number; unsubscribed: number; bounced: number }>();
        const keys = new Set<string>([...LEAD_INTERESTS, ...leads.map((l) => l.interest)]);
        for (const k of keys) map.set(k, { active: 0, unsubscribed: 0, bounced: 0 });
        for (const l of leads) {
            const c = map.get(l.interest)!;
            if (l.bounced_at) c.bounced += 1;
            else if (l.unsubscribed_at) c.unsubscribed += 1;
            else c.active += 1;
        }
        return [...map.entries()];
    }, [leads]);

    const filtered = useMemo(
        () =>
            leads.filter(
                (l) => (!interest || l.interest === interest) && (includeUnsubscribed || isActive(l)),
            ),
        [leads, interest, includeUnsubscribed],
    );

    const csvHref = leadsCsvUrl({ interest: interest || undefined, include_unsubscribed: includeUnsubscribed });

    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Leads ({filtered.length})</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                        aria-label="Filter by interest"
                        className="min-h-[44px] px-3 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
                    >
                        <option value="">All interests</option>
                        {counts.map(([k]) => (
                            <option key={k} value={k}>
                                {leadInterestLabel(k)}
                            </option>
                        ))}
                    </select>
                    <label className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--brand-foreground)]">
                        <input
                            type="checkbox"
                            checked={includeUnsubscribed}
                            onChange={(e) => setIncludeUnsubscribed(e.target.checked)}
                            className="h-4 w-4 accent-[var(--brand-primary)]"
                        />
                        Include unsubscribed / bounced
                    </label>
                    <a
                        href={csvHref}
                        className="flex min-h-[44px] items-center gap-1.5 px-3 text-sm rounded-md border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)]"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" /> Download CSV
                    </a>
                </div>
            </div>

            {/* Per-interest counts */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {counts.map(([k, c]) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setInterest(interest === k ? '' : k)}
                        className={`text-left p-3 rounded-md border transition-colors ${
                            interest === k
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                                : 'border-[var(--surface-border)] bg-[var(--surface)] hover:border-[var(--brand-primary)]/50'
                        }`}
                    >
                        <p className="text-xs text-[var(--brand-muted)]">{leadInterestLabel(k)}</p>
                        <p className="text-2xl font-semibold text-[var(--brand-foreground)]">{c.active}</p>
                        <p className="text-[11px] text-[var(--brand-muted)]">
                            {c.unsubscribed} unsubscribed · {c.bounced} bounced
                        </p>
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--brand-muted)] border-b border-[var(--surface-border)] bg-[var(--surface)]">
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Interest</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">UTM</th>
                            <th className="px-4 py-3">Joined</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((l) => (
                            <tr key={l.id} className="border-b border-[var(--surface-border)]">
                                <td className="px-4 py-3 text-[var(--brand-foreground)]">{l.email}</td>
                                <td className="px-4 py-3 text-[var(--brand-foreground)]">{leadInterestLabel(l.interest)}</td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">{l.source_path ?? '—'}</td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">
                                    {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(' / ') || '—'}
                                </td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">{fmtDate(l.created_at)}</td>
                                <td className="px-4 py-3">
                                    <LeadStatus lead={l} />
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-[var(--brand-muted)]">
                                    No leads match these filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function LeadStatus({ lead }: { lead: AdminLeadRow }) {
    const badge = 'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold';
    if (lead.bounced_at) {
        return <span className={`${badge} bg-red-500/15 text-red-600 dark:text-red-400`}>Bounced {fmtDate(lead.bounced_at)}</span>;
    }
    if (lead.unsubscribed_at) {
        return (
            <span className={`${badge} bg-[var(--surface-border)] text-[var(--brand-muted)]`}>
                Unsubscribed {fmtDate(lead.unsubscribed_at)}
            </span>
        );
    }
    if (!lead.confirmation_sent_at) {
        return <span className={`${badge} bg-amber-500/15 text-amber-600 dark:text-amber-400`}>Confirmation pending</span>;
    }
    return <span className={`${badge} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`}>Active</span>;
}

// ── Marketing broadcast (SES) ────────────────────────────────────────────────

function BroadcastPanel() {
    const { user } = useAuth();
    const [interests, setInterests] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState<BroadcastMode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    /** Recipient count from the last dry run; invalidated when the audience changes. */
    const [dryRunCount, setDryRunCount] = useState<number | null>(null);

    const toggleInterest = (k: string) => {
        setInterests((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
        setDryRunCount(null);
    };

    const ready = subject.trim().length > 0 && body.trim().length > 0 && interests.length > 0;

    const run = async (mode: BroadcastMode) => {
        if (!ready) return;
        if (mode === 'send') {
            if (dryRunCount == null) return;
            if (
                !confirm(
                    `Send "${subject.trim()}" to ${dryRunCount} recipient${dryRunCount === 1 ? '' : 's'} (${interests
                        .map(leadInterestLabel)
                        .join(', ')})? This cannot be undone.`,
                )
            )
                return;
        }
        setBusy(mode);
        setError(null);
        setNotice(null);
        try {
            const res: MarketingBroadcastResult = await sendMarketingBroadcast({
                subject: subject.trim(),
                body_markdown: body,
                interests,
                mode,
            });
            if (mode === 'dry_run') {
                setDryRunCount(res.recipients);
                setNotice(
                    `${res.recipients} recipient${res.recipients === 1 ? '' : 's'} would receive this email.` +
                        (res.ready
                            ? ''
                            : ' Marketing email is not configured on the server yet (SES settings or postal address) — Send will be refused.'),
                );
            } else if (mode === 'test') {
                setNotice(
                    res.failed > 0
                        ? 'Test send failed — check the backend logs.'
                        : `Test sent to ${user?.email ?? 'your admin address'}.`,
                );
            } else {
                setNotice(
                    res.status === 'queued'
                        ? `Sending to ${res.recipients} recipient${res.recipients === 1 ? '' : 's'} in the background — results are in the backend logs.`
                        : `Sent ${res.sent} of ${res.recipients}${res.failed ? ` · ${res.failed} failed` : ''}.`,
                );
                setDryRunCount(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Broadcast failed');
        } finally {
            setBusy(null);
        }
    };

    const field =
        'w-full px-3 py-2 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]';

    return (
        <section className="rounded-lg border border-[var(--surface-border)] p-5">
            <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Marketing email (SES)</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Sends to active leads in the selected interests from news.thedroneedge.com. The template adds the
                header, an unsubscribe link, and our postal address automatically — don&apos;t add them to the body.
            </p>

            {error && (
                <div className="mt-4">
                    <ErrorComponent message={error} />
                </div>
            )}
            {notice && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-md border border-[var(--surface-border)] bg-[var(--comment-secondary-bg)] text-sm text-[var(--brand-foreground)]">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                    {notice}
                </div>
            )}

            <fieldset className="mt-5" disabled={busy !== null}>
                <legend className="mb-2 text-sm font-semibold text-[var(--brand-foreground)]">Audience</legend>
                <div className="flex flex-wrap gap-x-5">
                    {LEAD_INTERESTS.map((k) => (
                        <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--brand-foreground)]">
                            <input
                                type="checkbox"
                                checked={interests.includes(k)}
                                onChange={() => toggleInterest(k)}
                                className="h-4 w-4 accent-[var(--brand-primary)]"
                            />
                            {leadInterestLabel(k)}
                        </label>
                    ))}
                </div>

                <label className="mt-4 block text-sm font-semibold text-[var(--brand-foreground)]" htmlFor="broadcast-subject">
                    Subject
                </label>
                <input
                    id="broadcast-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    className={`mt-1 ${field}`}
                />

                <label className="mt-4 block text-sm font-semibold text-[var(--brand-foreground)]" htmlFor="broadcast-body">
                    Body (Markdown)
                </label>
                <textarea
                    id="broadcast-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={12}
                    className={`mt-1 font-mono ${field}`}
                    placeholder={'Hi there,\n\nDrone Building early access opens in January…'}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => run('dry_run')}
                        disabled={!ready || busy !== null}
                        className="min-h-[44px] px-4 text-sm font-semibold rounded-md border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                    >
                        {busy === 'dry_run' ? 'Counting…' : 'Count recipients'}
                    </button>
                    <button
                        type="button"
                        onClick={() => run('test')}
                        disabled={!ready || busy !== null}
                        className="min-h-[44px] px-4 text-sm font-semibold rounded-md border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                    >
                        {busy === 'test' ? 'Sending test…' : 'Send test to me'}
                    </button>
                    <button
                        type="button"
                        onClick={() => run('send')}
                        disabled={!ready || busy !== null || dryRunCount == null || dryRunCount === 0}
                        title={dryRunCount == null ? 'Run "Count recipients" first' : undefined}
                        className="flex min-h-[44px] items-center gap-1.5 px-4 text-sm font-semibold rounded-md bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 disabled:opacity-40"
                    >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        {busy === 'send' ? 'Sending…' : dryRunCount != null ? `Send to ${dryRunCount}` : 'Send'}
                    </button>
                </div>
                {dryRunCount == null && (
                    <p className="mt-2 text-xs text-[var(--brand-muted)]">Run &ldquo;Count recipients&rdquo; before sending.</p>
                )}
            </fieldset>
        </section>
    );
}
