import Link from 'next/link';
import type { Metadata } from 'next';
import PageShell from '@/app/ui/components/page-shell';

export const metadata: Metadata = {
  title: 'Video & Photography — Coming Soon',
  description: 'Aerial cinematography and DaVinci Resolve editing track — coming soon to Drone Edge.',
};

export default function VideoTrackPage() {
  return (
    <PageShell title="Video & Photography" subtitle="Creative track — coming soon." maxWidthClass="max-w-2xl">
      <p className="text-[var(--brand-muted)] leading-relaxed">
        We are building a full production pipeline course: camera settings, cinematic flight patterns,
        and professional editing in DaVinci Resolve. Join the FAA Part 107 course today while this track is in development.
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
