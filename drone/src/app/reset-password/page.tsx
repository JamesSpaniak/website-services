'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageShell from '../ui/components/page-shell';
import ResetPasswordFormComponent from '../ui/components/reset-password-form';
import ErrorComponent from '../ui/components/error';
import LoadingComponent from '../ui/components/loading';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <PageShell title="Reset password" subtitle="This link is not valid." maxWidthClass="max-w-lg">
        <ErrorComponent message="Invalid or missing password reset token." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Reset password" subtitle="Choose a new password for your account." maxWidthClass="max-w-lg">
      <ResetPasswordFormComponent token={token} />
    </PageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
