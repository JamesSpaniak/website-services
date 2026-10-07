'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ApiError, resetPasswordWithCode } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import { clearStashedPostAuthRedirect, readStashedPostAuthRedirect } from '@/app/lib/auth-redirect';
import ErrorComponent from './error';

const schema = z
    .object({
        username: z.string().trim().min(1, 'Enter your username or email.'),
        code: z.string().trim().min(8, 'Enter the 8-character code from your teacher.'),
        password: z.string().min(8, 'Password must be at least 8 characters long.'),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

type FormData = z.infer<typeof schema>;

function errorMessage(err: unknown): string {
    if (err instanceof ApiError && err.status === 429) {
        return 'Too many attempts from your network. Wait a minute and try again.';
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Something went wrong. Try again.';
}

/**
 * Student side of the teacher reset code (TODO "Shared-IP + bot hardening" E):
 * username + code from the manager roster + new password, then signs straight in.
 */
export default function ResetCodeForm() {
    const { login } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState<FormData>({ username: '', code: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<z.ZodFormattedError<FormData> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const parsed = schema.safeParse(form);
        if (!parsed.success) {
            setErrors(parsed.error.format());
            return;
        }
        setErrors(null);
        setLoading(true);
        try {
            const { username } = await resetPasswordWithCode({
                username: parsed.data.username,
                code: parsed.data.code,
                password: parsed.data.password,
            });
            await login(username, parsed.data.password);
            const target = readStashedPostAuthRedirect() ?? '/profile';
            clearStashedPostAuthRedirect();
            router.replace(target);
        } catch (err) {
            setError(errorMessage(err));
            setLoading(false);
        }
    };

    const field =
        'w-full px-3 py-2 text-sm leading-tight border rounded shadow-sm appearance-none bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]';
    const label = 'block mb-2 text-sm font-medium text-[var(--brand-foreground)]';
    const fieldError = (key: keyof FormData) =>
        errors?.[key] && <p className="text-xs text-red-500 mt-1">{errors[key]?._errors[0]}</p>;

    return (
        <form onSubmit={handleSubmit} className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-xl w-full max-w-md mx-auto">
            {error && <div className="mb-4"><ErrorComponent message={error} /></div>}
            <div className="mb-4">
                <label className={label} htmlFor="username">Username or email</label>
                <input id="username" name="username" type="text" autoComplete="username" value={form.username} onChange={handleChange} className={field} required />
                {fieldError('username')}
            </div>
            <div className="mb-4">
                <label className={label} htmlFor="code">Reset code from your teacher</label>
                <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="ABCD-EFGH"
                    value={form.code}
                    onChange={handleChange}
                    className={`${field} font-mono tracking-widest uppercase`}
                    required
                />
                {fieldError('code')}
            </div>
            <div className="mb-4">
                <label className={label} htmlFor="password">New password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} className={field} required />
                {fieldError('password')}
            </div>
            <div className="mb-6">
                <label className={label} htmlFor="confirmPassword">Confirm new password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} className={field} required />
                {fieldError('confirmPassword')}
            </div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-40">
                {loading ? 'Resetting...' : 'Set new password and sign in'}
            </button>
            <p className="mt-4 text-sm text-[var(--brand-muted)]">
                No code? <Link href="/forgot-password" className="text-[var(--brand-primary)] underline underline-offset-2">Reset by email</Link> instead.
            </p>
        </form>
    );
}
