import { Metadata } from 'next';
import Link from 'next/link';
import PageShell from './ui/components/page-shell';
import GoBackButton from './ui/components/go-back-button';
import RecentArticles from './ui/components/recent-articles';

const LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/courses', label: 'Courses' },
  { href: '/schools', label: 'For Schools' },
  { href: '/newsletter', label: 'Field Notes newsletter' },
  { href: '/', label: 'Home' },
];

export default function NotFound() {
  return (
    <PageShell
      title="Page not found"
      subtitle="That page doesn't exist, or it has moved. Old article links still work, so if you followed one, it may have been removed."
      maxWidthClass="max-w-5xl"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <GoBackButton />
        <nav aria-label="Popular pages" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[var(--brand-primary)] hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <RecentArticles className="mt-12" />
    </PageShell>
  );
}
