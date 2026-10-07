'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { getPricingOverview, setProductLookupKey, syncPricing } from '@/app/lib/api-client';
import type { AdminPriceRow, AdminPricingOverview, AdminPromotionRow } from '@/app/lib/types/pricing-admin';
import { formatCents } from '@/app/lib/pricing';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';

// Stripe owns prices and discounts; this page shows what the site reads from it
// (docs/tech/pricing-and-promotions.md § 7). Codes are created in Stripe.

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');
const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'never');

const badge = {
    ok: 'bg-emerald-500/15 text-emerald-600',
    warn: 'bg-amber-500/15 text-amber-600',
    bad: 'bg-red-500/15 text-red-600',
    info: 'bg-sky-500/15 text-sky-600',
    off: 'bg-zinc-500/15 text-zinc-500',
} as const;

function Badge({ tone, children }: { tone: keyof typeof badge; children: React.ReactNode }) {
    return (
        <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge[tone]}`}>
            {children}
        </span>
    );
}

const th = 'px-4 py-3 whitespace-nowrap';
const td = 'px-4 py-3 align-top';

export default function AdminPricingPage() {
    const [data, setData] = useState<AdminPricingOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setData(await getPricingOverview());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load pricing');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        setError(null);
        try {
            setData(await syncPricing());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <LoadingComponent />;
    if (!data) return <ErrorComponent message={error ?? 'Failed to load pricing'} />;

    return (
        <div className="space-y-10">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Pricing &amp; promos</h2>
                    <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        Prices and discounts live in Stripe. Change them there, then press <strong>Sync now</strong> — the
                        site also re-reads Stripe every few minutes. Don&apos;t edit a linked course&apos;s price in the
                        course editor; the next sync overwrites it.
                    </p>
                    <p className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge tone={data.mode === 'live' ? 'ok' : 'info'}>Stripe {data.mode}</Badge>
                        {data.managed_payments && <Badge tone="info">Managed Payments on</Badge>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href={data.stripe_dashboard_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-md border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)]"
                    >
                        Stripe coupons <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-md bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 disabled:opacity-40"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing…' : 'Sync now'}
                    </button>
                </div>
            </header>

            {error && <ErrorComponent message={error} />}

            <PricesPanel prices={data.prices} onChange={setData} onError={setError} />
            <SalePanel sale={data.sale} />
            <PromotionsPanel data={data} />

            <section>
                <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Giveaways</h2>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    Free access with no payment uses signup links — one-time, or multi-use for events.{' '}
                    {data.signup_links.active} active, {data.signup_links.redemptions} redemptions so far.{' '}
                    <Link href="/admin/users" className="text-[var(--brand-primary)] hover:underline">
                        Manage signup links
                    </Link>
                </p>
            </section>
        </div>
    );
}

// ── Prices ──────────────────────────────────────────────────────────────────

function PricesPanel({
    prices,
    onChange,
    onError,
}: {
    prices: AdminPriceRow[];
    onChange: (d: AdminPricingOverview) => void;
    onError: (msg: string | null) => void;
}) {
    return (
        <section>
            <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Prices</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--brand-muted)]">
                A product with a lookup key uses that Stripe price. Without one, a course is charged from its price on the
                site (inline) and Pro uses the price id in the server config.
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--brand-muted)] border-b border-[var(--surface-border)] bg-[var(--surface)]">
                            <th className={th}>Product</th>
                            <th className={th}>Source</th>
                            <th className={th}>Stripe lookup key</th>
                            <th className={th}>Stripe price</th>
                            <th className={th}>Site price</th>
                            <th className={th}>Status</th>
                            <th className={th}>Last synced</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prices.map((row) => (
                            <PriceRow key={row.sku} row={row} onChange={onChange} onError={onError} />
                        ))}
                        {prices.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-[var(--brand-muted)]">
                                    No priced products.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function PriceRow({
    row,
    onChange,
    onError,
}: {
    row: AdminPriceRow;
    onChange: (d: AdminPricingOverview) => void;
    onError: (msg: string | null) => void;
}) {
    const [key, setKey] = useState(row.stripe_lookup_key ?? '');
    const [saving, setSaving] = useState(false);
    const dirty = key.trim() !== (row.stripe_lookup_key ?? '');

    const save = async () => {
        setSaving(true);
        onError(null);
        try {
            onChange(await setProductLookupKey(row.sku, key.trim() || null));
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Could not save the lookup key');
        } finally {
            setSaving(false);
        }
    };

    const status = row.problem ? (
        <Badge tone="bad">Problem</Badge>
    ) : row.source === 'inline' ? (
        <Badge tone="warn">Inline price</Badge>
    ) : row.in_sync ? (
        <Badge tone="ok">In sync</Badge>
    ) : (
        <Badge tone="warn">Drift</Badge>
    );

    return (
        <tr className="border-b border-[var(--surface-border)]">
            <td className={td}>
                <div className="font-medium text-[var(--brand-foreground)]">{row.name}</div>
                <div className="font-mono text-xs text-[var(--brand-muted)]">{row.sku}</div>
            </td>
            <td className={`${td} text-[var(--brand-muted)]`}>
                {row.source === 'stripe' ? 'Stripe (lookup key)' : row.source === 'env' ? 'Stripe (config id)' : 'Inline'}
            </td>
            <td className={td}>
                <div className="flex items-center gap-2">
                    <input
                        id={`lookup-${row.sku}`}
                        aria-label={`Stripe lookup key for ${row.name}`}
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="e.g. part107_course"
                        className="w-44 px-2 py-1 font-mono text-xs rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
                    />
                    {dirty && (
                        <button
                            onClick={save}
                            disabled={saving}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 disabled:opacity-40"
                        >
                            {saving ? 'Saving…' : key.trim() ? 'Link' : 'Unlink'}
                        </button>
                    )}
                </div>
            </td>
            <td className={td}>
                {row.stripe_amount_cents != null ? (
                    <div>
                        <span className="font-mono">{formatCents(row.stripe_amount_cents)}</span>
                        {row.dashboard_url && (
                            <a
                                href={row.dashboard_url}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-xs text-[var(--brand-primary)] hover:underline"
                            >
                                open
                            </a>
                        )}
                        <div className="font-mono text-[11px] text-[var(--brand-muted)]">{row.stripe_price_id}</div>
                    </div>
                ) : (
                    <span className="text-[var(--brand-muted)]">—</span>
                )}
            </td>
            <td className={`${td} font-mono`}>{formatCents(row.site_amount_cents)}</td>
            <td className={td}>
                {status}
                {row.problem && <p className="mt-1 max-w-xs text-xs text-red-600">{row.problem}</p>}
            </td>
            <td className={`${td} text-xs text-[var(--brand-muted)]`}>{fmtDateTime(row.price_synced_at)}</td>
        </tr>
    );
}

// ── Site sale ───────────────────────────────────────────────────────────────

function SalePanel({ sale }: { sale: AdminPromotionRow | null }) {
    return (
        <section>
            <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Site sale</h2>
            {sale ? (
                <div className="mt-3 p-4 rounded-lg border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5">
                    <p className="text-sm text-[var(--brand-foreground)]">
                        <span className="font-mono font-semibold">{sale.code}</span> — {sale.label}
                        {sale.applies_to.length ? ` on ${sale.applies_to.join(', ')}` : ' on every product'}
                        {sale.expires_at ? `, ends ${fmtDate(sale.expires_at)}` : ', no end date'}.
                    </p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                        Applied automatically at checkout and shown as a crossed-out price across the site. A buyer&apos;s
                        own code wins if it saves more. During a sale, Stripe&apos;s page does not accept a typed code —
                        share other codes as <span className="font-mono">?promo=CODE</span> links.
                    </p>
                </div>
            ) : (
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    No sale running. To start one, create a promotion code in Stripe with an expiry date and metadata{' '}
                    <span className="font-mono">site_sale = true</span>, then press Sync now. Steps:{' '}
                    <span className="font-mono">workflows/sales/pricing-and-promos.md</span>.
                </p>
            )}
        </section>
    );
}

// ── Promotion codes ─────────────────────────────────────────────────────────

function PromotionsPanel({ data }: { data: AdminPricingOverview }) {
    const [showInactive, setShowInactive] = useState(false);
    const rows = data.promotions.filter((p) => showInactive || p.active);
    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Promotion codes</h2>
                <label className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
                    <input
                        id="promo-show-inactive"
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    Show inactive
                </label>
            </div>
            <p className="mt-1 mb-4 text-sm text-[var(--brand-muted)]">
                Created and edited in Stripe. &quot;Checkouts&quot; and revenue count completed checkouts on this site;
                Stripe&apos;s own redemption count is shown next to the limit. Full price:{' '}
                {data.full_price.checkouts} checkouts, {formatCents(data.full_price.revenue_cents)}.
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--brand-muted)] border-b border-[var(--surface-border)] bg-[var(--surface)]">
                            <th className={th}>Code</th>
                            <th className={th}>Discount</th>
                            <th className={th}>Applies to</th>
                            <th className={th}>Rules</th>
                            <th className={th}>Ends</th>
                            <th className={th}>Redeemed</th>
                            <th className={`${th} text-right`}>Checkouts</th>
                            <th className={`${th} text-right`}>Discount given</th>
                            <th className={`${th} text-right`}>Revenue</th>
                            <th className={`${th} text-right`}>Refunds</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((p) => (
                            <tr key={p.id} className="border-b border-[var(--surface-border)]">
                                <td className={td}>
                                    <a
                                        href={p.dashboard_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono font-semibold text-[var(--brand-primary)] hover:underline"
                                    >
                                        {p.code}
                                    </a>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {p.site_sale && <Badge tone="info">Site sale</Badge>}
                                        {!p.active && <Badge tone="off">Inactive</Badge>}
                                    </div>
                                </td>
                                <td className={td}>
                                    {p.label}
                                    {p.duration !== 'once' && (
                                        <div className="text-xs text-[var(--brand-muted)]">
                                            {p.duration === 'repeating' ? `${p.duration_in_months} months` : 'forever'} (Pro)
                                        </div>
                                    )}
                                </td>
                                <td className={`${td} font-mono text-xs`}>{p.applies_to.length ? p.applies_to.join(', ') : 'All'}</td>
                                <td className={`${td} text-xs text-[var(--brand-muted)]`}>
                                    {[
                                        p.first_time_only && 'First purchase only',
                                        p.minimum_amount_cents && `Min ${formatCents(p.minimum_amount_cents)}`,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                </td>
                                <td className={`${td} text-xs text-[var(--brand-muted)]`}>{fmtDate(p.expires_at)}</td>
                                <td className={`${td} font-mono text-xs`}>
                                    {p.times_redeemed}
                                    {p.max_redemptions != null ? ` / ${p.max_redemptions}` : ''}
                                </td>
                                <td className={`${td} text-right font-mono`}>{p.stats.checkouts}</td>
                                <td className={`${td} text-right font-mono`}>{formatCents(p.stats.discount_cents)}</td>
                                <td className={`${td} text-right font-mono`}>{formatCents(p.stats.revenue_cents)}</td>
                                <td className={`${td} text-right font-mono`}>
                                    {p.stats.refunds ? `${p.stats.refunds} · ${formatCents(p.stats.refunded_cents)}` : '—'}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-[var(--brand-muted)]">
                                    No {showInactive ? '' : 'active '}promotion codes in Stripe.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
