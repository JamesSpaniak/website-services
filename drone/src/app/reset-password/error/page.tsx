'use client';

import Link from 'next/link';

export default function ResetPasswordErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen -mt-32">
            <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Link Expired or Invalid</h2>
                <p className="text-gray-600 mb-6">
                    The password reset link you used is either invalid or has expired. Please request a new one.
                </p>
                <Link href="/forgot-password" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:shadow-outline">
                    Request a New Link
                </Link>
            </div>
        </div>
    );
}