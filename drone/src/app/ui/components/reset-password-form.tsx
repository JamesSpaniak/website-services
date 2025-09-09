'use client';

import { useState } from 'react';
import { z } from 'zod';
import { resetPassword } from '@/app/lib/api-client';
import { useRouter } from 'next/navigation';

const passwordSchema = z.object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // path of error
});

interface ResetPasswordFormProps {
    token: string;
}

export default function ResetPasswordFormComponent({ token }: ResetPasswordFormProps) {
    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<z.ZodFormattedError<typeof formData> | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiMessage, setApiMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiMessage(null);

        const result = passwordSchema.safeParse(formData);
        if (!result.success) {
            setErrors(result.error.format());
            return;
        }

        setErrors(null);
        setLoading(true);

        try {
            const response = await resetPassword({ token, password: formData.password });
            setApiMessage({ text: response.message, type: 'success' });
            // Redirect to login after a short delay
            setTimeout(() => router.push('/login'), 2000);
        } catch (err) {
            // Check if the error message indicates an unauthorized error, which we get for invalid/expired tokens.
            if (err instanceof Error && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
                router.replace('/reset-password/error');
            } else {
                const message = err instanceof Error ? err.message : 'An unknown error occurred.';
                setApiMessage({ text: `Failed to reset password: ${message}`, type: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen -mt-32">
            <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Reset Your Password</h2>
                
                {apiMessage ? (
                    <div className={`p-3 rounded-md text-white text-center ${apiMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {apiMessage.text}
                        {apiMessage.type === 'success' && <p className="text-sm">Redirecting to login...</p>}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">New Password</label>
                            <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className={`w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 ${errors?.password ? 'border-red-500' : 'focus:ring-blue-500'}`} required />
                            {errors?.password && <p className="text-xs text-red-500 mt-1">{errors.password._errors[0]}</p>}
                        </div>
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="confirmPassword">Confirm New Password</label>
                            <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className={`w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:ring-2 ${errors?.confirmPassword ? 'border-red-500' : 'focus:ring-blue-500'}`} required />
                            {errors?.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword._errors[0]}</p>}
                        </div>
                        <div className="flex items-center justify-center">
                            <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:bg-gray-400">
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}