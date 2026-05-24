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

const STORAGE_KEY = 'drone-theme-preference';

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
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
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');
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
    setPreferenceState(stored);
    applyDom(stored);
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
      try {
        localStorage.setItem(STORAGE_KEY, p);
      } catch {
        /* ignore */
      }
      applyDom(p);
    },
    [applyDom],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
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
