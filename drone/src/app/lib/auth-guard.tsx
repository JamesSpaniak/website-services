'use client';

import { useAuth } from './auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingComponent from '../ui/components/loading';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the initial authentication check is complete and there is no user,
    // redirect to the login page.
    if (!isLoading && !user) {
      // Using `replace` prevents the user from navigating "back" to the protected page.
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // While the authentication status is being checked, show a loading screen.
  if (isLoading) {
    return <LoadingComponent />;
  }

  // If a user is found, render the protected page content.
  if (user) {
    return <>{children}</>;
  }

  // If there's no user, the redirect is in progress. Show a loading screen to prevent content flicker.
  return <LoadingComponent />;
}
