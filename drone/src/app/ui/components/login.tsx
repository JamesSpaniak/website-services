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

    return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 lg:py-24 px-4">
            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="p-6 sm:p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">{mode === 'login' ? 'Login' : 'Create Account'}</h2>
                {error && <div className="mb-4"><ErrorComponent message={error} /></div>} {/* This is for API errors */}
                {infoMessage && (
                    <div className="mb-4 p-4 rounded-md bg-green-100 border border-green-300 text-green-700 text-sm">
                        {infoMessage}
                    </div>
                )}
                
                {mode === 'signup' && (
                    <>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="email">Email</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={`w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 ${validationErrors?.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`} required />
                            {validationErrors?.email && <p className="text-xs text-red-500 mt-1">{validationErrors.email._errors[0]}</p>}
                        </div>
                        <div className="flex gap-4 mb-4">
                            <div className="w-1/2">
                                <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="firstName">First Name</label>
                                <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="w-1/2">
                                <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="lastName">Last Name</label>
                                <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </>
                )}

                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="username">Username</label>
                    <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} className={`w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 ${validationErrors?.username ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`} required />
                    {validationErrors?.username && <p className="text-xs text-red-500 mt-1">{validationErrors.username._errors[0]}</p>}
                </div>
                <div className="mb-6">
                    <div className="flex justify-between items-baseline">
                        <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                        {mode === 'login' && (
                            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                                Forgot Password?
                            </Link>
                        )}
                    </div>
                    <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className={`w-full px-3 py-2 mb-3 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 ${validationErrors?.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`} required />
                    {validationErrors?.password && <p className="text-xs text-red-500 mt-1">{validationErrors.password._errors[0]}</p>}
                </div>
                <div className="flex items-center justify-center">
                    <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:bg-blue-300">
                        {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
                    </button>
                </div>
                <div className="text-center mt-4">
                    <button type="button" onClick={toggleMode} className="text-sm text-blue-600 hover:underline">
                        {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Login'}
                    </button>
                </div>
            </form>
        </div>
    );
}
