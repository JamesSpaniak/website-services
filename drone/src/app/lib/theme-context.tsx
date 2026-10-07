'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'drone-theme-preference';

/**
 * Runs in <head> before first paint (layout.tsx) so a saved Day / System choice
 * applies without a dark flash. Mirrors getStoredPreference + resolveEffectiveTheme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='light'&&p!=='dark'&&p!=='system')return;var t=p==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;var d=document.documentElement;d.dataset.theme=t;d.dataset.themePreference=p;}catch(e){}})();`;

/** The user's saved choice, or null when they never picked one. */
function getStoredPreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function resolveEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  if (preference === 'light') return 'light';
  return 'dark';
}

type ThemeContextValue = {
  /** User choice: light, dark, or follow OS */
  preference: ThemePreference;
  /** Resolved UI theme after applying system preference */
  resolved: 'light' | 'dark';
  /** True once the user has picked a theme on this browser (vs the Night default) */
  explicit: boolean;
  /** True after the stored preference has been read on the client */
  ready: boolean;
  /** Local only — use `useChooseTheme` (theme-sync) for user-initiated changes so the profile is saved. */
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');
  const [explicit, setExplicit] = useState(false);
  const [mounted, setMounted] = useState(false);

  const applyDom = useCallback((pref: ThemePreference) => {
    const effective = resolveEffectiveTheme(pref);
    setResolved(effective);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = effective;
      document.documentElement.dataset.themePreference = pref;
    }
  }, []);

  useEffect(() => {
    const stored = getStoredPreference();
    setPreferenceState(stored ?? 'dark');
    setExplicit(stored !== null);
    applyDom(stored ?? 'dark');
    setMounted(true);
  }, [applyDom]);

  useEffect(() => {
    if (!mounted || preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyDom('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mounted, preference, applyDom]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPreferenceState(p);
      setExplicit(true);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, p);
      } catch {
        /* ignore */
      }
      applyDom(p);
    },
    [applyDom],
  );

  const value = useMemo(
    () => ({ preference, resolved, explicit, ready: mounted, setPreference }),
    [preference, resolved, explicit, mounted, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
