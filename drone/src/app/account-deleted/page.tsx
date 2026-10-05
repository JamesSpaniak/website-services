import { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '../ui/components/page-shell';

export const metadata: Metadata = {
  title: 'Account deleted',
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <PageShell title="Your account has been deleted" maxWidthClass="max-w-2xl">
      <div className="space-y-4 text-[var(--brand-muted)] leading-relaxed">
        <p>
          Your profile, course progress, exam history, comments and course access have been removed, and you have been
          signed out. Any Pro membership was cancelled. We keep payment records only as long as tax and dispute rules
          require.
        </p>
        <p>
          Questions? Email{' '}
          <a href="mailto:james@thedroneedge.com" className="text-[var(--brand-primary)] hover:underline">
            james@thedroneedge.com
          </a>
          .
        </p>
        <p>
          <Link href="/" className="text-[var(--brand-primary)] hover:underline">
            Back to the home page
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
