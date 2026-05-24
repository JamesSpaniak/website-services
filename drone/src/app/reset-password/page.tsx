'use client';

import { useSearchParams } from 'next/navigation';
import PageShell from '../ui/components/page-shell';
import ResetPasswordFormComponent from '../ui/components/reset-password-form';
import ErrorComponent from '../ui/components/error';

export default function ResetPasswordPage() {
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
