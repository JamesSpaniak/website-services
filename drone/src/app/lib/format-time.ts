/** Relative "3d ago"-style label; '—' when never. */
export function relativeTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return '—';
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Colour by recency — green ≤7d, amber ≤14d, red beyond (matches the "stalled" definition). */
export function recencyTone(iso: string | null | undefined): string {
    if (!iso) return 'text-[var(--brand-muted)]';
    const days = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (days <= 7) return 'text-emerald-600';
    if (days <= 14) return 'text-amber-600';
    return 'text-red-600';
}

/** Cents (number or bigint-as-string from Postgres) → "$1,234.56". */
export function formatCents(value: string | number | null | undefined, opts: { compact?: boolean } = {}): string {
    const cents = Number(value ?? 0);
    if (!Number.isFinite(cents)) return '$0';
    const dollars = cents / 100;
    if (opts.compact && Math.abs(dollars) >= 10000) {
        return `$${(dollars / 1000).toFixed(1)}k`;
    }
    return dollars.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: dollars % 1 === 0 ? 0 : 2 });
}

export function formatPct(value: number | string | null | undefined, digits = 0): string {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
}

export function formatNumber(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : '—';
}
