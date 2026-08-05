'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import ManagerGuard from '@/app/ui/components/manager-guard';
import PageShell from '@/app/ui/components/page-shell';
import DashboardTabs, { DashboardTab } from '@/app/ui/components/dashboard-tabs';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { getOrganizationDetails } from '@/app/lib/api-client';
import type { Organization } from '@/app/lib/types/organization';
import {
    UserGroupIcon,
    EnvelopeIcon,
    AcademicCapIcon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/solid';

const MANAGER_TABS: DashboardTab[] = [
    { href: '/manager/members', label: 'Members', icon: UserGroupIcon },
    { href: '/manager/invites', label: 'Invites', icon: EnvelopeIcon },
    { href: '/manager/progress', label: 'Course Progress', icon: AcademicCapIcon },
    { href: '/manager/exams', label: 'Class Exams', icon: ClipboardDocumentListIcon },
];

type ManagerOrgValue = {
    org: Organization;
    /** Re-fetch org details (seat counts in the header) after membership changes. */
    refreshOrg: () => Promise<void>;
};

const ManagerOrgContext = createContext<ManagerOrgValue | null>(null);

export function useManagerOrg(): ManagerOrgValue {
    const ctx = useContext(ManagerOrgContext);
    if (!ctx) throw new Error('useManagerOrg must be used within the manager dashboard shell');
    return ctx;
}

export default function ManagerShell({ children }: { children: React.ReactNode }) {
    return (
        <ManagerGuard>
            <ManagerShellInner>{children}</ManagerShellInner>
        </ManagerGuard>
    );
}

function ManagerShellInner({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const orgId = user?.organization?.id;

    const refreshOrg = useCallback(async () => {
        if (!orgId) {
            setLoading(false);
            return;
        }
        try {
            const data = await getOrganizationDetails(orgId);
            setOrg(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load organization');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { refreshOrg(); }, [refreshOrg]);

    if (loading) return <LoadingComponent />;
    if (!org) return <ErrorComponent message={error || 'Organization not found.'} />;

    const subtitle = `${org.member_count} of ${org.max_students} student seats used${
        org.manager_count > 0 ? ` · ${org.manager_count} manager${org.manager_count > 1 ? 's' : ''}` : ''
    }`;

    return (
        <PageShell title={org.name} subtitle={subtitle} maxWidthClass="max-w-7xl">
            <DashboardTabs tabs={MANAGER_TABS} />
            <ManagerOrgContext.Provider value={{ org, refreshOrg }}>
                {children}
            </ManagerOrgContext.Provider>
        </PageShell>
    );
}
