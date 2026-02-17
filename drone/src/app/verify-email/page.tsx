'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '@/app/lib/api-client';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full rounded-lg border border-gray-200 p-6 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">Verify Email</h1>
        <p className="mt-3 text-gray-600">
          {status === 'loading' && 'Verifying your email...'}
          {status === 'success' && message}
          {status === 'error' && message}
          {status === 'idle' && 'Preparing verification...'}
        </p>
        <div className="mt-6">
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
