'use client';

import { useTheme, type ThemePreference } from '@/app/lib/theme-context';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Night' },
  { value: 'light', label: 'Day' },
  { value: 'system', label: 'System' },
];

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--brand-foreground)]">
      <span className="sr-only">Color theme</span>
      <select
        value={preference}
        onChange={(e) => setPreference(e.target.value as ThemePreference)}
        className="max-w-[7.5rem] min-h-[44px] rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-[var(--brand-foreground)] text-sm sm:text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        aria-label="Color theme: Night, Day, or match system"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
