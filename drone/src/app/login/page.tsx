'use client';

import LoginComponent from '../ui/components/login';
import LoginConversionPanel from '../ui/components/login-conversion-panel';
import { useAuth } from '../lib/auth-context';
import {
    stashPostAuthRedirect,
    sanitizeRedirect,
    readStashedPostAuthRedirect,
    clearStashedPostAuthRedirect,
} from '../lib/auth-redirect';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import LoadingComponent from '../ui/components/loading';

function LoginPageInner() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = sanitizeRedirect(searchParams.get('redirect'));

    useEffect(() => {
        if (redirect) stashPostAuthRedirect(redirect);
    }, [redirect]);

    useEffect(() => {
        if (!isLoading && user) {
            const target = redirect ?? readStashedPostAuthRedirect() ?? '/profile';
            clearStashedPostAuthRedirect();
            router.replace(target);
        }
    }, [user, isLoading, router, redirect]);

    if (isLoading || user) {
        return <LoadingComponent />;
    }

    return (
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <LoginComponent redirectPath={redirect ?? undefined} />
                <LoginConversionPanel redirect={redirect ?? undefined} />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingComponent />}>
            <LoginPageInner />
        </Suspense>
    );
}
