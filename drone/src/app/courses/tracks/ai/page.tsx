import Link from 'next/link';
import type { Metadata } from 'next';
import PageShell from '@/app/ui/components/page-shell';

export const metadata: Metadata = {
  title: 'AI & Drones — Coming Soon',
  description: 'STEM track covering Python, computer vision, and autonomous drone navigation — coming soon.',
};

export default function AiTrackPage() {
  return (
    <PageShell title="AI & Drones" subtitle="STEM track — coming soon." maxWidthClass="max-w-2xl">
      <p className="text-[var(--brand-muted)] leading-relaxed">
        This track will cover Python, computer vision, and autonomous navigation using drones as a hands-on
        platform for STEM and CS programs. Start with FAA Part 107 certification while we finish the curriculum.
      </p>
      <Link
        href="/courses"
        className="mt-8 inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        Browse available courses
      </Link>
    </PageShell>
  );
}
