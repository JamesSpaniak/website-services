import type { ReactNode } from 'react';

/** Checkout matches pricing's light (educator) palette. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div data-edu-theme="true" className="min-h-screen">
      {children}
    </div>
  );
}
