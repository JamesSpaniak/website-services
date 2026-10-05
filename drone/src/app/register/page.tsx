'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import { createLead, createUser, getInviteCodeInfo, getSignupLinkInfo } from '@/app/lib/api-client';
import { leadAttributionFields } from '@/app/lib/attribution';
import { track } from '@/app/lib/analytics';
import ErrorComponent from '@/app/ui/components/error';
import LoadingComponent from '@/app/ui/components/loading';
import type { InviteCodeInfo } from '@/app/lib/types/organization';
import type { SignupLinkInfo } from '@/app/lib/types/admin-users';
import { z } from 'zod';
import { BuildingOfficeIcon, GiftIcon } from '@heroicons/react/24/solid';
import PageShell from '../ui/components/page-shell';
import {
    redirectIndicatesPurchase,
    sanitizeRedirect,
    stashPostAuthRedirect,
    readStashedPostAuthRedirect,
    clearStashedPostAuthRedirect,
    loginHref,
    FEATURED_COURSE_ID,
} from '@/app/lib/auth-redirect';

const signupSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    username: z.string().min(3, { message: 'Username must be at least 3 characters long.' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
});

export default function RegisterPage() {
    return (
        <Suspense fallback={<LoadingComponent />}>
            <RegisterPageInner />
        </Suspense>
    );
}

