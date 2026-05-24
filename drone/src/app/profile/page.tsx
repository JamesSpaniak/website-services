'use client';

import ProfileComponent from '@/app/ui/components/profile';
import AuthGuard from '../lib/auth-guard';
import PageShell from '../ui/components/page-shell';

/**
 * This is the page export, which wraps the ProfileComponent with our AuthGuard
 * to ensure only logged-in users can see it.
 */
export default function ProfilePage() {
    return (
        <AuthGuard>
            <PageShell
                title="Profile"
                subtitle="Your account, courses, activity, and settings."
                maxWidthClass="max-w-4xl"
            >
                <ProfileComponent />
            </PageShell>
        </AuthGuard>
    );
}
