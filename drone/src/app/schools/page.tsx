import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  AcademicCapIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UserGroupIcon,
  BookOpenIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'For Schools — Drone Edge',
  description:
    'Structured FAA Part 107 curriculum, org-wide progress tracking, and flexible delivery for CTE and STEM programs.',
  openGraph: {
    title: 'For Schools — Drone Edge',
    description:
      'Bring drone certification into your classroom. Aligned to FAA ACS domains with educator dashboards and async delivery.',
  },
};

const valueProps = [
  {
    icon: BookOpenIcon,
    title: 'Structured learning paths',
    body: 'Units, sections, and exams mapped to FAA ACS domains. Students always know what comes next, and you always know where they stand.',
  },
  {
    icon: ChartBarIcon,
    title: 'Teacher visibility',
    body: 'Org accounts with a manager dashboard show per-student progress, completion status, and exam scores across your entire class.',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Async + hybrid delivery',
    body: 'Fully browser-based—no app to install. Students can work in class, at home, or on any device. No locked hardware required.',
  },
];

const features = [
  '600+ ACS-tagged practice questions',
  'Video lessons with image galleries',
  'Unit exams with full score history',
  'Organization admin + student accounts',
  'Manager dashboard with cohort progress',
  'Structured curriculum aligned to Part 107',
  'No locked hardware — BYOD',
  'Dedicated support',
];

const programTypes = [
  'CTE Pathways',
  'STEM Electives',
  'Career Academies',
  'After-School Programs',
  'Workforce Development',
  'Community College',
];

const steps = [
  {
    number: '01',
    title: 'Book a free consultation',
    body: 'We learn about your program, class size, and pacing needs. No commitment required.',
  },
  {
    number: '02',
    title: 'Set up your organization',
    body: 'We create your org account, help you invite teachers and students, and configure your cohort.',
  },
  {
    number: '03',
    title: 'Start learning',
    body: 'Students work through structured units and exams. You monitor progress from your manager dashboard.',
  },
];

