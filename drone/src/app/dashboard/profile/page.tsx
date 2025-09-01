'use client';

import { useAuth } from '@/app/lib/auth-context';
import LoadingComponent from '@/app/ui/components/loading';
import LoginComponent from '@/app/ui/components/login';
import ProfileComponent from '@/app/ui/components/profile';

export default function ProfilePage() {
    const { user, isLoading } = useAuth();

    // The AuthProvider now handles the initial loading of the user session.
    if (isLoading) {
        return <LoadingComponent />;
    }

    // If there's no user after loading, show the login component.
    if (!user) {
        return <LoginComponent />;
    }

    // Once the user is loaded, display their profile.
    return <ProfileComponent user={user} />;
}
