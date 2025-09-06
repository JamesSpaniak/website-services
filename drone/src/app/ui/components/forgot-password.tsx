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
            <div className="flex flex-col items-center justify-center min-h-screen -mt-32">
                <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Request Sent</h2>
                    <p className="text-gray-600">If an account with that email address exists, you will receive a password reset link shortly.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen -mt-32">
            <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Forgot Password</h2>
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="email">
                        Enter your account email
                    </label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="flex items-center justify-center">
                    <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:bg-blue-300">
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </div>
            </form>
        </div>
    );
}