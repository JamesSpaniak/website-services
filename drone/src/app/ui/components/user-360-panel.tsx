'use client';

import { useEffect, useState } from 'react';
import { getReportingUser360 } from '@/app/lib/api-client';
import type { User360 } from '@/app/lib/types/analytics';
import { formatCents, formatPct, relativeTime } from '@/app/lib/format-time';
import { XMarkIcon } from '@heroicons/react/24/solid';

const str = (v: unknown): string => (v === null || v === undefined ? '—' : String(v));

/**
 * Admin "user 360": entitlements, per-course usage, revenue, orders and the
 * recent event stream for one learner (GET /reporting/users/:id).
 * Render inline (admin users row) or as a drawer (analytics signals).
 */
export default function User360Panel({ userId, onClose, compact = false }: { userId: number; onClose?: () => void; compact?: boolean }) {
    const [data, setData] = useState<User360 | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setData(null);
        getReportingUser360(userId)
            .then((d) => !cancelled && setData(d))
            .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'));
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const body = error ? (
        <p className="text-sm text-red-600">{error}</p>
    ) : !data ? (
        <p className="text-sm text-[var(--brand-muted)]">Loading…</p>
    ) : (
        <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[var(--brand-muted)]">
                <span>
                    <strong className="text-[var(--brand-foreground)]">{data.user.username}</strong> · {data.user.email}
                </span>
                <span>role {String(data.user.role)}</span>
                {data.user.organization_name != null && <span>org {str(data.user.organization_name)}</span>}
                {data.user.pro_membership_expires_at != null && (
                    <span>Pro until {new Date(String(data.user.pro_membership_expires_at)).toLocaleDateString()}</span>
                )}
                <span>
                    {data.logins.logins_30d} logins (30d) · last {relativeTime(data.logins.last_login)}
                </span>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Mini label="Net revenue" value={formatCents(data.revenue?.net_cents as string)} />
                <Mini label="Contribution" value={formatCents(data.revenue?.contribution_cents as string)} />
                <Mini label="Orders" value={str(data.revenue?.orders_count ?? data.orders.length)} />
                <Mini label="Active MRR" value={formatCents(data.revenue?.active_mrr_cents as string)} />
            </div>

            <div className={`grid gap-5 ${compact ? '' : 'lg:grid-cols-2'}`}>
                <div>
                    <h5 className="text-xs font-semibold uppercase text-[var(--brand-muted)] mb-2">Entitlements</h5>
                    {data.entitlements.length === 0 ? (
                        <p className="text-[var(--brand-muted)]">None.</p>
                    ) : (
                        <ul className="space-y-1">
                            {data.entitlements.map((e, i) => (
                                <li key={i} className="flex flex-wrap gap-2 items-baseline">
                                    <span className="text-[var(--brand-foreground)]">{str(e.course_title ?? (e.course_id == null ? 'Pro (all courses)' : `Course ${e.course_id}`))}</span>
                                    <span className="text-xs text-[var(--brand-muted)]">{str(e.source)}</span>
                                    <span className="text-xs text-[var(--brand-muted)]">from {new Date(String(e.starts_at)).toLocaleDateString()}</span>
                                    {e.revoked_at != null && <span className="text-xs text-red-600">revoked {str(e.revoke_reason)}</span>}
                                    {e.ends_at != null && e.revoked_at == null && (
                                        <span className="text-xs text-[var(--brand-muted)]">ends {new Date(String(e.ends_at)).toLocaleDateString()}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <h5 className="text-xs font-semibold uppercase text-[var(--brand-muted)] mb-2">Course usage</h5>
                    {data.usage.length === 0 ? (
                        <p className="text-[var(--brand-muted)]">No course activity.</p>
                    ) : (
                        <ul className="space-y-1">
                            {data.usage.map((u, i) => (
                                <li key={i} className="flex flex-wrap gap-2 items-baseline">
                                    <span className="text-[var(--brand-foreground)]">{str(u.course_title)}</span>
                                    <span className="text-xs text-[var(--brand-muted)]">{formatPct(u.pct_complete as number)} · {str(u.minutes_engaged)} min</span>
                                    <span className="text-xs text-[var(--brand-muted)]">
                                        {str(u.videos_completed)}/{str(u.videos_total)} videos · best {u.best_score == null ? '—' : `${str(u.best_score)}%`}
                                    </span>
                                    <span className="text-xs text-[var(--brand-muted)]">last {relativeTime(u.last_activity_at as string)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {data.orders.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold uppercase text-[var(--brand-muted)] mb-2">Orders</h5>
                    <ul className="space-y-1">
                        {data.orders.map((o, i) => (
                            <li key={i} className="flex flex-wrap gap-2 items-baseline">
                                <span className="text-xs text-[var(--brand-muted)]">{new Date(String(o.placed_at)).toLocaleDateString()}</span>
                                <span className="text-[var(--brand-foreground)]">{formatCents(o.total_cents as string)}</span>
                                <span className="text-xs text-[var(--brand-muted)]">{str(o.payment_method)} · {str(o.payment_status)}</span>
                                {Number(o.refunded_cents) > 0 && <span className="text-xs text-red-600">refunded {formatCents(o.refunded_cents as string)}</span>}
                                <span className="text-xs text-[var(--brand-muted)]">
                                    {Array.isArray(o.items) ? (o.items as { sku: string; quantity: number }[]).map((it) => `${it.sku}×${it.quantity}`).join(', ') : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <h5 className="text-xs font-semibold uppercase text-[var(--brand-muted)] mb-2">Recent events</h5>
                {data.events.length === 0 ? (
                    <p className="text-[var(--brand-muted)]">No events.</p>
                ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {data.events.map((ev, i) => (
                            <div key={i} className="flex gap-3 text-xs">
                                <span className="text-[var(--brand-muted)] w-32 shrink-0">
                                    {new Date(ev.occurred_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <span className="text-[var(--brand-foreground)]">{ev.event_name.replace(/_/g, ' ')}</span>
                                <span className="text-[var(--brand-muted)] truncate">
                                    {[ev.course_title, ev.unit_ref].filter(Boolean).join(' · ')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (!onClose) return body;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
            <button aria-label="Close" className="flex-1 bg-black/30" onClick={onClose} />
            <div className="w-full max-w-2xl h-full overflow-y-auto bg-[var(--background)] p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-[var(--brand-foreground)]">User 360</h4>
                    <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-border)] text-[var(--brand-muted)]">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                {body}
            </div>
        </div>
    );
}

function Mini({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[var(--surface)] rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--brand-muted)]">{label}</div>
            <div className="text-base font-semibold tabular-nums text-[var(--brand-foreground)]">{value}</div>
        </div>
    );
}
