'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/lib/auth-context';
import { resendVerificationEmail } from '@/app/lib/api-client';

const DISMISS_KEY = 'verifyEmailBannerDismissed';

export default function VerifyEmailBanner() {
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem(DISMISS_KEY) === '1';
    });
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    if (!user || user.email_verified || dismissed) return null;

    const handleDismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
    };

    const handleResend = async () => {
        setStatus('sending');
        setError(null);
        try {
            await resendVerificationEmail();
            setStatus('sent');
        } catch (e) {
            setStatus('error');
            setError(e instanceof Error ? e.message : 'Could not send verification email.');
        }
    };

    return (
        <div
            role="status"
            className="border-b border-amber-500/30 bg-amber-500/10 text-[var(--brand-foreground)]"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                <p className="flex-1">
                    <span className="font-medium">Verify your email to purchase</span>
                    {' — '}
                    check your inbox or{' '}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={status === 'sending'}
                        className="font-semibold text-[var(--brand-primary)] underline hover:opacity-80 disabled:opacity-50"
                    >
                        {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Link sent!' : 'resend link'}
                    </button>
                </p>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="self-end sm:self-center p-1 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
                    aria-label="Dismiss verification reminder"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
