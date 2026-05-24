'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '@/app/lib/api-client';
import PageShell from '@/app/ui/components/page-shell';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    let isMounted = true;
    setStatus('loading');
    verifyEmail(token)
      .then((response) => {
        if (!isMounted) return;
        setStatus('success');
        setMessage(response.message || 'Email verified successfully.');
      })
      .catch((error: Error) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.message || 'Email verification failed.');
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const subtitle =
    status === 'success'
      ? 'Your email is verified.'
      : status === 'error'
        ? 'Verification could not be completed.'
        : status === 'loading'
          ? 'Please wait…'
          : 'Confirming your email address.';

  return (
    <PageShell title="Verify email" subtitle={subtitle} maxWidthClass="max-w-lg">
      <div className="p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-sm text-center w-full">
        <p className="text-[var(--brand-muted)]">
          {status === 'loading' && 'Verifying your email…'}
          {status === 'success' && message}
          {status === 'error' && message}
          {status === 'idle' && 'Preparing verification…'}
        </p>
        <div className="mt-6">
          <Link href="/login" className="text-[var(--brand-primary)] hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