function RegisterPageInner() {
    const { user, isLoading: authLoading, login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('code');
    const signupCode = searchParams.get('signup');
    const redirect = sanitizeRedirect(searchParams.get('redirect'));
    const purchaseIntent = redirectIndicatesPurchase(redirect);

    const [inviteInfo, setInviteInfo] = useState<InviteCodeInfo | null>(null);
    const [inviteLoading, setInviteLoading] = useState(!!inviteCode);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const [signupInfo, setSignupInfo] = useState<SignupLinkInfo | null>(null);
    const [signupLoading, setSignupLoading] = useState(!!signupCode);
    const [signupError, setSignupError] = useState<string | null>(null);

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
    /** Field Notes opt-in (NL4). Unchecked by default; never offered on school invites. */
    const [newsletterOptIn, setNewsletterOptIn] = useState(false);
    /** Set while handleSubmit signs the new account in, so it (not the effect below) picks the destination. */
    const autoSigningIn = useRef(false);

    useEffect(() => {
        if (redirect) stashPostAuthRedirect(redirect);
    }, [redirect]);

    // Funnel top (T3 / PA37): once per visit by a signed-out visitor. Stored
    // for anonymous visitors too (first-party anonymous id); signup_completed
    // is recorded server-side.
    const signupStartedSent = useRef(false);
    useEffect(() => {
        if (authLoading || user || signupStartedSent.current) return;
        signupStartedSent.current = true;
        track('signup_started', {
            path: '/register',
            properties: {
                via: inviteCode ? 'org_invite' : signupCode ? 'signup_link' : 'direct',
                purchase_intent: purchaseIntent,
            },
        });
    }, [authLoading, user, inviteCode, signupCode, purchaseIntent]);

    useEffect(() => {
        if (!authLoading && user && !autoSigningIn.current) {
            const target = redirect ?? readStashedPostAuthRedirect() ?? '/profile';
            clearStashedPostAuthRedirect();
            router.replace(target);
        }
    }, [user, authLoading, router, redirect]);

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

    useEffect(() => {
        if (!signupCode) return;
        setSignupLoading(true);
        getSignupLinkInfo(signupCode)
            .then((info) => {
                if (info.valid) {
                    setSignupInfo(info);
                } else {
                    setSignupError(
                        info.reason === 'expired'
                            ? 'This signup link has expired.'
                            : info.reason === 'used'
                              ? 'This signup link has already been used.'
                              : 'This signup link is invalid.',
                    );
                }
            })
            .catch(() => {
                setSignupError('Failed to verify signup link.');
            })
            .finally(() => setSignupLoading(false));
    }, [signupCode]);

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
                // Only send the promo code when it verified as valid — an invalid
                // link shows a warning but doesn't block a normal registration.
                signup_code: signupCode && signupInfo?.valid ? signupCode : undefined,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
            setLoading(false);
            return;
        }

        // One unsubscribe system: the opt-in is a `leads` row like any other form.
        // Best effort — a failure here must not block the new account.
        if (newsletterOptIn && !inviteCode) {
            await createLead({
                ...leadAttributionFields(),
                email: formData.email.trim(),
                interest: 'newsletter',
                website: '',
                source_path: '/register',
            }).catch(() => undefined);
        }

        // Sign straight in — email verification is not required to buy or to
        // start Unit 1, so don't make the user detour through their inbox.
        const target = redirect ?? readStashedPostAuthRedirect() ?? `/courses/${FEATURED_COURSE_ID}`;
        autoSigningIn.current = true;
        try {
            await login(formData.username, formData.password);
            clearStashedPostAuthRedirect();
            router.replace(target);
            return;
        } catch {
            autoSigningIn.current = false;
            setInfoMessage(
                purchaseIntent
                    ? 'Account created! Sign in to continue to checkout. We also sent you an email to confirm your address.'
                    : 'Registration successful! Sign in to start Unit 1. We also sent you an email to confirm your address.',
            );
        } finally {
            setLoading(false);
        }
    };

    const field =
        'w-full px-3 py-2 text-sm leading-tight border rounded shadow-sm bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]';
    const fieldErr = 'border-red-500 focus:ring-red-500';

    return (
        <PageShell
            title={purchaseIntent ? 'Create account to purchase' : 'Create account'}
            subtitle={
                purchaseIntent
                    ? 'Create your account, then go straight to checkout.'
                    : 'Join to access courses and track your progress.'
            }
            maxWidthClass="max-w-lg"
        >
            <form
                onSubmit={handleSubmit}
                className="p-6 sm:p-8 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] shadow-xl w-full"
            >
                {(inviteLoading || signupLoading) && (
                    <div className="mb-4 text-center text-sm text-[var(--brand-muted)]">
                        {inviteLoading ? 'Verifying invite code...' : 'Verifying signup link...'}
                    </div>
                )}

                {signupInfo?.valid && (
                    <div className="mb-6 p-4 rounded-lg bg-[var(--comment-secondary-bg)] border border-[var(--surface-border)]">
                        <div className="flex items-center gap-2 text-[var(--brand-foreground)]">
                            <GiftIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                            <span className="font-semibold">This link includes course access</span>
                        </div>
                        {signupInfo.courses && signupInfo.courses.length > 0 && (
                            <ul className="text-sm text-[var(--brand-muted)] mt-1 list-disc list-inside">
                                {signupInfo.courses.map((c) => (
                                    <li key={c.id}>{c.title}</li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-[var(--brand-muted)] mt-2">
                            {signupInfo.email_locked
                                ? 'This link is reserved for a specific email address — register with the email it was sent to.'
                                : 'Access is applied automatically when you create your account.'}
                        </p>
                    </div>
                )}

                {signupError && (
                    <div className="mb-4">
                        <ErrorComponent message={signupError} />
                        <p className="text-sm text-[var(--brand-muted)] mt-2 text-center">
                            You can still create a regular account below.
                        </p>
                    </div>
                )}

                {inviteInfo && (
                    <div className="mb-6 p-4 rounded-lg bg-[var(--comment-secondary-bg)] border border-[var(--surface-border)]">
                        <div className="flex items-center gap-2 text-[var(--brand-foreground)]">
                            <BuildingOfficeIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                            <span className="font-semibold">
                                {inviteInfo.organization_name}
                                {inviteInfo.class_name ? ` — ${inviteInfo.class_name}` : ''}
                            </span>
                        </div>
                        <p className="text-sm text-[var(--brand-muted)] mt-1">
                            You&apos;re joining as {inviteInfo.role === 'manager' ? 'a course manager' : 'a student'}
                            {inviteInfo.class_name ? ` in ${inviteInfo.class_name}` : ''}.
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
                            <Link
                                href={redirect ? loginHref(redirect) : '/login'}
                                className="font-medium text-[var(--brand-primary)] hover:underline"
                            >
                                Sign in{purchaseIntent ? ' and check out' : ''}
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

                {!inviteCode && (
                    <label className="mb-6 flex items-start gap-2 text-sm text-[var(--brand-muted)] leading-relaxed">
                        <input
                            type="checkbox"
                            checked={newsletterOptIn}
                            onChange={(e) => setNewsletterOptIn(e.target.checked)}
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-primary)]"
                        />
                        <span>
                            Send me <strong className="text-[var(--brand-foreground)]">Field Notes</strong>, the monthly
                            newsletter (adults 18+). Unsubscribe anytime.
                        </span>
                    </label>
                )}

                <button
                    type="submit"
                    disabled={loading || !!inviteError}
                    className="w-full px-4 py-2 font-bold rounded-lg bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-40"
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="text-center mt-4">
                    <Link
                        href={redirect ? loginHref(redirect) : '/login'}
                        className="text-sm text-[var(--brand-primary)] hover:underline"
                    >
                        Already have an account? Sign in
                    </Link>
                </div>
            </form>
        </PageShell>
    );
}
