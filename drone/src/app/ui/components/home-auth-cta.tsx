'use client';

import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';

/** Home hero CTA: Sign in vs Profile when session exists */
export default function HomeAuthCta() {
  const { user, isLoading } = useAuth();

  const label = user ? 'Profile' : 'Sign in';
  const href = user ? '/profile' : '/login';

  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-5 text-[var(--brand-subtle)] font-medium text-sm tracking-wide hover:text-[var(--brand-foreground)] transition-colors ring-focus touch-manipulation"
      style={{ borderRadius: 'var(--radius-sm)' }}
      aria-busy={isLoading}
    >
      {isLoading ? '…' : label}
    </Link>
  );
}