export default function SchoolsPage() {
  return (
    <div className="font-sans">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8] overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest text-[#4a6b2f] uppercase mb-4">
                Schools &amp; Educators
              </span>
              <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight text-[#171717] leading-tight">
                Bring drone certification<br className="hidden sm:block" /> into your classroom.
              </h1>
              <p className="mt-6 text-lg text-[#525252] leading-relaxed">
                Drone Edge gives CTE programs and STEM educators a structured, platform-backed
                path to FAA Part 107 certification — with org-wide progress tracking and flexible
                async delivery built for how schools actually run.
              </p>
              <div className="mt-10 flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/consultation"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#4a6b2f] text-white text-sm font-semibold tracking-wide hover:bg-[#3b5526] transition-colors"
                    style={{ borderRadius: '2px' }}
                  >
                    Book a Free Consultation
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/schools/curriculum"
                    className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#4a6b2f] text-[#4a6b2f] text-sm font-semibold tracking-wide hover:bg-[#4a6b2f]/5 transition-colors"
                    style={{ borderRadius: '2px' }}
                  >
                    View Curriculum Overview
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
                <Link
                  href="/schools/funding"
                  className="inline-flex w-fit max-w-full items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 border-2 border-[#4a6b2f] bg-white text-[#4a6b2f] text-xs sm:text-sm font-semibold tracking-wide hover:bg-[#f0f5eb] transition-colors shadow-sm"
                  style={{ borderRadius: '2px' }}
                >
                  <BanknotesIcon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Federal &amp; state sources</span>
                  <ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </div>

              {/* Quick stats — 2×2 grid so the right column aligns; items-start when left cell wraps */}
              <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 text-sm text-[#525252] max-w-lg">
                <span className="flex items-start gap-2 min-w-0">
                  <CheckCircleIcon className="h-4 w-4 text-[#4a6b2f] shrink-0 mt-0.5" aria-hidden />
                  <span className="leading-snug">600+ practice questions</span>
                </span>
                <span className="flex items-start gap-2 min-w-0">
                  <CheckCircleIcon className="h-4 w-4 text-[#4a6b2f] shrink-0 mt-0.5" aria-hidden />
                  <span className="leading-snug">FAA ACS-aligned</span>
                </span>
                <span className="flex items-start gap-2 min-w-0">
                  <CheckCircleIcon className="h-4 w-4 text-[#4a6b2f] shrink-0 mt-0.5" aria-hidden />
                  <span className="leading-snug">Async + hybrid delivery</span>
                </span>
                <span className="flex items-start gap-2 min-w-0">
                  <CheckCircleIcon className="h-4 w-4 text-[#4a6b2f] shrink-0 mt-0.5" aria-hidden />
                  <span className="leading-snug">No locked hardware</span>
                </span>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative h-80 lg:h-[420px] overflow-hidden" style={{ borderRadius: '4px' }}>
              <Image
                src="/3_kids_holding.png"
                alt="Students holding drones in a classroom"
                fill
                className="object-cover object-center"
                priority
                unoptimized
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Value props ───────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-[#171717] text-center">
            Built for how schools run
          </h2>
          <p className="mt-3 text-center text-sm text-[#525252] max-w-xl mx-auto">
            Not just another playlist of videos. Drone Edge is structured, accountable, and designed
            for the realities of a classroom schedule.
          </p>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {valueProps.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col">
                <div className="flex items-center justify-center h-12 w-12 bg-[#f0f5eb] mb-5"
                  style={{ borderRadius: '2px' }}>
                  <Icon className="h-6 w-6 text-[#4a6b2f]" />
                </div>
                <h3 className="text-base font-display font-semibold text-[#171717] mb-2">{title}</h3>
                <p className="text-sm text-[#525252] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ───────────────────────────────────────────── */}
      <section className="bg-[#fafafa] border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#4a6b2f] uppercase">
                What&apos;s included
              </span>
              <h2 className="mt-3 text-2xl font-display font-semibold tracking-tight text-[#171717]">
                Everything your students need to reach certification
              </h2>
              <p className="mt-4 text-sm text-[#525252] leading-relaxed">
                The platform handles the learning infrastructure so you can focus on teaching.
                Students get a complete, structured path from first lesson to practice exam.
              </p>
              <ul className="mt-8 space-y-3">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-[#525252]">
                    <CheckCircleIcon className="h-5 w-5 text-[#4a6b2f] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {/* Visual card */}
            <div className="bg-white border border-[#e5e5e5] p-8 space-y-5"
              style={{ borderRadius: '4px' }}>
              <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
                <div className="h-10 w-10 bg-[#4a6b2f] flex items-center justify-center"
                  style={{ borderRadius: '2px' }}>
                  <AcademicCapIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171717]">FAA Part 107 Course</p>
                  <p className="text-xs text-[#737373]">Full certification pathway</p>
                </div>
              </div>
              {['Unit 1: Regulations', 'Unit 2: Airspace & Charts', 'Unit 3: Airport Operations', 'Unit 4: Weather', 'Unit 5: Safety & Operations'].map((unit, i) => (
                <div key={unit} className="flex items-center justify-between text-sm">
                  <span className="text-[#525252]">{unit}</span>
                  <span className={`text-xs px-2 py-0.5 ${i < 2 ? 'bg-[#4a6b2f]/10 text-[#4a6b2f]' : 'bg-[#f5f5f5] text-[#737373]'}`}
                    style={{ borderRadius: '2px' }}>
                    {i < 2 ? 'Complete' : 'In progress'}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t border-[#e5e5e5]">
                <div className="flex justify-between text-xs text-[#737373] mb-2">
                  <span>Class progress</span>
                  <span>14 / 24 students</span>
                </div>
                <div className="h-2 bg-[#e5e5e5] w-full" style={{ borderRadius: '2px' }}>
                  <div className="h-2 bg-[#4a6b2f] w-[58%]" style={{ borderRadius: '2px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-[#171717] text-center">
            How it works
          </h2>
          <p className="mt-3 text-center text-sm text-[#525252] max-w-lg mx-auto">
            From first conversation to students in the platform — typically within a week.
          </p>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map(({ number, title, body }) => (
              <div key={number} className="relative">
                <span className="text-5xl font-display font-bold text-[#4a6b2f]/15 leading-none select-none">
                  {number}
                </span>
                <h3 className="mt-2 text-base font-display font-semibold text-[#171717]">{title}</h3>
                <p className="mt-2 text-sm text-[#525252] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Program types ─────────────────────────────────────────────── */}
      <section className="bg-[#fafafa] border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <UserGroupIcon className="h-5 w-5 text-[#4a6b2f]" />
              <span className="text-sm font-semibold text-[#171717]">Designed for:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {programTypes.map((p) => (
                <span key={p}
                  className="text-xs font-medium px-3 py-1.5 bg-[#4a6b2f]/8 text-[#4a6b2f] border border-[#4a6b2f]/20"
                  style={{ borderRadius: '2px' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Explore further ───────────────────────────────────────────── */}
      <section className="bg-white border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-lg font-display font-semibold text-[#171717] mb-6">Explore further</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/schools/curriculum"
              className="group flex items-center justify-between p-5 bg-[#fafafa] border border-[#e5e5e5] hover:border-[#4a6b2f]/40 hover:bg-[#f0f5eb] transition-colors"
              style={{ borderRadius: '4px' }}>
              <div>
                <p className="text-sm font-semibold text-[#171717]">Curriculum Overview</p>
                <p className="text-xs text-[#525252] mt-1">What students learn, unit by unit</p>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-[#4a6b2f] group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/schools/funding"
              className="group flex items-center justify-between p-5 bg-[#fafafa] border border-[#e5e5e5] hover:border-[#4a6b2f]/40 hover:bg-[#f0f5eb] transition-colors"
              style={{ borderRadius: '4px' }}>
              <div>
                <p className="text-sm font-semibold text-[#171717]">Funding &amp; grants</p>
                <p className="text-xs text-[#525252] mt-1">PA SMART and how programs map to STEM/CTE funding</p>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-[#4a6b2f] group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/courses"
              className="group flex items-center justify-between p-5 bg-[#fafafa] border border-[#e5e5e5] hover:border-[#4a6b2f]/40 hover:bg-[#f0f5eb] transition-colors sm:col-span-2 lg:col-span-1"
              style={{ borderRadius: '4px' }}>
              <div>
                <p className="text-sm font-semibold text-[#171717]">Browse Courses</p>
                <p className="text-xs text-[#525252] mt-1">See the full course catalog</p>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-[#4a6b2f] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Drone image strip ─────────────────────────────────────────── */}
      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="relative h-[22rem] sm:h-[28rem] overflow-hidden" style={{ borderRadius: '4px' }}>
            <Image
              src="/security_drone_v3.png"
              alt="Community member visits school flying session"
              fill
              className="object-contain object-center"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────────────────── */}
      <section className="bg-[#4a6b2f]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <ClipboardDocumentCheckIcon className="h-10 w-10 text-white/60 mx-auto mb-6" />
          <h2 className="text-2xl font-display font-semibold tracking-tight text-white">
            Ready to bring drone certification to your school?
          </h2>
          <p className="mt-4 text-sm text-white/80 max-w-lg mx-auto">
            Book a free 30-minute consultation and we&apos;ll walk through how Drone Edge fits your
            program, class size, and timeline — no commitment required.
          </p>
          <Link
            href="/consultation"
            className="mt-8 inline-flex items-center gap-2 px-7 py-3 bg-white text-[#4a6b2f] text-sm font-semibold tracking-wide hover:bg-white/90 transition-colors"
            style={{ borderRadius: '2px' }}
          >
            Book a Free Consultation
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
