'use client';

import { useState } from 'react';
import { forgotPassword } from '@/app/lib/api-client';

export default function ForgotPasswordComponent() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await forgotPassword(email);
        setLoading(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-xl w-full max-w-md mx-auto text-center">
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)] mb-3">Request sent</h2>
                <p className="text-[var(--brand-muted)] leading-relaxed">
                    If an account with that email address exists, you will receive a password reset link shortly.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="email">
                    Enter your account email
                </label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm leading-tight border rounded shadow-sm appearance-none bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" required />
            </div>
            <div className="flex items-center justify-center">
                <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 focus:outline-none focus:shadow-outline disabled:opacity-40">
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </div>
        </form>
    );
}
