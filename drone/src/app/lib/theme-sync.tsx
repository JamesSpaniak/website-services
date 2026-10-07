'use client';

import { useCallback, useEffect } from 'react';
import { updateThemePreference } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import { logger } from '@/app/lib/logger';
import { useTheme, type ThemePreference } from '@/app/lib/theme-context';

/**
 * One global theme preference: localStorage is the per-browser cache (read
 * before paint), the profile (`users.theme_preference`) follows the user
 * across devices. Use this for every user-initiated theme change.
 */
export function useChooseTheme() {
  const { setPreference } = useTheme();
  const { user, setUser } = useAuth();

  return useCallback(
    (p: ThemePreference) => {
      setPreference(p);
      if (!user) return;
      updateThemePreference(p)
        .then(() => setUser((u) => (u ? { ...u, theme_preference: p } : u)))
        .catch((err) =>
          logger.warn('Could not save theme preference', { error: String(err) }),
        );
    },
    [setPreference, user, setUser],
  );
}

/**
 * On sign-in: a theme saved on the profile wins; otherwise a choice already
 * made on this browser is saved to the profile. Mounted once in layout.tsx.
 */
export function ThemeProfileSync() {
  const { preference, explicit, ready, setPreference } = useTheme();
  const { user, setUser } = useAuth();
  const userId = user?.id;
  const saved = user?.theme_preference ?? null;

  useEffect(() => {
    if (!ready || userId == null) return;
    if (saved) {
      if (saved !== preference) setPreference(saved);
      return;
    }
    if (!explicit) return;
    updateThemePreference(preference)
      .then(() => setUser((u) => (u ? { ...u, theme_preference: preference } : u)))
      .catch((err) =>
        logger.warn('Could not save theme preference', { error: String(err) }),
      );
    // Only react to sign-in / profile changes — local changes save via useChooseTheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, saved]);

  return null;
}
