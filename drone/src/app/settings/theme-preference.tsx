'use client';

import ThemeToggle from '@/app/ui/components/theme-toggle';

export default function ThemePreferenceSettings() {
  return (
    <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6">
      <h2 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
        Appearance
      </h2>
      <p className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed">
        Choose how the site looks. <strong className="font-medium text-[var(--brand-foreground)]">Night</strong> and{' '}
        <strong className="font-medium text-[var(--brand-foreground)]">Day</strong> fix the theme;{' '}
        <strong className="font-medium text-[var(--brand-foreground)]">System</strong> follows your device (e.g. macOS / Windows light or dark
        mode).
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-[var(--brand-foreground)]">Color theme</span>
        <ThemeToggle />
      </div>
    </section>
  );
}
