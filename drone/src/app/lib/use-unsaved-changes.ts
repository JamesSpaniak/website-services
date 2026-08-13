'use client';

import { useEffect } from 'react';

export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave without saving?';

/**
 * Warn before losing unsaved editor changes.
 *
 * - `beforeunload` covers refresh, tab close, and external navigation.
 * - The App Router has no route-change event to block, so internal navigation
 *   (dashboard tab bar, header links) is intercepted via a capture-phase click
 *   listener on `<a>` elements with a confirm() prompt.
 *
 * Programmatic navigation (router.push) is not intercepted — callers should
 * confirm explicitly (e.g. on a Cancel button) using UNSAVED_CHANGES_MESSAGE.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
    useEffect(() => {
        if (!dirty) return;

        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        const onClickCapture = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0) return;
            // Modified clicks open a new tab and don't lose editor state.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            const url = new URL(anchor.href, window.location.href);
            // External links trigger a full unload, which beforeunload already covers.
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;
            if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener('beforeunload', onBeforeUnload);
        document.addEventListener('click', onClickCapture, true);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            document.removeEventListener('click', onClickCapture, true);
        };
    }, [dirty]);
}
