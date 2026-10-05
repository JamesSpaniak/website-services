'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import {
    approveNewsletterIssue,
    countNewsletterRecipients,
    getNewsletterIssue,
    getNewsletterIssues,
    getNewsletterMetrics,
    importNewsletterFile,
    previewNewsletterFile,
    sendNewsletterIssue,
    sendNewsletterTest,
} from '@/app/lib/api-client';
import { leadInterestLabel } from '@/app/lib/types/lead';
import type { IssueCount, IssueMetrics, IssuePreview, IssueStatus, NewsletterIssue } from '@/app/lib/types/newsletter';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

const STATUS_STYLE: Record<IssueStatus, string> = {
    draft: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)]',
    approved: 'bg-[var(--brand-primary)]/15 text-[var(--brand-foreground)]',
    sending: 'bg-amber-500/15 text-amber-600',
    sent: 'bg-green-600/15 text-green-600',
};

const btn =
    'inline-flex min-h-[40px] items-center gap-2 px-4 text-sm font-semibold border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--brand-foreground)] hover:opacity-90 disabled:opacity-50';
const btnPrimary =
    'inline-flex min-h-[40px] items-center gap-2 px-4 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 disabled:opacity-50';

/**
 * Admin → Newsletter (newsletter plan § 8 "Publishing and updates").
 * Write the issue in the repo (assets/newsletter/YYYY-MM.md), upload it here
 * — locally to preview, on the live site to send. Re-upload to change a
 * draft (resets approval); after send, a re-upload with `correction:` only
 * changes the web copy.
 */
export default function AdminNewsletterPage() {
    const [issues, setIssues] = useState<NewsletterIssue[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            setIssues(await getNewsletterIssues());
        } catch (e) {
            setError(errMsg(e, 'Failed to load issues'));
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    if (!issues && !error) return <LoadingComponent />;

    return (
        <div className="space-y-10">
            {error && <ErrorComponent message={error} />}
            <UploadPanel
                onImported={(slug) => {
                    setSelected(slug);
                    reload();
                }}
            />
            <IssueList issues={issues ?? []} selected={selected} onSelect={setSelected} />
            {selected && <IssueDetailPanel key={selected} slug={selected} onChanged={reload} />}
        </div>
    );
}

// ── Upload ───────────────────────────────────────────────────────────────────

function UploadPanel({ onImported }: { onImported: (slug: string) => void }) {
    const [source, setSource] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const [checked, setChecked] = useState<IssuePreview | null>(null);
    const [busy, setBusy] = useState<'check' | 'upload' | null>(null);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSource(await file.text());
        setFileName(file.name);
        setChecked(null);
        setMessage(null);
    };

    const check = async () => {
        setBusy('check');
        setMessage(null);
        try {
            setChecked(await previewNewsletterFile(source));
        } catch (e) {
            setChecked(null);
            setMessage({ text: errMsg(e, 'Could not read the file.'), ok: false });
        } finally {
            setBusy(null);
        }
    };

    const upload = async () => {
        setBusy('upload');
        setMessage(null);
        try {
            const res = await importNewsletterFile(source);
            const what =
                res.action === 'created'
                    ? 'Draft created.'
                    : res.action === 'replaced'
                      ? 'Draft replaced (any approval was reset).'
                      : 'Web version corrected. The sent email is unchanged.';
            setMessage({ text: `${res.issue.slug}: ${what}`, ok: true });
            setChecked(null);
            onImported(res.issue.slug);
        } catch (e) {
            setMessage({ text: errMsg(e, 'Upload failed.'), ok: false });
        } finally {
            setBusy(null);
        }
    };

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)]">Upload an issue</h2>
                <p className="mt-1 text-sm text-[var(--brand-muted)] max-w-3xl">
                    Write the issue in the repo (<code>assets/newsletter/YYYY-MM.md</code>, from <code>_template.md</code>),
                    then upload the whole file. The <code>slug</code> in its front matter decides which issue it updates.
                    Uploading again replaces the draft and resets approval. After an issue is sent, an upload only changes
                    the web copy and needs a <code>correction:</code> line. Steps:{' '}
                    <code>workflows/marketing/newsletter.md</code>.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <input ref={fileRef} type="file" accept=".md,text/markdown,text/plain" onChange={onFile} className="hidden" />
                <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
                    <ArrowUpTrayIcon className="h-4 w-4" aria-hidden /> Choose .md file
                </button>
                {fileName && <span className="text-sm text-[var(--brand-muted)]">{fileName}</span>}
            </div>
            <label htmlFor="nl-source" className="block text-sm font-semibold text-[var(--brand-foreground)]">
                …or paste the file
            </label>
            <textarea
                id="nl-source"
                value={source}
                onChange={(e) => {
                    setSource(e.target.value);
                    setChecked(null);
                }}
                rows={8}
                spellCheck={false}
                placeholder={'---\nslug: 2026-11\nsubject: Field Notes · November 2026 · …\npreheader: …\nlists: newsletter\n---\n\n…'}
                className="w-full font-mono text-xs p-3 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
            />
            <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} disabled={!source.trim() || busy !== null} onClick={check}>
                    {busy === 'check' ? 'Checking…' : 'Check (no save)'}
                </button>
                <button type="button" className={btnPrimary} disabled={!source.trim() || busy !== null} onClick={upload}>
                    {busy === 'upload' ? 'Uploading…' : 'Upload'}
                </button>
            </div>
            {message && (
                <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-500'}`} role="status">
                    {message.text}
                </p>
            )}
            {checked && <PreviewPane preview={checked} />}
        </section>
    );
}

