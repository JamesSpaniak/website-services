'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import { createUser, getInviteCodeInfo } from '@/app/lib/api-client';
import ErrorComponent from '@/app/ui/components/error';
import LoadingComponent from '@/app/ui/components/loading';
import type { InviteCodeInfo } from '@/app/lib/types/organization';
import { z } from 'zod';
import { BuildingOfficeIcon } from '@heroicons/react/24/solid';
import PageShell from '../ui/components/page-shell';

const signupSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    username: z.string().min(3, { message: 'Username must be at least 3 characters long.' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
});

export default function RegisterPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('code');

    const [inviteInfo, setInviteInfo] = useState<InviteCodeInfo | null>(null);
    const [inviteLoading, setInviteLoading] = useState(!!inviteCode);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
    });
    const [validationErrors, setValidationErrors] = useState<z.ZodFormattedError<typeof formData> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/profile');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!inviteCode) return;
        setInviteLoading(true);
        getInviteCodeInfo(inviteCode)
            .then((info) => {
                if (info) {
                    setInviteInfo(info);
                } else {
                    setInviteError('This invite code is invalid, expired, or has already been used.');
                }
            })
            .catch(() => {
                setInviteError('Failed to verify invite code.');
            })
            .finally(() => setInviteLoading(false));
    }, [inviteCode]);

    if (authLoading || user) return <LoadingComponent />;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
            setValidationErrors(result.error.format());
            return;
        }
        setValidationErrors(null);
        setLoading(true);
        setError(null);
        setInfoMessage(null);

        try {
            await createUser({
                username: formData.username,
                password: formData.password,
                email: formData.email,
                first_name: formData.firstName || undefined,
                last_name: formData.lastName || undefined,
                invite_code: inviteCode || undefined,
            });
            setInfoMessage('Registration successful! Please verify your email before logging in.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const field =
        'w-full px-3 py-2 text-sm leading-tight border rounded shadow-sm bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]';
    const fieldErr = 'border-red-500 focus:ring-red-500';

    return (
        <PageShell
            title="Create account"
            subtitle="Join to access courses and track your progress."
            maxWidthClass="max-w-lg"
        >
            <form
                onSubmit={handleSubmit}
                className="p-6 sm:p-8 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] shadow-xl w-full"
            >
                {inviteLoading && (
                    <div className="mb-4 text-center text-sm text-[var(--brand-muted)]">Verifying invite code...</div>
                )}

                {inviteInfo && (
                    <div className="mb-6 p-4 rounded-lg bg-[var(--comment-secondary-bg)] border border-[var(--surface-border)]">
                        <div className="flex items-center gap-2 text-[var(--brand-foreground)]">
                            <BuildingOfficeIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                            <span className="font-semibold">{inviteInfo.organization_name}</span>
                        </div>
                        <p className="text-sm text-[var(--brand-muted)] mt-1">
                            You&apos;re joining as {inviteInfo.role === 'manager' ? 'a course manager' : 'a student'}.
                        </p>
                    </div>
                )}

                {inviteError && (
                    <div className="mb-4">
                        <ErrorComponent message={inviteError} />
                        <p className="text-sm text-[var(--brand-muted)] mt-2 text-center">
                            You can still{' '}
                            <Link href="/login" className="text-[var(--brand-primary)] hover:underline">
                                sign up without an invite code
                            </Link>
                            .
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-4">
                        <ErrorComponent message={error} />
                    </div>
                )}

                {infoMessage && (
                    <div className="mb-4 p-4 rounded-md border border-[var(--surface-border)] bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] text-sm">
                        {infoMessage}
                        <p className="mt-2">
                            <Link href="/login" className="font-medium text-[var(--brand-primary)] hover:underline">
                                Go to Login
                            </Link>
                        </p>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`${field} ${validationErrors?.email ? fieldErr : ''}`}
                        required
                    />
                    {validationErrors?.email && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.email._errors[0]}</p>
                    )}
                </div>

                <div className="flex gap-4 mb-4">
                    <div className="w-1/2">
                        <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="firstName">
                            First Name
                        </label>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                            className={field}
                        />
                    </div>
                    <div className="w-1/2">
                        <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="lastName">
                            Last Name
                        </label>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                            className={field}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="username">
                        Username
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleChange}
                        className={`${field} ${validationErrors?.username ? fieldErr : ''}`}
                        required
                    />
                    {validationErrors?.username && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.username._errors[0]}</p>
                    )}
                </div>

                <div className="mb-6">
                    <label className="block mb-2 text-sm font-medium text-[var(--brand-foreground)]" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`${field} mb-0 ${validationErrors?.password ? fieldErr : ''}`}
                        required
                    />
                    {validationErrors?.password && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.password._errors[0]}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !!inviteError}
                    className="w-full px-4 py-2 font-bold rounded-lg bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-40"
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="text-center mt-4">
                    <Link href="/login" className="text-sm text-[var(--brand-primary)] hover:underline">
                        Already have an account? Login
                    </Link>
                </div>
            </form>
        </PageShell>
    );
}
