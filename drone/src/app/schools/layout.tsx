import type { ReactNode } from 'react';

export default function SchoolsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-edu-theme="true" className="min-h-screen">
      {children}
    </div>
  );
}
