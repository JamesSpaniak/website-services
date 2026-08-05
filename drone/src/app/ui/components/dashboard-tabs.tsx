'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';

export type DashboardTab = {
    href: string;
    label: string;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

/**
 * Shared link-based tab bar for the admin and manager dashboards.
 * Tabs are real routes, so the browser back button, refresh, and deep links
 * all work, and the bar stays visible on nested pages (e.g. course editing).
 */
export default function DashboardTabs({ tabs }: { tabs: DashboardTab[] }) {
    const pathname = usePathname();

    return (
        <div className="mb-6 border-b border-[var(--surface-border)]">
            <nav className="-mb-px flex gap-6 flex-wrap">
                {tabs.map((t) => {
                    const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
                    return (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                                active
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}
                        >
                            {t.icon && <t.icon className="h-4 w-4" />}
                            {t.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
