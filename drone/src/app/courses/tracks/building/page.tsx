import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CpuChipIcon,
  CubeIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import PageShell from '@/app/ui/components/page-shell';
import WaitlistForm from '@/app/ui/components/waitlist-form';
import { FEATURED_COURSE_ID } from '@/app/lib/auth-redirect';

// Facts on this page come from assets/courses/drone-building/ (outline v3.4,
// parts list v4). Marketing copy only — there is no course payload or price yet.

export const metadata: Metadata = {
  title: 'Drone Building — Early Access January 2027',
  description:
    'Design a 3D-printed frame, build a 3.5" quadcopter, set it up in Betaflight, and fly it under Part 107. Drone Building opens for early access in January 2027 — join the waitlist.',
  alternates: { canonical: '/courses/tracks/building' },
  openGraph: {
    title: 'Drone Building — Early Access January 2027 | Drone Edge',
    description:
      'Build and fly your own drone: CAD frame design, assembly, Betaflight setup, and supervised flight. Join the early-access waitlist.',
  },
};

const BUILD_POINTS = [
  'A 3.5" prop-guarded quadcopter — the frame is one you design in CAD and 3D-print yourself, with a stock frame as the fallback',
  'Betaflight flight controller stack (F722, with barometer), an ExpressLRS receiver, and a 3S battery',
  'A GPS + Remote ID module on every aircraft, so each one can be registered and flown under Part 107',
  'Two kit versions: Solder, where students make the solder joints themselves, or Pre-soldered, where the wiring ships done and students bolt, plug, and route',
];

const UNITS = [
  { n: 1, title: 'Safety', desc: 'Battery handling, tools, bench rules, and a signed shop certificate.' },
  { n: 2, title: 'Function of components', desc: 'Motors, props, battery, ESC, flight controller, receiver, Remote ID.' },
  { n: 3, title: 'Laws for the custom drone', desc: 'Registration, Remote ID, line of sight, and site checks for a homebuilt aircraft.' },
  { n: 4, title: 'Physics for builders', desc: 'Center of gravity, materials, heat, thrust-to-weight, and battery mechanics.' },
  { n: 5, title: 'Frame design', desc: 'CAD fundamentals, a design brief from measured parts, critique, and a weigh-in.' },
  { n: 6, title: 'Assembly', desc: 'Stack, motors, receiver, and Remote ID — then a smoke-stopper first power-on.' },
  { n: 7, title: 'Software setup', desc: 'Flash and configure Betaflight, bind the radio, and prove the failsafe props-off.' },
  { n: 8, title: 'Testing and flight', desc: 'Bench checklist, then a supervised maiden flight and iteration.' },
] as const;

const AUDIENCES = [
  {
    Icon: UserGroupIcon,
    title: 'Schools and programs',
    desc: 'Written as a school edition of about 33–38 class sessions for CTE, engineering, and STEM classes and makerspaces, with teacher checklists and rubrics. Schools without a 3D printer can get pre-printed stock frames.',
  },
  {
    Icon: WrenchScrewdriverIcon,
    title: 'Makers',
    desc: 'If you want a structured first build — from a blank CAD sketch to a first hover — join the waitlist and we’ll let you know how early access works for individuals.',
  },
] as const;

const SAFETY_GATES = [
  'Signed shop certificate before any assembly',
  'Failsafe set and demonstrated with props off before any motor spins',
  'Bench checklist passed before the first flight, with a Remote Pilot in Command present on every flight day',
];

