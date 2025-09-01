'use client';

import { useState } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import ErrorComponent from './error';

export default function LoginComponent() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(username, password);
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen -mt-32">
            <form onSubmit={handleLogin} className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Login to View Profile</h2>
                {error && <div className="mb-4"><ErrorComponent message={error} /></div>}
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-bold text-gray-700" htmlFor="username">
                        Username
                    </label>
                    <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-6">
                    <label className="block mb-2 text-sm font-bold text-gray-700" htmlFor="password">
                        Password
                    </label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 mb-3 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="flex items-center justify-center">
                    <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:bg-blue-300">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </div>
            </form>
        </div>
    );
}

