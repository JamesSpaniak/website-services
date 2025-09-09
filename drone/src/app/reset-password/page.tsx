'use client';

import { useSearchParams } from 'next/navigation';
import ResetPasswordFormComponent from '../ui/components/reset-password-form';
import ErrorComponent from '../ui/components/error';

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <ErrorComponent message="Invalid or missing password reset token." />
            </div>
        );
    }

    return <ResetPasswordFormComponent token={token} />;
}