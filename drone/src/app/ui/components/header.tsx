'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';
import BrandLogo from '@/app/ui/components/brand-logo';
import { UserIcon, ChevronDownIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import { loginHref, registerHref, sanitizeRedirect } from '@/app/lib/auth-redirect';

const navLinks = [
  { href: '/articles', label: 'Articles' },
  { href: '/courses', label: 'Courses' },
  { href: '/schools', label: 'For Schools' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
];

/** Paths that should not be used as post-auth return targets. */
const AUTH_PATH_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function useAuthReturnHref(): { signInHref: string; registerHrefResolved: string } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const candidate = `${pathname}${query ? `?${query}` : ''}`;
  const isAuthPage = AUTH_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const safe = !isAuthPage ? sanitizeRedirect(candidate) : null;
  return {
    signInHref: safe ? loginHref(safe) : '/login',
    registerHrefResolved: safe ? registerHref(safe) : '/register',
  };
}

function HeaderInner() {
  const { user, logout, isLoading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { signInHref, registerHrefResolved } = useAuthReturnHref();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--surface-border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center justify-start shrink-0 touch-manipulation min-h-[44px] min-w-[44px] md:min-w-0"
          aria-label="The Drone Edge – Home"
        >
          <BrandLogo variant="header" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide text-[var(--brand-muted)]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-[var(--brand-primary)] transition-colors ${pathname === link.href ? 'text-[var(--brand-primary)]' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Book a Call CTA — always visible on desktop */}
          <Link
            href="/consultation"
            className="hidden md:inline-flex items-center justify-center h-9 px-4 text-xs font-semibold tracking-wide border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-[var(--brand-black)] transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Book a Call
          </Link>

          {isLoading ? (
            <div className="h-8 w-24 bg-[var(--surface)] animate-pulse" style={{ borderRadius: 'var(--radius-sm)' }} />
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
                className="flex min-h-[44px] min-w-[44px] items-center space-x-2 rounded-[var(--radius-sm)] p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] touch-manipulation md:min-h-0 md:min-w-0"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <UserIcon className="h-8 w-8 bg-[var(--surface)] text-[var(--brand-muted)] p-1" style={{ borderRadius: 'var(--radius-sm)' }} />
                <span className="hidden sm:inline font-medium text-[var(--brand-foreground)]">{user.username}</span>
                <ChevronDownIcon className={`h-4 w-4 text-[var(--brand-muted)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--surface-border)] py-1 z-50" style={{ borderRadius: 'var(--radius-md)' }} role="menu">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Profile
                  </Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                    Settings
                  </Link>
                  {user?.organization?.role === 'manager' && (
                    <Link href="/manager" className="block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                      Manager Dashboard
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link href="/admin" className="block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                      Admin Dashboard
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors" role="menuitem">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href={registerHrefResolved}
                className="hidden sm:inline-flex items-center justify-center min-h-[44px] px-4 text-sm font-medium tracking-wide bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity touch-manipulation"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Get started
              </Link>
              <Link
                href={signInHref}
                className="hidden sm:inline-flex items-center justify-center min-h-[44px] px-3 text-sm font-medium tracking-wide text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors touch-manipulation"
              >
                Sign in
              </Link>
            </>
          )}

          <button
            type="button"
            className="md:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] touch-manipulation"
            style={{ borderRadius: 'var(--radius-sm)' }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--surface-border)] bg-[var(--background)] max-h-[min(70vh,calc(100dvh-4rem))] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          <nav className="px-3 py-3 space-y-0.5" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block min-h-[44px] flex items-center px-3 text-sm font-medium tracking-wide transition-colors touch-manipulation ${pathname === link.href ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'text-[var(--brand-foreground)] active:bg-[var(--surface)]'}`}
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/consultation"
              className="block min-h-[44px] flex items-center px-3 text-sm font-semibold tracking-wide text-[var(--brand-primary)] border border-[var(--brand-primary)] mt-2 touch-manipulation"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Book a Free Call
            </Link>
            {!user && (
              <>
                <Link
                  href={registerHrefResolved}
                  className="block min-h-[44px] flex items-center px-3 mt-2 text-sm font-semibold tracking-wide bg-[var(--brand-primary)] text-[var(--brand-black)] touch-manipulation"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Get started
                </Link>
                <Link
                  href={signInHref}
                  className="block min-h-[44px] flex items-center px-3 text-sm font-medium tracking-wide text-[var(--brand-foreground)] touch-manipulation"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Sign in
                </Link>
              </>
            )}
            {user && (
              <>
                <hr className="my-2 border-[var(--surface-border)]" />
                <Link
                  href="/profile"
                  className={`block min-h-[44px] flex items-center px-3 text-sm font-medium tracking-wide touch-manipulation ${pathname === '/profile' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'text-[var(--brand-foreground)] active:bg-[var(--surface)]'}`}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className={`block min-h-[44px] flex items-center px-3 text-sm font-medium tracking-wide touch-manipulation ${pathname === '/settings' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'text-[var(--brand-foreground)] active:bg-[var(--surface)]'}`}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Settings
                </Link>
                {user.organization?.role === 'manager' && (
                  <Link
                    href="/manager"
                    className={`block min-h-[44px] flex items-center px-3 text-sm font-medium tracking-wide touch-manipulation ${pathname.startsWith('/manager') ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'text-[var(--brand-foreground)] active:bg-[var(--surface)]'}`}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    Manager
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`block min-h-[44px] flex items-center px-3 text-sm font-medium tracking-wide touch-manipulation ${pathname.startsWith('/admin') ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'text-[var(--brand-foreground)] active:bg-[var(--surface)]'}`}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left min-h-[44px] flex items-center px-3 text-sm font-medium text-red-400 active:bg-red-500/10 touch-manipulation"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default function HeaderComponent() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 border-b border-[var(--surface-border)] bg-[var(--background)]/95 backdrop-blur-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center justify-start shrink-0 min-h-[44px]" aria-label="The Drone Edge – Home">
            <BrandLogo variant="header" />
          </Link>
          <div className="h-8 w-24 bg-[var(--surface)] animate-pulse" style={{ borderRadius: 'var(--radius-sm)' }} />
        </nav>
      </header>
    }>
      <HeaderInner />
    </Suspense>
  );
}