// ── List ─────────────────────────────────────────────────────────────────────

function IssueList({
    issues,
    selected,
    onSelect,
}: {
    issues: NewsletterIssue[];
    selected: string | null;
    onSelect: (slug: string) => void;
}) {
    return (
        <section>
            <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-3">Issues</h2>
            {issues.length === 0 ? (
                <p className="text-sm text-[var(--brand-muted)]">No issues yet. Upload one above.</p>
            ) : (
                <div className="overflow-x-auto border border-[var(--surface-border)]">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--surface)] text-left text-[var(--brand-muted)]">
                            <tr>
                                <th className="p-2">Slug</th>
                                <th className="p-2">Subject</th>
                                <th className="p-2">Status</th>
                                <th className="p-2">Sent</th>
                                <th className="p-2">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {issues.map((i) => (
                                <tr
                                    key={i.slug}
                                    onClick={() => onSelect(i.slug)}
                                    className={`cursor-pointer border-t border-[var(--surface-border)] hover:bg-[var(--surface)] ${selected === i.slug ? 'bg-[var(--surface)]' : ''}`}
                                >
                                    <td className="p-2 font-mono">{i.slug}</td>
                                    <td className="p-2 text-[var(--brand-foreground)]">{i.subject}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[i.status]}`}>{i.status}</span>
                                    </td>
                                    <td className="p-2 text-[var(--brand-muted)]">
                                        {i.status === 'sent' || i.status === 'sending'
                                            ? `${i.sent_count}${i.failed_count ? ` (+${i.failed_count} failed)` : ''} / ${i.recipients ?? '—'}`
                                            : '—'}
                                    </td>
                                    <td className="p-2 text-[var(--brand-muted)]">{fmt(i.updated_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

// ── Detail ───────────────────────────────────────────────────────────────────

function IssueDetailPanel({ slug, onChanged }: { slug: string; onChanged: () => void }) {
    const [issue, setIssue] = useState<NewsletterIssue | null>(null);
    const [preview, setPreview] = useState<IssuePreview | null>(null);
    const [count, setCount] = useState<IssueCount | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const d = await getNewsletterIssue(slug);
            setIssue(d.issue);
            setPreview(d.preview);
        } catch (e) {
            setError(errMsg(e, 'Failed to load the issue'));
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    // While sending, refresh the counts every few seconds.
    useEffect(() => {
        if (issue?.status !== 'sending') return;
        const t = setInterval(() => {
            load();
            onChanged();
        }, 5000);
        return () => clearInterval(t);
    }, [issue?.status, load, onChanged]);

    const act = async (name: string, fn: () => Promise<string>) => {
        setBusy(name);
        setMessage(null);
        try {
            setMessage({ text: await fn(), ok: true });
            await load();
            onChanged();
        } catch (e) {
            setMessage({ text: errMsg(e, 'Action failed.'), ok: false });
        } finally {
            setBusy(null);
        }
    };

    if (error) return <ErrorComponent message={error} />;
    if (!issue || !preview) return <LoadingComponent />;

    const doCount = () =>
        act('count', async () => {
            const c = await countNewsletterRecipients(slug);
            setCount(c);
            return `${c.recipients} recipient(s) would get it${c.already_sent ? ` (${c.already_sent} already sent)` : ''}.${c.ready ? '' : ' Email sending is not configured here, so nothing would actually go out.'}`;
        });

    return (
        <section className="space-y-4 border-t border-[var(--surface-border)] pt-8">
            <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)]">{issue.subject}</h2>
                <span className={`px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[issue.status]}`}>{issue.status}</span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-[var(--brand-muted)]">
                <div>
                    <dt className="inline font-semibold">Lists: </dt>
                    <dd className="inline">{issue.lists.map(leadInterestLabel).join(', ')}</dd>
                </div>
                <div>
                    <dt className="inline font-semibold">Preheader: </dt>
                    <dd className="inline">{issue.preheader ?? '—'}</dd>
                </div>
                <div>
                    <dt className="inline font-semibold">Approved: </dt>
                    <dd className="inline">{fmt(issue.approved_at)}</dd>
                </div>
                <div>
                    <dt className="inline font-semibold">Sent: </dt>
                    <dd className="inline">
                        {fmt(issue.sent_at)}
                        {issue.recipients != null && ` · ${issue.sent_count} sent, ${issue.failed_count} failed of ${issue.recipients}`}
                    </dd>
                </div>
            </dl>

            <div className="flex flex-wrap gap-2">
                {issue.status !== 'sent' && (
                    <button
                        type="button"
                        className={btn}
                        disabled={busy !== null}
                        onClick={() =>
                            act('test', async () => {
                                const r = await sendNewsletterTest(slug);
                                return r.sent
                                    ? `Test sent to ${r.to}.`
                                    : `Test not sent (${r.reason ?? 'unknown'}) — email sending isn't configured here. Use the preview below.`;
                            })
                        }
                    >
                        {busy === 'test' ? 'Sending test…' : 'Send test to me'}
                    </button>
                )}
                {issue.status === 'draft' && (
                    <button
                        type="button"
                        className={btnPrimary}
                        disabled={busy !== null}
                        onClick={() =>
                            act('approve', async () => {
                                await approveNewsletterIssue(slug, true);
                                return 'Approved. Count recipients, then send.';
                            })
                        }
                    >
                        <CheckCircleIcon className="h-4 w-4" aria-hidden /> Approve
                    </button>
                )}
                {issue.status === 'approved' && (
                    <>
                        <button type="button" className={btn} disabled={busy !== null} onClick={doCount}>
                            {busy === 'count' ? 'Counting…' : 'Count recipients'}
                        </button>
                        <button
                            type="button"
                            className={btn}
                            disabled={busy !== null}
                            onClick={() =>
                                act('unapprove', async () => {
                                    await approveNewsletterIssue(slug, false);
                                    return 'Back to draft.';
                                })
                            }
                        >
                            Back to draft
                        </button>
                        <button
                            type="button"
                            className={btnPrimary}
                            disabled={busy !== null || count == null}
                            title={count == null ? 'Count recipients first' : undefined}
                            onClick={() => {
                                if (!window.confirm(`Send "${issue.subject}" to ${count?.recipients} recipient(s)? This can't be undone.`)) return;
                                act('send', async () => {
                                    const r = await sendNewsletterIssue(slug);
                                    return `Sending to ${r.recipients}. Progress updates here.`;
                                });
                            }}
                        >
                            <PaperAirplaneIcon className="h-4 w-4" aria-hidden />
                            {busy === 'send' ? 'Starting…' : count ? `Send to ${count.recipients}` : 'Send'}
                        </button>
                    </>
                )}
                {issue.status === 'sending' && (
                    <button
                        type="button"
                        className={btn}
                        disabled={busy !== null}
                        title="Only for a send that stopped (e.g. a deploy mid-send). Already-sent addresses are skipped."
                        onClick={() =>
                            act('resume', async () => {
                                const r = await sendNewsletterIssue(slug);
                                return `Resumed: ${r.recipients} left.`;
                            })
                        }
                    >
                        Resume stopped send
                    </button>
                )}
                {issue.status === 'sent' && (
                    <Link href={`/newsletter/${issue.slug}`} target="_blank" className={btn}>
                        Open web version
                    </Link>
                )}
            </div>
            {message && (
                <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-500'}`} role="status">
                    {message.text}
                </p>
            )}
            {(issue.status === 'sent' || issue.status === 'sending') && <MetricsPanel slug={slug} />}
            {issue.corrections.length > 0 && (
                <div className="text-sm text-[var(--brand-muted)]">
                    <p className="font-semibold">Web corrections</p>
                    <ul className="list-disc pl-5">
                        {issue.corrections.map((c) => (
                            <li key={c.at}>
                                {fmt(c.at)}: {c.note}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <PreviewPane preview={preview} />
        </section>
    );
}

// ── Metrics ──────────────────────────────────────────────────────────────────

/**
 * Per-issue results from the send log + SES events. Clicks are the real
 * signal; opens are shown greyed out because Apple Mail preloads images.
 * "Scanner clicks" = clicks within 30 s of sending (school / corporate mail
 * filters), excluded from people and sections. Who-clicked list is
 * admin-only follow-up data, kept 12 months.
 */
function MetricsPanel({ slug }: { slug: string }) {
    const [m, setM] = useState<IssueMetrics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showPeople, setShowPeople] = useState(false);

    useEffect(() => {
        getNewsletterMetrics(slug)
            .then(setM)
            .catch((e) => setError(errMsg(e, 'Failed to load metrics')));
    }, [slug]);

    if (error) return <p className="text-sm text-red-500">{error}</p>;
    if (!m) return <p className="text-sm text-[var(--brand-muted)]">Loading results…</p>;

    const stat = (label: string, value: string | number, note?: string, dim = false) => (
        <div className={`border border-[var(--surface-border)] p-3 ${dim ? 'opacity-60' : ''}`}>
            <p className="text-xs text-[var(--brand-muted)]">{label}</p>
            <p className="text-xl font-semibold text-[var(--brand-foreground)]">{value}</p>
            {note && <p className="text-xs text-[var(--brand-muted)]">{note}</p>}
        </div>
    );
    const pct = (n: number) => (m.sent ? `${Math.round((n / m.sent) * 1000) / 10}%` : '—');

    return (
        <div className="space-y-4">
            <h3 className="text-base font-display font-semibold text-[var(--brand-foreground)]">Results</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stat('Sent', m.sent, m.failed ? `${m.failed} failed` : undefined)}
                {stat('Delivered', m.delivered, m.bounced ? `${m.bounced} bounced (${pct(m.bounced)})` : undefined)}
                {stat('People who clicked', m.clickers, m.click_rate != null ? `${m.click_rate}% of delivered` : undefined)}
                {stat('Clicks', m.human_clicks, m.scanner_clicks ? `+${m.scanner_clicks} by mail scanners (excluded)` : undefined)}
                {stat('Unsubscribes (7 days)', m.unsubscribes, `target < 0.5% · ${pct(m.unsubscribes)}`)}
                {stat('Spam complaints', m.complaints, `limit < 0.1% · ${pct(m.complaints)}`)}
                {stat('Opens', m.opens, 'Unreliable: Apple Mail preloads images', true)}
            </div>
            {m.by_section.length > 0 && (
                <table className="text-sm">
                    <thead className="text-left text-[var(--brand-muted)]">
                        <tr>
                            <th className="pr-6 py-1">Section (utm_content)</th>
                            <th className="pr-6 py-1">Clicks</th>
                            <th className="py-1">People</th>
                        </tr>
                    </thead>
                    <tbody>
                        {m.by_section.map((s) => (
                            <tr key={s.section} className="border-t border-[var(--surface-border)]">
                                <td className="pr-6 py-1 font-mono">{s.section}</td>
                                <td className="pr-6 py-1">{s.clicks}</td>
                                <td className="py-1">{s.people}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {m.people.length > 0 && (
                <div>
                    <button type="button" className={btn} onClick={() => setShowPeople((v) => !v)}>
                        {showPeople ? 'Hide' : 'Show'} who clicked ({m.people.length})
                    </button>
                    {showPeople && (
                        <div className="mt-2 overflow-x-auto border border-[var(--surface-border)]">
                            <p className="p-2 text-xs text-[var(--brand-muted)]">
                                For follow-up only (e.g. a teacher who clicked the consultation link). Don&apos;t export or
                                use for anything else; kept 12 months.
                            </p>
                            <table className="w-full text-sm">
                                <thead className="text-left text-[var(--brand-muted)] bg-[var(--surface)]">
                                    <tr>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">First click</th>
                                        <th className="p-2">Clicks</th>
                                        <th className="p-2">Sections</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {m.people.map((p) => (
                                        <tr key={p.email} className="border-t border-[var(--surface-border)]">
                                            <td className="p-2">{p.email}</td>
                                            <td className="p-2 text-[var(--brand-muted)]">{fmt(p.first_click)}</td>
                                            <td className="p-2">{p.clicks}</td>
                                            <td className="p-2 font-mono text-xs">{p.sections.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            <p className="text-xs text-[var(--brand-muted)]">
                Signups and purchases from this issue: run the newsletter queries in{' '}
                <code>docs/tech/analytics-queries.md</code> § 1.1b.
            </p>
        </div>
    );
}

// ── Preview ──────────────────────────────────────────────────────────────────

/**
 * Email = the exact HTML a send would produce (same renderer), in a sandboxed
 * iframe so its inline styles can't leak into the admin page. Web = the
 * /newsletter/<slug> copy (no segment block). Text = the plain-text part.
 */
function PreviewPane({ preview }: { preview: IssuePreview }) {
    const [view, setView] = useState<'email' | 'web' | 'text'>('email');
    const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
    return (
        <div className="space-y-3">
            {preview.warnings.length > 0 && (
                <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-[var(--brand-foreground)]">
                    <p className="flex items-center gap-2 font-semibold">
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" aria-hidden /> Check before sending
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-[var(--brand-muted)]">
                        {preview.warnings.map((w) => (
                            <li key={w}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Preview">
                {(['email', 'web', 'text'] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        role="tab"
                        aria-selected={view === v}
                        onClick={() => setView(v)}
                        className={`px-3 min-h-[36px] text-sm border border-[var(--surface-border)] ${view === v ? 'bg-[var(--brand-primary)] text-[var(--brand-black)] font-semibold' : 'bg-[var(--surface)] text-[var(--brand-foreground)]'}`}
                    >
                        {v === 'email' ? 'Email' : v === 'web' ? 'Web page' : 'Plain text'}
                    </button>
                ))}
                {view === 'email' && (
                    <select
                        aria-label="Preview width"
                        value={width}
                        onChange={(e) => setWidth(e.target.value as 'desktop' | 'phone')}
                        className="ml-2 min-h-[36px] text-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-2"
                    >
                        <option value="desktop">Desktop width</option>
                        <option value="phone">Phone width (375 px)</option>
                    </select>
                )}
            </div>
            <p className="text-xs text-[var(--brand-muted)]">
                Inbox line: <strong className="text-[var(--brand-foreground)]">{preview.subject}</strong>
                {preview.preheader ? ` — ${preview.preheader}` : ''}
            </p>
            {view === 'email' && (
                <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={preview.email_html}
                    className="block h-[720px] border border-[var(--surface-border)] bg-white"
                    style={{ width: width === 'phone' ? 375 : '100%' }}
                />
            )}
            {view === 'web' && (
                <div
                    className="prose prose-sm dark:prose-invert max-w-3xl border border-[var(--surface-border)] p-6"
                    // Backend renders markdown with raw HTML disabled.
                    dangerouslySetInnerHTML={{ __html: preview.web_html }}
                />
            )}
            {view === 'text' && (
                <pre className="whitespace-pre-wrap text-xs border border-[var(--surface-border)] p-4 text-[var(--brand-foreground)]">
                    {preview.email_text}
                </pre>
            )}
        </div>
    );
}
