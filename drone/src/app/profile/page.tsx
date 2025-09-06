'use client';

import ProfileComponent from '@/app/ui/components/profile';
import AuthGuard from '../lib/auth-guard';

/**
 * This is the page export, which wraps the ProfileComponent with our AuthGuard
 * to ensure only logged-in users can see it.
 */
export default function ProfilePage() {
    return (
        <AuthGuard>
            <ProfileComponent />
        </AuthGuard>
    );
}
