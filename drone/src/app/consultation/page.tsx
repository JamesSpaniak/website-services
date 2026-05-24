import { Metadata } from 'next';
import ConsultationForm from '../ui/components/consultation-form';
import Link from 'next/link';
import { ClockIcon, ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Free Consultation — Drone Edge',
  description:
    'Book a free 30-minute call with the Drone Edge team. Learn how to bring FAA Part 107 certification into your school or program.',
  openGraph: {
    title: 'Book a Free Consultation — Drone Edge',
    description: 'Talk to us about bringing drone certification to your CTE program or school.',
  },
};

const whatWeDiscuss = [
  'Your program structure and student count',
  'Curriculum pacing and delivery format',
  'How org accounts and manager dashboards work',
  'Pricing and getting started',
  'Any questions about the content or platform',
];

export default function ConsultationPage() {
  return (
    <div data-edu-theme="true" className="min-h-screen font-sans">

      {/* ── Hero strip ────────────────────────────────────────────────── */}
      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
          <Link href="/schools"
            className="inline-flex items-center gap-1 text-xs text-[#4a6b2f] font-medium hover:opacity-80 mb-5">
            ← For Schools
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[#171717]">
            Book a free consultation
          </h1>
          <p className="mt-4 text-base text-[#525252] max-w-xl leading-relaxed">
            A free, no-commitment 30-minute call with the Drone Edge team. We&apos;ll learn about your
            program and show you exactly how the platform fits.
          </p>
        </div>
      </section>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">

            {/* Left sidebar */}
            <div className="lg:col-span-2 space-y-10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center bg-[#4a6b2f]/10"
                  style={{ borderRadius: '2px' }}>
                  <ClockIcon className="h-4.5 w-4.5 text-[#4a6b2f]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171717]">30 minutes</p>
                  <p className="text-xs text-[#737373]">We confirm the exact time via email</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-[#4a6b2f]" />
                  <p className="text-sm font-semibold text-[#171717]">What we&apos;ll cover</p>
                </div>
                <ul className="space-y-3">
                  {whatWeDiscuss.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#525252]">
                      <CheckCircleIcon className="h-4 w-4 text-[#4a6b2f] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-[#e5e5e5]">
                <p className="text-xs text-[#737373] leading-relaxed">
                  Prefer to read first?{' '}
                  <Link href="/schools/curriculum" className="text-[#4a6b2f] hover:opacity-80 font-medium">
                    View the curriculum overview →
                  </Link>
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3">
              <ConsultationForm />
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
