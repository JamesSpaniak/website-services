import type { ReactNode } from 'react';

/** Pricing renders on the light (educator) palette — buyers are mostly teachers and parents. */
export default function PricingLayout({ children }: { children: ReactNode }) {
  return (
    <div data-edu-theme="true" className="min-h-screen">
      {children}
    </div>
  );
}
