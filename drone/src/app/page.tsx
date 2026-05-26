import Link from 'next/link';
import JsonLd, { organizationJsonLd, websiteJsonLd } from './ui/components/json-ld';
import HomeAuthCta from './ui/components/home-auth-cta';
import BrandLogo from './ui/components/brand-logo';
import ImageComponent from './ui/components/image';
import HeroScrollNext from './ui/components/hero-scroll-next';
import { ArrowRightIcon, AcademicCapIcon, FilmIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { ArticleSlim } from './lib/types/article';
import ArticlePreviewComponent from './ui/components/article-preview';

// ── Server-side data ──────────────────────────────────────────────────────────

async function fetchRecentArticles(limit = 3): Promise<ArticleSlim[]> {
  const base =
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:3000';
  try {
    const res = await fetch(`${base}/articles`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const articles: ArticleSlim[] = await res.json();
    return articles.filter((a) => !a.hidden).slice(0, limit);
  } catch {
    return [];
  }
}

// ── Static content ────────────────────────────────────────────────────────────

const COURSE_TRACKS = [
  {
    id: 'faa',
    Icon: AcademicCapIcon,
    badge: 'All Students',
    badgeCls: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    title: 'FAA Part 107',
    tagline: 'The certification prerequisite',
    desc: 'Federal airspace rules, weather, safety, and decision-making. Required knowledge before any drone program — recreational, commercial, or STEM.',
    href: '/courses',
  },
  {
    id: 'photo',
    Icon: FilmIcon,
    badge: 'Creative Track',
    badgeCls: 'bg-violet-100/80 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    title: 'Video & Photography',
    tagline: 'From flight to final cut',
    desc: 'Camera settings, cinematic composition, and professional editing in DaVinci Resolve. A complete production pipeline for aerial storytelling.',
    href: '/courses',
  },
  {
    id: 'ai',
    Icon: CpuChipIcon,
    badge: 'STEM Track',
    badgeCls: 'bg-sky-100/80 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    title: 'AI & Drones',
    tagline: 'Machine learning meets autonomous flight',
    desc: 'Python, computer vision, and autonomous navigation using drones as the hands-on platform. Built for STEM programs and CS classes.',
    href: '/courses',
  },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const recentArticles = await fetchRecentArticles(3);

  return (
    <div className="font-sans">

      {/* ── Hero — full viewport ──────────────────────────────────────────── */}
      <div className="relative isolate z-10 grid grid-rows-[1fr_auto] items-center min-h-[calc(100vh-theme(spacing.16))] p-6 sm:p-12 lg:p-20 overflow-x-hidden">

        {/* Background photo */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <ImageComponent
            src="/drone_top_cropped.png"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        {/* Gradient overlays */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[var(--background)]/50 via-[var(--background)]/28 to-[var(--background)]/72 dark:from-[var(--background)]/60 dark:via-[var(--background)]/38 dark:to-[var(--background)]/82"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_95%_at_12%_10%,var(--background)_0%,var(--background)_6%,transparent_58%)] opacity-[0.88] dark:opacity-[0.95]"
          aria-hidden
        />

        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />

        {/* Hero content */}
        <main className="relative z-[1] flex min-w-0 flex-col gap-12 max-w-2xl">
          <div className="relative min-w-0">
            <h1 className="sr-only">Drone Edge</h1>
            <div className="mb-8 max-w-full min-w-0 [filter:drop-shadow(0_2px_24px_var(--background))]">
              <BrandLogo variant="hero" />
            </div>
            <p className="font-mono text-sm tracking-widest text-[var(--brand-subtle)] uppercase mb-2 [text-shadow:0_1px_3px_var(--background),0_0_20px_var(--background)]">
              Learn · Practice · Certify
            </p>
            <p className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] max-w-md [text-shadow:0_1px_4px_var(--background),0_0_32px_var(--background)]">
              FAA Part 107 and beyond. Technical education for the field.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/articles"
              className="inline-flex items-center justify-center min-h-[44px] bg-[var(--brand-primary)] text-[var(--brand-black)] font-medium text-sm tracking-wide px-5 hover:opacity-90 transition-opacity ring-focus touch-manipulation"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Articles
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center min-h-[44px] border border-[var(--surface-border)] text-[var(--brand-foreground)] font-medium text-sm tracking-wide px-5 hover:bg-[var(--surface)] transition-colors ring-focus touch-manipulation"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Courses
            </Link>
            <HomeAuthCta />
          </div>
        </main>

        <HeroScrollNext />
      </div>

      {/* ── Course Tracks ─────────────────────────────────────────────────── */}
      <section
        id="explore"
        className="bg-[var(--background)] border-t border-[var(--surface-border)]"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">

          <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
            <div>
              <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase mb-2">
                Course Tracks
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
                Three paths. One platform.
              </h2>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-primary)] hover:opacity-80 transition-opacity shrink-0 min-h-[44px] touch-manipulation"
            >
              Browse all courses
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COURSE_TRACKS.map(({ id, Icon, badge, badgeCls, title, tagline, desc, href }) => (
              <Link
                key={id}
                href={href}
                className="group flex flex-col gap-4 bg-[var(--surface)] border border-[var(--surface-border)] p-5 sm:p-6 hover:border-[var(--brand-primary)]/50 transition-colors ring-focus touch-manipulation"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 bg-[var(--brand-primary)]/8 inline-flex" style={{ borderRadius: 'var(--radius-sm)' }}>
                    <Icon className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 ${badgeCls}`} style={{ borderRadius: '2px' }}>
                    {badge}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-base font-display font-semibold text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {title}
                  </p>
                  <p className="text-xs font-mono text-[var(--brand-primary)] mt-0.5 mb-2 uppercase tracking-wide">
                    {tagline}
                  </p>
                  <p className="text-sm text-[var(--brand-muted)] leading-relaxed">
                    {desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] mt-auto">
                  View course
                  <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          {/* For Schools callout */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-4" style={{ borderRadius: 'var(--radius-md)' }}>
            <p className="text-sm text-[var(--brand-muted)]">
              <span className="font-semibold text-[var(--brand-foreground)]">Teaching a class?</span>{' '}
              Drone Edge offers curriculum packages, teacher dashboards, and pacing guides for schools and programs.
            </p>
            <Link
              href="/schools"
              className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] hover:opacity-80 transition-opacity min-h-[44px] touch-manipulation"
            >
              For Schools
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Recent Articles ───────────────────────────────────────────────── */}
      <section className="bg-[var(--surface)] border-t border-[var(--surface-border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">

          <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
            <div>
              <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase mb-2">
                Articles
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
                Latest from the field
              </h2>
            </div>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-primary)] hover:opacity-80 transition-opacity shrink-0 min-h-[44px] touch-manipulation"
            >
              All articles
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {recentArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentArticles.map((article) => (
                <ArticlePreviewComponent
                  key={article.id}
                  article={article}
                  cardTone="background"
                />
              ))}
            </div>
          ) : (
            /* Fallback when API is unreachable — static teaser cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Understanding FAA Airspace Classifications',
                  sub: 'Class A through G — what each one means for drone pilots and when authorization is required.',
                },
                {
                  title: 'Reading a METAR for Drone Operations',
                  sub: 'How to decode visibility, wind, and ceiling data before every flight.',
                },
                {
                  title: 'The 180° Shutter Rule for Drone Video',
                  sub: 'Why shutter speed is tied to frame rate and how ND filters keep your footage cinematic.',
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href="/articles"
                  className="group flex flex-col gap-3 border border-[var(--surface-border)] bg-[var(--background)] p-5 hover:border-[var(--brand-primary)]/50 transition-colors ring-focus touch-manipulation"
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <h3 className="text-base font-display font-semibold tracking-tight text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--brand-muted)] leading-relaxed line-clamp-2">
                    {item.sub}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] mt-auto pt-1">
                    Browse articles
                    <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
