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

    return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 lg:py-24 px-4">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Create Account</h2>

                {inviteLoading && (
                    <div className="mb-4 text-center text-sm text-gray-500">Verifying invite code...</div>
                )}

                {inviteInfo && (
                    <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-800">
                            <BuildingOfficeIcon className="h-5 w-5" />
                            <span className="font-semibold">{inviteInfo.organization_name}</span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                            You&apos;re joining as {inviteInfo.role === 'manager' ? 'a course manager' : 'a student'}.
                        </p>
                    </div>
                )}

                {inviteError && (
                    <div className="mb-4">
                        <ErrorComponent message={inviteError} />
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            You can still <Link href="/login" className="text-blue-600 hover:underline">sign up without an invite code</Link>.
                        </p>
                    </div>
                )}

                {error && <div className="mb-4"><ErrorComponent message={error} /></div>}

                {infoMessage && (
                    <div className="mb-4 p-4 rounded-md bg-green-100 border border-green-300 text-green-700 text-sm">
                        {infoMessage}
                        <p className="mt-2">
                            <Link href="/login" className="font-medium text-green-800 hover:underline">Go to Login</Link>
                        </p>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
                        className={`w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm focus:outline-none focus:ring-2 ${validationErrors?.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                        required />
                    {validationErrors?.email && <p className="text-xs text-red-500 mt-1">{validationErrors.email._errors[0]}</p>}
                </div>

                <div className="flex gap-4 mb-4">
                    <div className="w-1/2">
                        <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="firstName">First Name</label>
                        <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange}
                            className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="w-1/2">
                        <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="lastName">Last Name</label>
                        <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange}
                            className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="username">Username</label>
                    <input id="username" name="username" type="text" value={formData.username} onChange={handleChange}
                        className={`w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm focus:outline-none focus:ring-2 ${validationErrors?.username ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                        required />
                    {validationErrors?.username && <p className="text-xs text-red-500 mt-1">{validationErrors.username._errors[0]}</p>}
                </div>

                <div className="mb-6">
                    <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                    <input id="password" name="password" type="password" value={formData.password} onChange={handleChange}
                        className={`w-full px-3 py-2 mb-3 text-sm leading-tight text-gray-700 border rounded shadow-sm focus:outline-none focus:ring-2 ${validationErrors?.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                        required />
                    {validationErrors?.password && <p className="text-xs text-red-500 mt-1">{validationErrors.password._errors[0]}</p>}
                </div>

                <button type="submit" disabled={loading || !!inviteError}
                    className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-blue-300">
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="text-center mt-4">
                    <Link href="/login" className="text-sm text-blue-600 hover:underline">
                        Already have an account? Login
                    </Link>
                </div>
            </form>
        </div>
    );
}
