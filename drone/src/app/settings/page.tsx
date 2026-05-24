import { Metadata } from 'next';
import PageShell from '../ui/components/page-shell';
import ThemePreferenceSettings from './theme-preference';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      subtitle="Account preferences and appearance."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-10">
        <ThemePreferenceSettings />
        <p className="text-sm text-[var(--brand-muted)] leading-relaxed">
          Additional account options will appear here over time.
        </p>
      </div>
    </PageShell>
  );
}