import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  FilmIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  BeakerIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Curriculum Overview — Drone Edge for Schools',
  description:
    'FAA Part 107 certification prep is available now; Drone Building opens for early access in January 2027; Video & Photography and AI & Drones are planned. Explore units, activities, practice tests, and teacher resources.',
};

export const revalidate = 3600;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiUnit {
  id: string | number;
  title: string;
  description?: string;
}

interface ApiCourse {
  id: number;
  title: string;
  sub_title?: string;
  description?: string;
  units?: ApiUnit[];
}

// ── Data Fetch ─────────────────────────────────────────────────────────────────

async function fetchAllCourses(): Promise<ApiCourse[]> {
  const base =
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:3000';
  try {
    const res = await fetch(`${base}/courses`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Static Content ─────────────────────────────────────────────────────────────

/**
 * Availability of each track. Only `available` tracks can be bought or assigned
 * today — keep planned tracks clearly labelled (no product claims; see
 * docs/sales/features.md).
 */
type TrackStatus = 'available' | 'early_access' | 'planned';

const STATUS_BADGE: Record<TrackStatus, { label: string; cls: string }> = {
  available: { label: 'Available now', cls: 'bg-[#4a6b2f]/10 text-[#4a6b2f] border-[#4a6b2f]/30' },
  early_access: { label: 'Early access — January 2027', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  planned: { label: 'Planned', cls: 'bg-[#f5f5f5] text-[#525252] border-[#d4d4d4]' },
};

const TRACKS = [
  {
    id: 'faa',
    status: 'available' as TrackStatus,
    statusNote: null,
    href: null,
    icon: AcademicCapIcon,
    badge: 'Prerequisites',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
    cardBorder: 'border-amber-200',
    accentBg: 'bg-amber-50',
    titleColor: 'text-amber-800',
    title: 'FAA Part 107 Certification',
    tagline: 'Where every student starts — required for all program tracks',
    description:
      'The FAA Part 107 knowledge exam is the legal gateway to commercial and educational drone operations. This foundational course is where every student starts, and it is available today. It covers federal aviation regulations, airspace classification, weather, safety, and decision-making.',
    forWhom:
      'The recommended starting point for every student. Before a student builds, films, or flies for a program, they need to understand the rules of the airspace. Part 107 is that foundation. School programs run this over a semester or full year as part of a broader class — the content can be condensed for individual learners (career changers, adult pilots), but the school version is paced to cover the material thoroughly across the term.',
    unitCount: 9,
    includes: [
      '9 content units mapped to FAA Airman Certification Standards (ACS)',
      'Knowledge checks after every section and unit',
      'Auto-generated exams per unit, section, or full course — drawn from a 500+ question bank',
      'Multiple exam versions available to prevent answer sharing, or a fixed version for class consistency',
      'Teacher answer keys and discussion guides',
      'Aligned to all FAA ACS knowledge domains — not just a subset',
    ],
    activities: [
      'Sectional chart exercises — identify airspace classes from real charts',
      'METAR decoding drills — read live weather reports',
      'Scenario-based preflight decision-making discussions',
      'Class airspace authorization simulation (LAANC)',
      'Group case studies on real FAA enforcement actions',
    ],
    sampleQuestion: {
      q: 'What is the maximum groundspeed for a sUAS under Part 107?',
      options: ['55 mph', '87 knots (100 mph)', '100 knots', '65 mph'],
      correct: 1,
    },
    teacherNote:
      'Includes pacing guides for semester and full-year delivery. Practice tests auto-generate randomized question sets from the full question bank to mimic the real exam — generate multiple versions for different class periods or a single fixed version to keep all students on equal footing. Includes a student readiness rubric and printable concept references covering all ACS-tested topics.',
  },
  {
    id: 'building',
    status: 'early_access' as TrackStatus,
    statusNote:
      'Opens for early access in January 2027. The outline below is the current school edition and may change before launch. Join the waitlist to hear when it opens.',
    href: '/courses/tracks/building',
    icon: WrenchScrewdriverIcon,
    badge: 'Hands-on Track',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    iconColor: 'text-sky-600',
    cardBorder: 'border-sky-200',
    accentBg: 'bg-sky-50',
    titleColor: 'text-sky-800',
    title: 'Drone Building',
    tagline: 'Design, build, configure, and fly a 3.5" quad',
    description:
      'Students design a 3D-printed frame in CAD, assemble a 3.5" prop-guarded quadcopter, set it up in Betaflight, and fly it in a supervised flight lab under Part 107. Physics, materials, and heat are taught where the build needs them, and safety gates come before every power-on and flight.',
    forWhom:
      'Built for CTE, engineering, and STEM programs and school makerspaces. Part 107 is a helpful starting point; the course teaches the builder-scoped rules (registration, Remote ID, line of sight) in its own unit. The school edition runs about 33–38 class sessions. Kits come in a Solder version, where students make the joints, and a Pre-soldered version for programs without a soldering station.',
    unitCount: 8,
    includes: [
      '8 units: Safety, Components, Laws, Physics, Frame design, Assembly, Software setup, Testing & flight',
      'Frame design in CAD (Onshape by default, free for education) — students print the whole frame; a stock frame is the fallback',
      'Reference kit: F722 flight controller stack, ELRS receiver, GPS + Remote ID module per aircraft, 3S battery',
      'Three safety gates: signed shop certificate, failsafe demonstrated props-off, bench checklist before first flight',
      'Grading built on the bench checklist and a maiden-flight rubric',
    ],
    activities: [
      'Parts identification lab on the real kit',
      'Break printed test bars in two print orientations — strength is a design decision',
      'Budget all-up weight and thrust for your own design',
      'Smoke-stopper first power-on after a continuity and polarity check',
      'Bench checks, then a line-of-sight maiden hover with a Remote Pilot in Command present',
    ],
    sampleQuestion: {
      q: 'Before any motor spins on the bench, what must be set and demonstrated with the props off?',
      options: ['Acro mode rates', 'Failsafe on signal loss', 'GPS Position Hold', 'Video transmitter power'],
      correct: 1,
    },
    teacherNote:
      'Includes a signed shop-certificate checklist, a written safety brief that opens every unit, bench and maiden-flight checklists, and a frame-critique rubric. Schools without a 3D printer can receive pre-printed stock frames.',
  },
  {
    id: 'photo',
    status: 'planned' as TrackStatus,
    statusNote:
      'Planned — in development, not yet available. The outline below describes what we intend to build; units and activities may change.',
    href: null,
    icon: FilmIcon,
    badge: 'Creative Track',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    iconColor: 'text-violet-600',
    cardBorder: 'border-violet-200',
    accentBg: 'bg-violet-50',
    titleColor: 'text-violet-800',
    title: 'Drone Video & Photography',
    tagline: 'From flight to final cut — the creative and technical art of aerial media',
    description:
      'Students learn the complete production pipeline: understanding drone cameras and sensors, composing cinematic shots, planning a shoot, and editing professional-quality video in DaVinci Resolve or Adobe Premiere. Equal emphasis on technical skill (camera settings, ND filters, LOG color profiles) and creative vision (composition, lighting, storytelling).',
    forWhom:
      'Built for students interested in media production, journalism, visual arts, film, marketing, and creative entrepreneurship. Connects directly to industry workflows used in real estate, event coverage, documentary, and social media production.',
    unitCount: 10,
    includes: [
      '10 units from safety through export and portfolio',
      'Dedicated unit on aerial still photography and Lightroom',
      '5 units on video editing (DaVinci Resolve and Premiere Pro)',
      'Project-based assessments: a finished edited video deliverable',
      'Teacher rubrics for evaluating composition, technical quality, and editing',
      'Portfolio-ready capstone: showreel and freelancing fundamentals',
    ],
    activities: [
      'Golden hour shoot with shot list — composition exercise',
      'ND filter math: calculate the correct filter for 180° shutter rule',
      'Rough cut challenge: edit 2 minutes from 10 minutes of provided footage',
      'Color grading session: convert flat LOG footage to a finished look',
      'Peer critique: review classmate portfolios using professional criteria',
    ],
    sampleQuestion: {
      q: 'You are shooting at 30fps. Which shutter speed best follows the 180° shutter rule?',
      options: ['1/30s', '1/60s', '1/120s', '1/500s'],
      correct: 1,
    },
    teacherNote:
      'Includes example shot lists and storyboard templates, DaVinci Resolve setup guide for classroom computers, a rubric for grading student-edited videos, and a suggested equipment list for programs at different budget levels.',
  },
  {
    id: 'ai',
    status: 'planned' as TrackStatus,
    statusNote:
      'Planned — in development, not yet available. AI may instead become a second stage of Drone Building — applying reinforcement learning to the drone students build. That direction is not decided yet. The outline below describes the current idea and may change.',
    href: null,
    icon: CpuChipIcon,
    badge: 'STEM Track',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    iconColor: 'text-sky-600',
    cardBorder: 'border-sky-200',
    accentBg: 'bg-sky-50',
    titleColor: 'text-sky-800',
    title: 'AI & Drones',
    tagline: 'Machine learning, computer vision, and autonomous systems — through the lens of flight',
    description:
      'Drones are one of the best hands-on platforms for learning artificial intelligence. Students progress from AI fundamentals (types of machine learning, neural networks, Python) through computer vision, autonomous navigation, and real-world applications — building an original AI-powered drone project as their capstone. Every concept is grounded in working code and physical demonstration.',
    forWhom:
      'Designed for STEM programs, computer science classes, robotics electives, and advanced STEM tracks. Connects to AP Computer Science Principles, Engineering Design, Physics, and Statistics standards. No prior programming experience required to start.',
    unitCount: 9,
    includes: [
      '9 units from AI theory through ethics and careers',
      'Python code examples in every technical unit',
      '3 project tiers: beginner, intermediate, and advanced with evaluation criteria',
      'Working code for color-target landing, object tracking, and hyperlapse',
      'Teacher-facing concept breakdowns for non-CS educators',
      'STEM standards alignment for CS Principles and Next Generation Science Standards',
    ],
    activities: [
      'Train your first image classifier on a collected image dataset (Google Colab)',
      'Program an autonomous Tello mission in Python',
      'Color-target landing project: detect an orange pad and land on it',
      'Build and test a person-following drone using YOLOv8 and OpenCV',
      'Field health map lab: compute NDVI from simulated multispectral images',
    ],
    sampleQuestion: {
      q: 'Which type of machine learning trains a model using labeled input-output pairs?',
      options: [
        'Unsupervised learning',
        'Reinforcement learning',
        'Supervised learning',
        'Transfer learning',
      ],
      correct: 2,
    },
    teacherNote:
      'Includes a Jupyter Notebook starter kit for each hands-on unit, a Python setup guide for school computers, lab worksheets with pre-written scaffolding code, and a project grading rubric adaptable to different grade levels.',
  },
] as const;

const DELIVERY_FEATURES = [
  'Fully async — students work at their own pace within your semester or full-year pacing window',
  'Hybrid-friendly — works in-class and at home on any device',
  'Exams auto-generated per section, unit, or full course from a large question bank',
  'Generate multiple exam versions to prevent answer sharing, or a fixed version for class-wide consistency',
  'Manager dashboard tracks completion and latest exam scores per student',
  'No hardware lock-in — works with any drone your program already flies',
  'Free consultation to build your custom pacing plan',
];

// ── Components ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TrackStatus }) {
  const meta = STATUS_BADGE[status];
  return (
    <span className={`inline-block text-xs font-semibold border px-2.5 py-1 ${meta.cls}`} style={{ borderRadius: '2px' }}>
      {meta.label}
    </span>
  );
}

function TrackCard({ track }: { track: typeof TRACKS[number] }) {
  const Icon = track.icon;
  const planned = track.status === 'planned';
  return (
    <div
      className={`border ${planned ? 'border-dashed border-[#d4d4d4] bg-[#fafafa]' : `${track.cardBorder} bg-white`} p-6 flex flex-col gap-4`}
      style={{ borderRadius: '4px' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`p-2.5 ${track.accentBg} inline-flex ${planned ? 'opacity-60' : ''}`} style={{ borderRadius: '4px' }}>
          <Icon className={`h-5 w-5 ${track.iconColor}`} />
        </div>
        <StatusBadge status={track.status} />
      </div>
      <div>
        <h3 className="text-base font-display font-semibold text-[#171717]">{track.title}</h3>
        <p className="mt-1.5 text-sm text-[#525252] leading-relaxed">{track.tagline}</p>
      </div>
      <p className="text-xs text-[#6b7280] leading-relaxed flex-1">{track.description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
        <span className="text-xs text-[#9ca3af]">
          {track.unitCount} units{planned ? ' (planned)' : ''}
        </span>
        {track.href ? (
          <Link
            href={track.href}
            className={`inline-flex items-center gap-1 min-h-[44px] text-xs font-semibold ${track.iconColor} hover:opacity-80`}
          >
            Join the waitlist
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className={`text-xs font-medium ${track.iconColor}`}>↓ Details below</span>
        )}
      </div>
    </div>
  );
}

function SampleQuestion({ q, options, correct }: { q: string; options: readonly string[]; correct: number }) {
  return (
    <div className="bg-white border border-[#e5e5e5] p-5" style={{ borderRadius: '4px' }}>
      <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">Sample Practice Question</p>
      <p className="text-sm font-medium text-[#171717] mb-4">{q}</p>
      <ul className="space-y-2">
        {options.map((opt, i) => (
          <li key={i} className={`flex items-start gap-2.5 text-sm px-3 py-2 border ${
            i === correct
              ? 'border-[#4a6b2f]/30 bg-[#4a6b2f]/5 text-[#171717]'
              : 'border-[#e5e5e5] text-[#525252]'
          }`} style={{ borderRadius: '2px' }}>
            <span className={`font-mono text-xs mt-0.5 shrink-0 ${i === correct ? 'text-[#4a6b2f] font-bold' : 'text-[#9ca3af]'}`}>
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
            {i === correct && (
              <span className="ml-auto text-xs text-[#4a6b2f] font-semibold shrink-0">✓ Correct</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrackDetail({ track, flip }: { track: typeof TRACKS[number]; flip?: boolean }) {
  const Icon = track.icon;
  return (
    <section className="border-b border-[#e5e5e5]" style={{ background: flip ? '#fafafa' : '#ffffff' }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">

        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-2 ${track.accentBg} inline-flex`} style={{ borderRadius: '4px' }}>
            <Icon className={`h-5 w-5 ${track.iconColor}`} />
          </div>
          <div>
            <span className={`text-xs font-semibold ${track.badgeColor.split(' ')[1]} uppercase tracking-wide`}>
              {track.badge}
            </span>
            <h2 className="text-xl font-display font-semibold text-[#171717]">{track.title}</h2>
          </div>
          <div className="ml-auto">
            <StatusBadge status={track.status} />
          </div>
        </div>

        {track.statusNote && (
          <div
            className={`mb-8 flex items-start gap-3 border px-4 py-3 text-sm ${
              track.status === 'planned'
                ? 'border-dashed border-[#d4d4d4] bg-[#fafafa] text-[#525252]'
                : 'border-sky-200 bg-sky-50 text-[#171717]'
            }`}
            style={{ borderRadius: '4px' }}
          >
            <ClockIcon className="h-5 w-5 shrink-0 text-[#6b7280] mt-0.5" aria-hidden />
            <div>
              <p>{track.statusNote}</p>
              {track.href && (
                <Link
                  href={track.href}
                  className="mt-2 inline-flex items-center gap-1 min-h-[44px] font-semibold text-sky-700 hover:opacity-80"
                >
                  Drone Building early access — join the waitlist
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* For whom */}
            <div>
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <UserGroupIcon className="h-3.5 w-3.5" /> Who It&apos;s For
              </p>
              <p className="text-sm text-[#525252] leading-relaxed">{track.forWhom}</p>
            </div>

            {/* What's included */}
            <div>
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />{' '}
                {track.status === 'available' ? <>What&apos;s Included</> : <>What&apos;s Planned</>}
              </p>
              <ul className="space-y-2">
                {track.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#525252]">
                    <CheckCircleIcon className="h-4 w-4 text-[#4a6b2f] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Teacher note */}
            <div className={`${track.accentBg} border ${track.cardBorder} p-4`} style={{ borderRadius: '4px' }}>
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <DocumentTextIcon className="h-3.5 w-3.5" /> Teacher Resources
              </p>
              <p className="text-sm text-[#525252] leading-relaxed">{track.teacherNote}</p>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Activities */}
            <div>
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <LightBulbIcon className="h-3.5 w-3.5" /> Classroom Activities
              </p>
              <ul className="space-y-2.5">
                {track.activities.map((act, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#525252]">
                    <span className={`text-xs font-bold ${track.iconColor} shrink-0 mt-0.5 font-mono`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {act}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sample question */}
            <SampleQuestion {...track.sampleQuestion} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CurriculumPage() {
  const allCourses = await fetchAllCourses();

  return (
    <div className="font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8] overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Link
                href="/schools"
                className="inline-flex items-center gap-1.5 text-xs text-[#4a6b2f] font-medium hover:opacity-80 mb-6">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back to For Schools
              </Link>
              <span className="block text-xs font-semibold tracking-widest text-[#4a6b2f] uppercase mb-3">
                Curriculum Overview
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[#171717]">
                Part 107 today. Building next.<br />More tracks planned.
              </h1>
              <p className="mt-5 text-base text-[#525252] leading-relaxed">
                FAA Part 107 is available now. Drone Building opens for early access in January 2027. Video &amp; Photography and AI &amp; Drones are planned tracks — in development and not yet available.
              </p>
              <p className="mt-4 text-sm">
                <Link
                  href="/schools/funding"
                  className="text-[#4a6b2f] font-medium underline underline-offset-2 hover:opacity-90 inline-flex items-center gap-1"
                >
                  Funding &amp; grants (PA SMART &amp; STEM/CTE)
                  <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5" style={{ borderRadius: '2px' }}>
                  <AcademicCapIcon className="h-3.5 w-3.5" /> FAA Part 107 — Available now
                </span>
                <Link
                  href="/courses/tracks/building"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 hover:opacity-80"
                  style={{ borderRadius: '2px' }}
                >
                  <WrenchScrewdriverIcon className="h-3.5 w-3.5" /> Drone Building — Early access Jan 2027
                </Link>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#f5f5f5] text-[#525252] border border-dashed border-[#d4d4d4] px-3 py-1.5" style={{ borderRadius: '2px' }}>
                  <FilmIcon className="h-3.5 w-3.5" /> Video &amp; Photography — Planned
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#f5f5f5] text-[#525252] border border-dashed border-[#d4d4d4] px-3 py-1.5" style={{ borderRadius: '2px' }}>
                  <CpuChipIcon className="h-3.5 w-3.5" /> AI &amp; Drones — Planned
                </span>
              </div>
            </div>

            <div className="hidden lg:block relative h-72 overflow-hidden" style={{ borderRadius: '4px' }}>
              <Image
                src="/kid_drone_hands.png"
                alt="Student learning to fly a drone"
                fill
                className="object-cover object-top"
                priority
                sizes="50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How the Tracks Fit Together ────────────────────────────────────── */}
      <section className="bg-white border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-2 mb-3">
            <BeakerIcon className="h-5 w-5 text-[#4a6b2f]" />
            <h2 className="text-xl font-display font-semibold text-[#171717]">How the tracks fit together</h2>
          </div>
          <p className="text-sm text-[#525252] leading-relaxed max-w-2xl mb-10">
            Part 107 is the entry point for every student — it builds the airspace knowledge and safety mindset behind all drone operations.
            Drone Building is the next step (early access January 2027). Video &amp; Photography and AI &amp; Drones are planned and not yet available.
          </p>

          {/* Track pathway diagram */}
          <div className="flex flex-col items-center gap-3">
            {/* Foundation */}
            <div className="w-full max-w-sm bg-amber-50 border border-amber-200 px-6 py-4 text-center" style={{ borderRadius: '4px' }}>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Step 1 — All Students</p>
              <p className="text-base font-display font-semibold text-[#171717]">FAA Part 107 Certification Prep</p>
              <p className="text-xs text-[#6b7280] mt-1">Regulations · Airspace · Weather · Safety · Decision-Making</p>
            </div>

            {/* Arrow */}
            <div className="text-[#d1d5db] text-lg">↓ then</div>

            {/* Step 2 — Drone Building */}
            <Link
              href="/courses/tracks/building"
              className="w-full max-w-sm bg-sky-50 border border-sky-200 px-6 py-4 text-center hover:opacity-90"
              style={{ borderRadius: '4px' }}
            >
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">Step 2 — Early access January 2027</p>
              <p className="text-base font-display font-semibold text-[#171717]">Drone Building</p>
              <p className="text-xs text-[#6b7280] mt-1">Safety · Components · CAD · Assembly · Betaflight · Flight</p>
            </Link>

            {/* Planned tracks */}
            <div className="text-[#d1d5db] text-lg">↓ planned</div>
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="bg-[#fafafa] border border-dashed border-[#d4d4d4] px-5 py-4" style={{ borderRadius: '4px' }}>
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Planned — not yet available</p>
                <p className="text-sm font-display font-semibold text-[#525252]">Video &amp; Photography</p>
                <p className="text-xs text-[#6b7280] mt-1">Camera · Composition · Editing · Portfolio</p>
              </div>
              <div className="bg-[#fafafa] border border-dashed border-[#d4d4d4] px-5 py-4" style={{ borderRadius: '4px' }}>
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Planned — not yet available</p>
                <p className="text-sm font-display font-semibold text-[#525252]">AI &amp; Drones</p>
                <p className="text-xs text-[#6b7280] mt-1">Possibly a second stage of Drone Building: reinforcement learning on the drone you build</p>
              </div>
            </div>
          </div>

          {/* Track overview cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRACKS.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Track Detail Sections (static) ────────────────────────────────── */}
      {TRACKS.map((track, i) => (
        <TrackDetail key={track.id} track={track} flip={i % 2 === 1} />
      ))}

      {/* ── Live Course Catalog (dynamic) ─────────────────────────────────── */}
      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-[#171717]">Live course catalog</h2>
              <p className="text-sm text-[#525252] mt-1">
                {allCourses.length > 0
                  ? `${allCourses.length} course${allCourses.length !== 1 ? 's' : ''} currently available on the platform.`
                  : 'Course catalog is loading. Check back shortly.'}
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#4a6b2f] text-[#4a6b2f] text-sm font-semibold hover:bg-[#4a6b2f] hover:text-white transition-colors"
              style={{ borderRadius: '2px' }}
            >
              View all courses
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {allCourses.length === 0 ? (
            <div className="border border-[#d4e0c8] bg-white/60 p-8 text-center" style={{ borderRadius: '4px' }}>
              <p className="text-sm text-[#6b7280]">Course data unavailable — contact us for a full curriculum overview.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {allCourses.map((course) => {
                // Identify track badge
                const is107 = /107|faa|certif/i.test(course.title);
                const isPhoto = /photo|video|film|cinemat/i.test(course.title);
                const isAI = /ai|artific|machine|drone.*learn|stem/i.test(course.title);
                const trackBadge = is107
                  ? { label: 'All Students', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                  : isPhoto
                  ? { label: 'Creative Track', cls: 'bg-violet-50 text-violet-700 border-violet-200' }
                  : isAI
                  ? { label: 'STEM Track', cls: 'bg-sky-50 text-sky-700 border-sky-200' }
                  : { label: 'Elective', cls: 'bg-[#4a6b2f]/5 text-[#4a6b2f] border-[#4a6b2f]/20' };

                return (
                  <div
                    key={course.id}
                    className="bg-white border border-[#d4e0c8] p-6 sm:p-8"
                    style={{ borderRadius: '4px' }}
                  >
                    {/* Course header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                      <div>
                        <span className={`inline-block text-xs font-semibold border px-2.5 py-1 mb-2 ${trackBadge.cls}`} style={{ borderRadius: '2px' }}>
                          {trackBadge.label}
                        </span>
                        <h3 className="text-base font-display font-semibold text-[#171717]">{course.title}</h3>
                        {course.sub_title && (
                          <p className="text-xs text-[#6b7280] mt-0.5">{course.sub_title}</p>
                        )}
                      </div>
                      <span className="text-xs text-[#4a6b2f] font-medium bg-[#4a6b2f]/8 border border-[#4a6b2f]/20 px-3 py-1.5 shrink-0" style={{ borderRadius: '2px' }}>
                        {course.units?.length ?? 0} units
                      </span>
                    </div>

                    {course.description && (
                      <p className="text-sm text-[#525252] leading-relaxed mb-5 max-w-3xl">{course.description}</p>
                    )}

                    {/* Top-level units */}
                    {course.units && course.units.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">Course Units</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {course.units.map((unit, idx) => (
                            <div
                              key={unit.id}
                              className="flex items-start gap-3 bg-[#fafafa] border border-[#e5e5e5] px-4 py-3"
                              style={{ borderRadius: '2px' }}
                            >
                              <span className="text-xs font-mono font-bold text-[#4a6b2f]/40 shrink-0 mt-0.5">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-[#171717]">{unit.title}</p>
                                {unit.description && (
                                  <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-2 leading-relaxed">
                                    {unit.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Delivery Features ─────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-xl font-display font-semibold text-[#171717] mb-8">
            How the curriculum is delivered
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            {DELIVERY_FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-3 text-sm text-[#525252]">
                <CheckCircleIcon className="h-5 w-5 text-[#4a6b2f] shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#f0f5eb]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-display font-semibold text-[#171717]">
              Ready to bring this into your classroom?
            </h2>
            <p className="text-sm text-[#525252] mt-1">
              We&apos;ll build a custom pacing plan around your program, equipment, and semester schedule.
            </p>
          </div>
          <Link
            href="/consultation"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#4a6b2f] text-white text-sm font-semibold tracking-wide hover:bg-[#3b5526] transition-colors"
            style={{ borderRadius: '2px' }}
          >
            Book a Free Call
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
