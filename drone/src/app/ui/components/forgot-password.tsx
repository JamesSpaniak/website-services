'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, forgotPassword } from '@/app/lib/api-client';
import ErrorComponent from './error';

/** Matches the backend's one-link-per-60-s cooldown per email address. */
const RESEND_COOLDOWN_SECONDS = 60;

function errorMessage(err: unknown): string {
    if (err instanceof ApiError && err.status === 429) {
        // Per-email limits explain themselves; the per-IP one is a busy network.
        return err.message && !err.message.startsWith('ThrottlerException')
            ? err.message
            : 'Too many requests from your network. Wait a minute and try again.';
    }
    if (err instanceof ApiError && err.status === 400) {
        return 'Enter the email address on your account.';
    }
    return 'We couldn’t send the reset link. Check your connection and try again.';
}

export default function ForgotPasswordComponent() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const send = async () => {
        setLoading(true);
        setError(null);
        try {
            await forgotPassword(email);
            setSubmitted(true);
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            setError(errorMessage(err));
            if (err instanceof ApiError && err.retryAfterSeconds) {
                setCooldown(err.retryAfterSeconds);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void send();
    };

    const teacherHint = (
        <p className="mt-4 text-sm text-[var(--brand-muted)] leading-relaxed">
            School email can take a while or land in quarantine. In class? Ask your teacher for a{' '}
            <Link href="/reset-code" className="text-[var(--brand-primary)] underline underline-offset-2">
                reset code
            </Link>
            .
        </p>
    );

    if (submitted) {
        return (
            <div className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-xl w-full max-w-md mx-auto text-center">
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)] mb-3">Check your email</h2>
                <p className="text-[var(--brand-muted)] leading-relaxed">
                    If an account uses <strong className="text-[var(--brand-foreground)]">{email}</strong>, a reset link is on its
                    way. It works once and expires in 60 minutes. Check your spam folder too.
                </p>
                {error && <div className="mt-4 text-left"><ErrorComponent message={error} /></div>}
                <button
                    type="button"
                    onClick={() => void send()}
                    disabled={loading || cooldown > 0}
                    className="mt-6 w-full px-4 py-2 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] rounded-lg hover:bg-[var(--background)] disabled:opacity-50"
                >
                    {loading ? 'Sending...' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Send again'}
                </button>
                {teacherHint}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-xl w-full max-w-md mx-auto">
            {error && <div className="mb-4"><ErrorComponent message={error} /></div>}
            <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="email">
                    Enter your account email
                </label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm leading-tight border rounded shadow-sm appearance-none bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" required />
            </div>
            <div className="flex items-center justify-center">
                <button type="submit" disabled={loading || cooldown > 0} className="w-full px-4 py-2 font-bold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 focus:outline-none focus:shadow-outline disabled:opacity-40">
                    {loading ? 'Sending...' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Send Reset Link'}
                </button>
            </div>
            {teacherHint}
        </form>
    );
}
