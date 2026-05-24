import { Metadata } from 'next';
import ImageComponent from '../ui/components/image';
import SocialMediaLinks from '../ui/components/socials';
import PageShell from '../ui/components/page-shell';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Drone Edge is built by people from the drone community—serious Part 107 preparation, practical lessons, and a mission to grow safe, skilled operators.',
  openGraph: {
    title: 'About — Drone Edge',
    description:
      'Built by people from the drone community. Practical certification prep and ongoing learning for pilots, schools, and career switchers.',
  },
};

export default function AboutPage() {
  return (
    <PageShell
      title="About"
      subtitle="From the community. For everyone who flies—or teaches—the work."
      maxWidthClass="max-w-3xl"
    >
      <div className="mt-10 space-y-10 text-sm text-[var(--brand-muted)] leading-relaxed">

        {/* ── Audience cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border border-[var(--surface-border)] bg-[var(--surface)] p-6 space-y-3" style={{ borderRadius: 'var(--radius-md)' }}>
            <h3 className="text-base font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
              For individuals
            </h3>
            <p>
              Career changers, hobbyists going commercial, and anyone curious about unmanned aviation.
              Self-paced courses you can fit around a real schedule — no classroom required.
            </p>
            <Link href="/courses" className="inline-block text-[var(--brand-primary)] font-medium hover:opacity-90">
              Browse courses →
            </Link>
          </div>

          <div className="border border-[var(--surface-border)] bg-[var(--surface)] p-6 space-y-3" style={{ borderRadius: 'var(--radius-md)' }}>
            <h3 className="text-base font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
              For schools &amp; programs
            </h3>
            <p>
              CTE pathways, STEM electives, and career academies. Organization accounts, manager
              dashboards, and structured pacing built for how classrooms actually run.
            </p>
            <Link href="/schools" className="inline-block text-[var(--brand-primary)] font-medium hover:opacity-90">
              See Schools &amp; Educators →
            </Link>
          </div>
        </div>

        {/* ── Mission sections ────────────────────────────────────────── */}
        <section>
          <h3 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
            Who we are
          </h3>
          <p className="mt-4">
            Drone Edge comes out of the{' '}
            <strong className="font-medium text-[var(--brand-foreground)]">drone community</strong>—pilots,
            instructors, and builders who care how this industry matures. We support its{' '}
            <strong className="font-medium text-[var(--brand-foreground)]">mission</strong>: safe
            operations, credible certification, and room for people from every background to learn well.
            We understand the <strong className="font-medium text-[var(--brand-foreground)]">culture</strong>—the
            mix of regulation, field craft, and curiosity that makes unmanned aviation different from a generic
            online class.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
            What we&apos;re building
          </h3>
          <p className="mt-4">
            We build <strong className="font-medium text-[var(--brand-foreground)]">clear learning paths</strong>—structured
            courses with units and sections, rich media, progress you can see, and assessments where the curriculum
            calls for them. We complement that with <strong className="font-medium text-[var(--brand-foreground)]">articles</strong> and
            updates so learning doesn&apos;t stop at the last quiz. Our focus is{' '}
            <strong className="font-medium text-[var(--brand-foreground)]">honest preparation</strong>: we are
            continuously growing our question bank and tightening instructional quality so that what we publish
            matches the seriousness of the FAA Remote Pilot standard.
          </p>
        </section>

        <div className="relative h-48 sm:h-72 w-full overflow-hidden" style={{ borderRadius: 'var(--radius-md)' }}>
          <ImageComponent
            className="object-cover object-center"
            src="/get_the_edge.png"
            alt="Get the edge — community-driven drone training"
            fill
            sizes="(max-width: 768px) 100vw, 42rem"
            priority
          />
        </div>

        <section className="pt-6 border-t border-[var(--surface-border)] text-center">
          <h3 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
            Connect
          </h3>
          <p className="mt-4">
            Questions about courses, partnerships, or content—start on our{' '}
            <Link href="/contact" className="text-[var(--brand-primary)] hover:opacity-90">
              contact page
            </Link>
            . For updates and community, find us on social.
          </p>
          <div className="mt-6 flex justify-center">
            <SocialMediaLinks />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
