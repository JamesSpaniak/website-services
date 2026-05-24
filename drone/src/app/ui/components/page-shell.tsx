import type { ReactNode } from 'react';

type PageShellProps = {
  children: ReactNode;
  /** Optional page title (h1) */
  title?: string;
  /** Optional subtitle under title */
  subtitle?: string;
  /** Max width: default matches articles/about style */
  maxWidthClass?: string;
};

/**
 * Shared layout for profile, auth, settings, about, contact, org/manager flows — consistent padding and width.
 */
export default function PageShell({
  children,
  title,
  subtitle,
  maxWidthClass = 'max-w-4xl',
}: PageShellProps) {
  return (
    <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-[max(3rem,env(safe-area-inset-bottom))] sm:pb-16">
      <div className={`mx-auto ${maxWidthClass}`}>
        {(title || subtitle) && (
          <header className="mb-10">
            {title && (
              <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-2 text-sm text-[var(--brand-muted)]">{subtitle}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
