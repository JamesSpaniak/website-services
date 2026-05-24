import { Metadata } from 'next';
import ContactFormComponent from '../ui/components/contact-form';
import Link from 'next/link';
import { EnvelopeIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Contact',
  description: "Get in touch with Drone Edge. We respond to every message within 48 hours.",
  openGraph: {
    title: 'Contact — Drone Edge',
    description: "Reach the Drone Edge team. Questions about courses, schools, or partnerships.",
  },
};

export default function ContactPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">

          {/* Left: context */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-3xl">
                Contact
              </h1>
              <p className="mt-3 text-sm text-[var(--brand-muted)] leading-relaxed">
                Whether you have a question about a course, want to bring Drone Edge to your school,
                or just want to say hello — we read every message and reply within 48 hours.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 shrink-0 flex items-center justify-center bg-[var(--surface)] border border-[var(--surface-border)]"
                  style={{ borderRadius: 'var(--radius-sm)' }}>
                  <EnvelopeIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--brand-foreground)]">General inquiries</p>
                  <p className="text-xs text-[var(--brand-muted)] mt-0.5 leading-relaxed">
                    Course questions, account help, content feedback — use the form.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-9 w-9 shrink-0 flex items-center justify-center bg-[var(--surface)] border border-[var(--surface-border)]"
                  style={{ borderRadius: 'var(--radius-sm)' }}>
                  <CalendarDaysIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--brand-foreground)]">Schools &amp; programs</p>
                  <p className="text-xs text-[var(--brand-muted)] mt-0.5 leading-relaxed">
                    CTE pathways, org accounts, curriculum questions — use the Educator tab below or{' '}
                    <Link href="/consultation" className="text-[var(--brand-primary)] hover:opacity-80">
                      book a free call
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--surface-border)]">
              <p className="text-xs text-[var(--brand-muted)]">
                Running a CTE or STEM program?{' '}
                <Link href="/schools" className="text-[var(--brand-primary)] hover:opacity-80">
                  See our Schools page →
                </Link>
              </p>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <ContactFormComponent />
          </div>

        </div>
      </div>
    </div>
  );
}
