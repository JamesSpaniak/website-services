import Link from 'next/link';
import BrandLogo from './brand-logo';

const NAV_COLUMNS = [
  {
    heading: 'Learn',
    links: [
      { href: '/courses', label: 'Courses' },
      { href: '/articles', label: 'Articles' },
    ],
  },
  {
    heading: 'Programs',
    links: [
      { href: '/schools', label: 'For Schools' },
      { href: '/schools/curriculum', label: 'Curriculum' },
      { href: '/schools/funding', label: 'Funding & grants' },
      { href: '/consultation', label: 'Book a Call' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/legal', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Notice' },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  {
    name: 'X / Twitter',
    href: '#',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: '#',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
      </svg>
    ),
  },
] as const;

export default function FooterComponent() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--surface-border)] bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">

        {/* ── Top: brand + nav columns ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">

          {/* Brand block — full width on mobile, 1 col on sm+ */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" aria-label="Drone Edge — Home" className="inline-block touch-manipulation">
              <BrandLogo variant="header" />
            </Link>
            <p className="mt-3 text-xs text-[var(--brand-muted)] leading-relaxed max-w-[200px]">
              FAA Part 107 prep, aerial video &amp; photography, and AI/STEM drone education.
            </p>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold tracking-widest text-[var(--brand-foreground)] uppercase mb-4">
                {col.heading}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)] transition-colors touch-manipulation"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom: copyright + socials ───────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-[var(--surface-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[var(--brand-muted)]">
            © {year} Drone Edge. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className="text-[var(--brand-muted)] hover:text-[var(--brand-primary)] transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center touch-manipulation"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
