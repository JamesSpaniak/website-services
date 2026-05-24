'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from './analytics';

/**
 * Tracks page views on every client-side route change.
 * Mount once in the root layout (inside a client boundary).
 */
export function usePageAnalytics(): void {
    const pathname = usePathname();
    const prevPath = useRef<string | null>(null);

    useEffect(() => {
        const path = (pathname && String(pathname).trim()) || '/';
        if (path !== prevPath.current) {
            prevPath.current = path;
            trackPageView(path);
        }
    }, [pathname]);
}
