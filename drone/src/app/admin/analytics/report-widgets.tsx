'use client';

import type { ReactNode } from 'react';

/** Small shared building blocks for the admin reporting tabs. */

export function Stat({
    label,
    value,
    sub,
    tone = 'neutral',
    title,
}: {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: 'neutral' | 'ok' | 'warn' | 'bad';
    title?: string;
}) {
    const valueTone =
        tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-600' : tone === 'ok' ? 'text-emerald-700' : 'text-[var(--brand-foreground)]';
    return (
        <div className="bg-[var(--surface)] rounded-xl shadow-sm p-4" title={title}>
            <div className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">{label}</div>
            <div className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</div>
            {sub && <div className="text-xs text-[var(--brand-muted)] mt-0.5">{sub}</div>}
        </div>
    );
}

export function Panel({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="bg-[var(--surface)] rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-[var(--surface-border)]">
                <h3 className="text-sm font-semibold text-[var(--brand-foreground)]">{title}</h3>
                {action}
            </div>
            <div>{children}</div>
        </section>
    );
}

export interface Column<T> {
    key: string;
    label: string;
    align?: 'left' | 'right';
    className?: string;
    render: (row: T) => ReactNode;
}

export function DataTable<T>({
    rows,
    columns,
    rowKey,
    empty = 'No data.',
    onRowClick,
}: {
    rows: T[];
    columns: Column<T>[];
    rowKey: (row: T, i: number) => string | number;
    empty?: string;
    onRowClick?: (row: T) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--surface-border)] text-sm">
                <thead className="bg-[var(--comment-secondary-bg)] text-xs uppercase text-[var(--brand-muted)]">
                    <tr>
                        {columns.map((c) => (
                            <th
                                key={c.key}
                                className={`px-4 py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.className ?? ''}`}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-6 text-center text-[var(--brand-muted)]">
                                {empty}
                            </td>
                        </tr>
                    )}
                    {rows.map((r, i) => (
                        <tr
                            key={rowKey(r, i)}
                            className={onRowClick ? 'cursor-pointer hover:bg-[var(--comment-secondary-bg)]' : ''}
                            onClick={onRowClick ? () => onRowClick(r) : undefined}
                        >
                            {columns.map((c) => (
                                <td
                                    key={c.key}
                                    className={`px-4 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${c.className ?? ''}`}
                                >
                                    {c.render(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Minimal bar series; values normalised to the max. */
export function Bars({
    data,
    height = 96,
    color = 'var(--brand-primary)',
    label,
}: {
    data: { key: string; value: number; title?: string }[];
    height?: number;
    color?: string;
    label: string;
}) {
    const max = Math.max(1, ...data.map((d) => d.value));
    if (data.length === 0) return <p className="text-sm text-[var(--brand-muted)] px-4 py-6">No data.</p>;
    return (
        <div className="flex items-end gap-[2px] px-4 py-3" style={{ height }} role="img" aria-label={label}>
            {data.map((d) => (
                <div
                    key={d.key}
                    className="flex-1 rounded-t opacity-80 hover:opacity-100"
                    style={{ height: `${Math.max(2, (100 * d.value) / max)}%`, backgroundColor: color }}
                    title={d.title ?? `${d.key}: ${d.value}`}
                />
            ))}
        </div>
    );
}

export function SourceBadge({ source }: { source: string }) {
    const tone: Record<string, string> = {
        purchase: 'bg-emerald-500/15 text-emerald-700',
        bundle: 'bg-emerald-500/15 text-emerald-700',
        pro: 'bg-indigo-500/15 text-indigo-700',
        org_seat: 'bg-sky-500/15 text-sky-700',
        signup_link: 'bg-amber-500/15 text-amber-700',
        admin_grant: 'bg-slate-500/15 text-slate-700',
        trial: 'bg-amber-500/15 text-amber-700',
        free: 'bg-slate-500/15 text-slate-700',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone[source] ?? 'bg-slate-500/15 text-slate-700'}`}>
            {source.replace('_', ' ')}
        </span>
    );
}

export function monthLabel(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}
