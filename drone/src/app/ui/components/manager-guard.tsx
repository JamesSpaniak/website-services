'use client';

import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingComponent from './loading';

interface ManagerGuardProps {
    children: React.ReactNode;
}

export default function ManagerGuard({ children }: ManagerGuardProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            const isManager = user?.organization?.role === 'manager';
            const isAdmin = user?.role === 'admin';
            if (!user || (!isManager && !isAdmin)) {
                router.replace('/');
            }
        }
    }, [isLoading, user, router]);

    if (isLoading) return <LoadingComponent />;

    const isManager = user?.organization?.role === 'manager';
    const isAdmin = user?.role === 'admin';
    if (isManager || isAdmin) return <>{children}</>;

    return <LoadingComponent />;
}
