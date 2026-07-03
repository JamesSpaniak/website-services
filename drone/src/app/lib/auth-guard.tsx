'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from './auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import LoadingComponent from '../ui/components/loading';

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthGuardInner({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && !user) {
      const query = searchParams.toString();
      const redirect = `${pathname}${query ? `?${query}` : ''}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [isLoading, user, router, pathname, searchParams]);

  if (isLoading) {
    return <LoadingComponent />;
  }

  if (user) {
    return <>{children}</>;
  }

  return <LoadingComponent />;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}
