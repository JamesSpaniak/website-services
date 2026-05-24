'use client';

import LoginComponent from '../ui/components/login';
import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingComponent from '../ui/components/loading';
import PageShell from '../ui/components/page-shell';

export default function LoginPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/profile');
        }
    }, [user, isLoading, router]);

    if (isLoading || user) {
        return <LoadingComponent />;
    }

    return (
        <PageShell maxWidthClass="max-w-lg">
            <LoginComponent />
        </PageShell>
    );
}