export default function DroneBuildingPage() {
  return (
    <PageShell maxWidthClass="max-w-4xl">
      {/* Hero */}
      <header className="mb-10">
        <span
          className="inline-block text-xs font-semibold px-2 py-1 bg-sky-100/80 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          Early access — January 2027
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
          Drone Building
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[var(--brand-primary)]">
          Build and fly your own drone
        </p>
        <p className="mt-4 max-w-2xl text-base text-[var(--brand-muted)] leading-relaxed">
          Design a frame in CAD, print it, assemble a 3.5&quot; quadcopter, set it up in Betaflight, and fly it —
          with the physics, materials, and FAA rules taught where the build needs them. The course is in development
          and opens for early access in January 2027.
        </p>
      </header>

      {/* Waitlist — prominent */}
      <section
        id="waitlist"
        className="mb-12 border border-[var(--brand-primary)]/40 bg-[var(--surface)] p-5 sm:p-6"
        style={{ borderRadius: 'var(--radius-md)' }}
        aria-labelledby="waitlist-heading"
      >
        <h2 id="waitlist-heading" className="text-lg font-display font-semibold text-[var(--brand-foreground)]">
          Get early access
        </h2>
        <p className="mt-1 mb-4 text-sm text-[var(--brand-muted)]">
          Join the waitlist and we&apos;ll email you when Drone Building opens. No payment, no commitment.
        </p>
        <WaitlistForm interest="building" offerNewsletter />
      </section>

      {/* What you build */}
      <section className="mb-12" aria-labelledby="build-heading">
        <div className="flex items-center gap-2 mb-4">
          <CubeIcon className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden />
          <h2 id="build-heading" className="text-xl font-display font-semibold text-[var(--brand-foreground)]">
            What you build
          </h2>
        </div>
        <ul className="space-y-3">
          {BUILD_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-[var(--brand-muted)] leading-relaxed">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--brand-muted)]">
          Parts and kit details are still being finalised and may change before launch.
        </p>
      </section>

      {/* What you learn */}
      <section className="mb-12" aria-labelledby="learn-heading">
        <div className="flex items-center gap-2 mb-4">
          <CpuChipIcon className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden />
          <h2 id="learn-heading" className="text-xl font-display font-semibold text-[var(--brand-foreground)]">
            What you learn
          </h2>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {UNITS.map((u) => (
            <li
              key={u.n}
              className="flex items-start gap-3 border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <span className="font-mono text-xs font-bold text-[var(--brand-primary)] mt-0.5 shrink-0">
                {String(u.n).padStart(2, '0')}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--brand-foreground)]">{u.title}</p>
                <p className="mt-0.5 text-xs text-[var(--brand-muted)] leading-relaxed">{u.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Safety */}
      <section
        className="mb-12 border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6"
        style={{ borderRadius: 'var(--radius-md)' }}
        aria-labelledby="safety-heading"
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheckIcon className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden />
          <h2 id="safety-heading" className="text-lg font-display font-semibold text-[var(--brand-foreground)]">
            Safety comes first
          </h2>
        </div>
        <p className="mb-3 text-sm text-[var(--brand-muted)]">Three checkpoints must be signed off before the next step:</p>
        <ul className="space-y-2">
          {SAFETY_GATES.map((gate) => (
            <li key={gate} className="flex items-start gap-3 text-sm text-[var(--brand-muted)]">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
              {gate}
            </li>
          ))}
        </ul>
      </section>

      {/* Who it's for */}
      <section className="mb-12" aria-labelledby="who-heading">
        <h2 id="who-heading" className="mb-4 text-xl font-display font-semibold text-[var(--brand-foreground)]">
          Who it&apos;s for
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AUDIENCES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="border border-[var(--surface-border)] bg-[var(--surface)] p-5"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <Icon className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden />
              <p className="mt-3 text-base font-display font-semibold text-[var(--brand-foreground)]">{title}</p>
              <p className="mt-1 text-sm text-[var(--brand-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Next steps */}
      <section
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[var(--surface-border)] pt-8"
        aria-label="Related"
      >
        <p className="text-sm text-[var(--brand-muted)] max-w-md">
          Want a head start? Our FAA Part 107 course covers the airspace rules every drone builder needs — Unit 1 is
          free.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/courses/${FEATURED_COURSE_ID}/preview`}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] transition-colors ring-focus touch-manipulation"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Part 107 course
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/consultation"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] transition-colors ring-focus touch-manipulation"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Schools: book a call
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
