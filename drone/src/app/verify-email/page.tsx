'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '@/app/lib/api-client';
import PageShell from '@/app/ui/components/page-shell';
import { loginHref, readStashedPostAuthRedirect } from '@/app/lib/auth-redirect';
import LoadingComponent from '@/app/ui/components/loading';

type Status = 'idle' | 'loading' | 'success' | 'error';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const redirect = readStashedPostAuthRedirect();
  const loginLink = loginHref(redirect ?? '/courses');

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
          <Link href={loginLink} className="text-[var(--brand-primary)] hover:underline">
            {redirect ? 'Sign in to continue' : 'Go to sign in'}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
