'use client';

import { useEffect, useRef, useState } from 'react';
import { MoonIcon, SunIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/lib/auth-context';
import { useTheme } from '@/app/lib/theme-context';
import { useChooseTheme } from '@/app/lib/theme-sync';
import { THEME_OPTIONS } from './theme-toggle';

const NUDGE_SEEN_KEY = 'drone-theme-nudge-seen';

/**
 * Floating theme switch for long-read pages (course units, articles).
 * The first visit with no theme chosen opens the panel once as a hint; it is
 * non-modal — close, click away, Esc, or just keep reading.
 */
export default function ReaderThemeControl() {
  const { preference, resolved, explicit, ready } = useTheme();
  const { user, isLoading } = useAuth();
  const chooseTheme = useChooseTheme();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || isLoading || explicit || user?.theme_preference) return;
    try {
      if (localStorage.getItem(NUDGE_SEEN_KEY)) return;
      // Mark on show, not on dismiss — ignoring it still counts as seen.
      localStorage.setItem(NUDGE_SEEN_KEY, '1');
    } catch {
      return; // Storage blocked: skip the hint rather than show it every visit.
    }
    setNudge(true);
    setOpen(true);
  }, [ready, isLoading, explicit, user?.theme_preference]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  if (!ready) return null;

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 print:hidden"
    >
      {open && (
        <div
          role="dialog"
          aria-label="Reading theme"
          className="w-64 border border-[var(--surface-border)] bg-[var(--surface)] p-4 shadow-lg"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-[var(--brand-foreground)]">Reading theme</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-m-2 p-2 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] ring-focus"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {nudge && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--brand-muted)]">
              Prefer a lighter page for long reads? Your choice is saved{' '}
              {user ? 'to your profile' : 'on this device'} — change it here anytime.
            </p>
          )}
          <div role="group" aria-label="Color theme" className="mt-3 grid grid-cols-3 gap-1">
            {THEME_OPTIONS.map((o) => {
              const active = preference === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    chooseTheme(o.value);
                    if (nudge) setOpen(false);
                    setNudge(false);
                  }}
                  className={`min-h-[44px] text-xs font-medium tracking-wide ring-focus touch-manipulation ${
                    active
                      ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]'
                      : 'border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface-border)]'
                  }`}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setNudge(false);
        }}
        aria-expanded={open}
        aria-label="Reading theme"
        title="Reading theme"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--brand-foreground)] shadow-md hover:border-[var(--brand-primary)] ring-focus touch-manipulation"
      >
        {resolved === 'light' ? (
          <SunIcon className="h-5 w-5" aria-hidden />
        ) : (
          <MoonIcon className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
