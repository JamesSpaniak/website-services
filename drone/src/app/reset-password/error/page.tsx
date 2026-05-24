import Link from 'next/link';
import PageShell from '@/app/ui/components/page-shell';

export default function ResetPasswordErrorPage() {
  return (
    <PageShell title="Link expired" subtitle="Password reset links are single-use and time-limited." maxWidthClass="max-w-lg">
      <div className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-xl w-full text-center">
        <p className="text-[var(--brand-muted)] mb-6">
          The password reset link you used is either invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block w-full px-4 py-2 font-bold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 focus:outline-none focus:shadow-outline"
        >
          Request a new link
        </Link>
      </div>
    </PageShell>
  );
}
