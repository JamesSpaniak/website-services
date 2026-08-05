'use client';

import {
    NewspaperIcon,
    AcademicCapIcon,
    ClipboardDocumentListIcon,
    BuildingOfficeIcon,
    ChartBarIcon,
} from '@heroicons/react/24/solid';
import DashboardTabs, { DashboardTab } from '@/app/ui/components/dashboard-tabs';

const ADMIN_TABS: DashboardTab[] = [
    { href: '/admin/articles', label: 'Articles', icon: NewspaperIcon },
    { href: '/admin/courses', label: 'Courses', icon: AcademicCapIcon },
    { href: '/admin/questions', label: 'Question Bank', icon: ClipboardDocumentListIcon },
    { href: '/admin/organizations', label: 'Organizations', icon: BuildingOfficeIcon },
    { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
];

export default function AdminTabs() {
    return <DashboardTabs tabs={ADMIN_TABS} />;
}
