'use client';

import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingComponent from './loading';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  if (isLoading) return <LoadingComponent />;
  if (user?.role === 'admin') return <>{children}</>;
  return <LoadingComponent />;
}
