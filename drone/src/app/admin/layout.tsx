import { Metadata } from 'next';
import AdminGuard from '@/app/ui/components/admin-guard';
import PageShell from '@/app/ui/components/page-shell';
import AdminTabs from './tabs';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <PageShell
        title="Admin Dashboard"
        subtitle="Manage articles, courses, questions, organizations, and analytics."
        maxWidthClass="max-w-7xl"
      >
        <AdminTabs />
        {children}
      </PageShell>
    </AdminGuard>
  );
}
