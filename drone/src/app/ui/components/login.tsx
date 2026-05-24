'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import ErrorComponent from './error';
import { createUser } from '@/app/lib/api-client';
import { z } from 'zod';

type AuthMode = 'login' | 'signup';

// Define validation schemas using Zod
const loginSchema = z.object({
    username: z.string().min(1, "Username is required."),
    password: z.string().min(1, "Password is required."),
});

const signupSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    username: z.string().min(3, { message: "Username must be at least 3 characters long." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
});

export default function LoginComponent() {
    const { login } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
    });
    const [validationErrors, setValidationErrors] = useState<z.ZodFormattedError<typeof formData> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const validate = (): boolean => {
        const schema = mode === 'login' ? loginSchema : signupSchema;
        const result = schema.safeParse(formData);

        if (!result.success) {
            setValidationErrors(result.error.format());
            return false;
        }

        setValidationErrors(null);
        return true;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError(null);
        setInfoMessage(null);
        try {
            await login(formData.username, formData.password);
            // On success, the AuthProvider will update the state and this component will be unmounted.
        } catch (err) {
            if (err instanceof Error) {
                setError(`Login failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during login.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError(null);
        setInfoMessage(null);
        try {
            await createUser({ 
                username: formData.username, 
                password: formData.password, 
                email: formData.email, 
                first_name: formData.firstName, 
                last_name: formData.lastName 
            });
            setInfoMessage('Registration successful. Please verify your email before logging in.');
        } catch (err) {
            if (err instanceof Error) {
                setError(`Sign-up failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during sign-up.');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setError(null);
        setInfoMessage(null);
        setValidationErrors(null);
        setMode(mode === 'login' ? 'signup' : 'login');
    };

    const inputClass = (hasErr: boolean) =>
        `w-full px-3 py-2 text-sm bg-[var(--surface)] border text-[var(--brand-foreground)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${hasErr ? 'border-red-400' : 'border-[var(--surface-border)]'}`;

    return (
        <div className="relative z-10 flex flex-col items-center justify-center py-12 sm:py-16 lg:py-24 px-4">
            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="p-6 sm:p-8 border border-[var(--surface-border)] bg-[var(--surface)] w-full max-w-md" style={{ borderRadius: 'var(--radius-md)' }}>
                <h2 className="text-xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] text-center mb-6">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
                {error && <div className="mb-4"><ErrorComponent message={error} /></div>}
                {infoMessage && (
                    <div className="mb-4 p-3 text-sm text-[var(--brand-primary)] border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10" style={{ borderRadius: 'var(--radius-sm)' }}>
                        {infoMessage}
                    </div>
                )}

                {mode === 'signup' && (
                    <>
                        <div className="mb-4">
                            <label className="block mb-1.5 text-xs font-medium tracking-wide text-[var(--brand-muted)]" htmlFor="email">Email</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass(!!validationErrors?.email)} style={{ borderRadius: 'var(--radius-sm)' }} required />
                            {validationErrors?.email && <p className="text-xs text-red-400 mt-1">{validationErrors.email._errors[0]}</p>}
                        </div>
                        <div className="flex gap-4 mb-4">
                            <div className="w-1/2">
                                <label className="block mb-1.5 text-xs font-medium tracking-wide text-[var(--brand-muted)]" htmlFor="firstName">First name</label>
                                <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} className={inputClass(false)} style={{ borderRadius: 'var(--radius-sm)' }} />
                            </div>
                            <div className="w-1/2">
                                <label className="block mb-1.5 text-xs font-medium tracking-wide text-[var(--brand-muted)]" htmlFor="lastName">Last name</label>
                                <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} className={inputClass(false)} style={{ borderRadius: 'var(--radius-sm)' }} />
                            </div>
                        </div>
                    </>
                )}

                <div className="mb-4">
                    <label className="block mb-1.5 text-xs font-medium tracking-wide text-[var(--brand-muted)]" htmlFor="username">Username</label>
                    <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} className={inputClass(!!validationErrors?.username)} style={{ borderRadius: 'var(--radius-sm)' }} required />
                    {validationErrors?.username && <p className="text-xs text-red-400 mt-1">{validationErrors.username._errors[0]}</p>}
                </div>
                <div className="mb-6">
                    <div className="flex justify-between items-baseline">
                        <label className="block mb-1.5 text-xs font-medium tracking-wide text-[var(--brand-muted)]" htmlFor="password">Password</label>
                        {mode === 'login' && (
                            <Link href="/forgot-password" className="text-xs text-[var(--brand-primary)] hover:opacity-90">
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className={inputClass(!!validationErrors?.password)} style={{ borderRadius: 'var(--radius-sm)' }} required />
                    {validationErrors?.password && <p className="text-xs text-red-400 mt-1">{validationErrors.password._errors[0]}</p>}
                </div>
                <button type="submit" disabled={loading} className="w-full py-2.5 font-medium text-sm tracking-wide bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 disabled:opacity-50 transition-opacity ring-focus" style={{ borderRadius: 'var(--radius-sm)' }}>
                    {loading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Sign up')}
                </button>
                <button type="button" onClick={toggleMode} className="w-full mt-4 text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)] transition-colors">
                    {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                </button>
            </form>
        </div>
    );
}
