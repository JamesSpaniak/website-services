'use client';

import LoginComponent from '../ui/components/login';
import { useAuth } from '../lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import LoadingComponent from '../ui/components/loading';
import PageShell from '../ui/components/page-shell';

function LoginPageInner() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');

    useEffect(() => {
        if (!isLoading && user) {
            router.replace(redirect && redirect.startsWith('/') ? redirect : '/profile');
        }
    }, [user, isLoading, router, redirect]);

    if (isLoading || user) {
        return <LoadingComponent />;
    }

    return (
        <PageShell maxWidthClass="max-w-lg">
            <LoginComponent redirectPath={redirect ?? undefined} />
        </PageShell>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingComponent />}>
            <LoginPageInner />
        </Suspense>
    );
}
