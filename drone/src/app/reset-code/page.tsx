import type { Metadata } from 'next';
import PageShell from '../ui/components/page-shell';
import ResetCodeForm from '../ui/components/reset-code-form';

export const metadata: Metadata = {
  title: 'Reset with a teacher code',
  robots: { index: false, follow: false },
};

export default function ResetCodePage() {
  return (
    <PageShell
      title="Reset with a teacher code"
      subtitle="Your teacher can give you a one-time code from their Drone Edge roster. It works for an hour."
      maxWidthClass="max-w-lg"
    >
      <ResetCodeForm />
    </PageShell>
  );
}
