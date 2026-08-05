import { Metadata } from 'next';
import ManagerShell from './shell';

export const metadata: Metadata = {
  title: 'Manager Dashboard',
  robots: { index: false, follow: false },
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ManagerShell>{children}</ManagerShell>;
}
