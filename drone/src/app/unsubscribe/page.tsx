import type { Metadata } from 'next';
import { Suspense } from 'react';
import PageShell from '@/app/ui/components/page-shell';
import LoadingComponent from '@/app/ui/components/loading';
import UnsubscribeClient from './unsubscribe-client';

export const metadata: Metadata = {
  title: 'Email preferences',
  description: 'Choose which Drone Edge emails you receive, or unsubscribe from all of them.',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <PageShell
      title="Email preferences"
      subtitle="Choose which Drone Edge emails you get. Account emails (password resets, receipts) are not affected."
      maxWidthClass="max-w-lg"
    >
      <Suspense fallback={<LoadingComponent />}>
        <UnsubscribeClient />
      </Suspense>
    </PageShell>
  );
}
