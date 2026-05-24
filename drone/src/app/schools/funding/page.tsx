import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknotesIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  GlobeAmericasIcon,
  MapPinIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'PA SMART, Federal & State School Grants — Drone Edge for Schools',
  description:
    'Pennsylvania PA SMART (PAsmart) school grants, federal STEM and CTE funding (Perkins, Title), and state-level sources for drone Part 107 programs. Official PA links and grant-language tips—not legal advice.',
  keywords: [
    'PA SMART',
    'PAsmart',
    'Pennsylvania school grants',
    'STEM grants K-12',
    'CTE funding',
    'federal education grants',
    'Perkins V',
    'Title IV STEM',
    'FAA Part 107 school program',
    'drone curriculum funding',
  ],
  openGraph: {
    title: 'PA SMART, Federal & State School Grants — Drone Edge',
    description:
      'PA SMART is Pennsylvania-specific. Federal and other state grants differ by program. Official PA SMART hub, Part 107 + STEM/CTE alignment, and what to verify with your grants office.',
  },
};

const PA_SMART_URL =
  'https://www.pa.gov/agencies/education/programs-and-services/schools/grants-and-funding/school-grants/pasmart';

export default function SchoolsFundingPage() {
  return (
    <div className="font-sans">
      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <Link
            href="/schools"
            className="inline-flex items-center gap-1.5 text-xs text-[#4a6b2f] font-medium hover:opacity-80 mb-6"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to For Schools
          </Link>
          <span className="block text-xs font-semibold tracking-widest text-[#4a6b2f] uppercase mb-3">
            Funding &amp; grants
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[#171717] leading-tight">
            PA SMART, federal, and state funding for drone &amp; STEM programs
          </h1>
          <p className="mt-3 text-sm font-medium text-[#4a6b2f]">
            Pennsylvania · PA SMART / PAsmart · Federal (e.g. Perkins, Title) · Other state programs
          </p>
          <p className="mt-5 text-base text-[#525252] leading-relaxed">
            Schools ask whether Part 107 and applied drone curricula fit <strong className="font-semibold text-[#171717]">PA SMART</strong> in
            Pennsylvania, or <strong className="font-semibold text-[#171717]">federal and other state</strong> STEM and CTE competitions. This page
            spells out those distinctions, links the official PA SMART school-grants hub, and suggests how to describe Drone Edge in
            narratives. It is not legal or accounting advice—your business office and IU (or equivalent) grant staff have the final word.
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-[#e5e5e5]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 text-sm text-[#525252] leading-relaxed" style={{ borderRadius: '4px' }}>
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold text-[#171717]">Disclaimer</p>
              <p className="mt-1">
                Drone Edge does not administer grants and cannot guarantee eligibility or awards. Programs, deadlines, and
                criteria change. Always use the official agency notice and your district&apos;s grants team.
              </p>
            </div>
          </div>

          <article className="space-y-8 text-sm text-[#525252] leading-relaxed">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPinIcon className="h-5 w-5 text-[#4a6b2f]" aria-hidden />
                <h2 className="text-lg font-display font-semibold text-[#171717]">Is it &quot;SmartGrant&quot; or PA SMART?</h2>
              </div>
              <p>
                The Pennsylvania Department of Education promotes PA SMART (often styled PAsmart)—state-directed funding
                connected to STEM, computer science, and career and technical education priorities. It is
                Pennsylvania-specific, not a single national program with the same name.
              </p>
              <p className="mt-4">
                People sometimes say &quot;SmartGrant&quot; when they mean PA SMART or another competitive opportunity.
                When you write a budget narrative, use the exact title from the request for applications (RFA) your
                school is pursuing.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <GlobeAmericasIcon className="h-5 w-5 text-[#4a6b2f]" aria-hidden />
                <h2 className="text-lg font-display font-semibold text-[#171717]">Federal funding (STEM, CTE, workforce)</h2>
              </div>
              <p>
                At the <strong className="font-semibold text-[#171717]">federal</strong> level, districts often explore Perkins V (Career and Technical
                Education), Title funds where allowed for STEM or well-rounded education, and competitive U.S. Department of Education
                programs—each with eligibility, supplement-not-supplant rules, and allowable costs. There is no single national program
                marketed as &quot;PA SMART&quot;; that name is Pennsylvania-specific.
              </p>
              <p className="mt-4">
                Search and narrative keywords that often appear in RFAs include: industry-recognized credential, work-based learning,
                high-demand occupation, and equipment plus professional development. Match the exact terms in your notice.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <BuildingLibraryIcon className="h-5 w-5 text-[#4a6b2f]" aria-hidden />
                <h2 className="text-lg font-display font-semibold text-[#171717]">Other states (non–PA SMART)</h2>
              </div>
              <p>
                Outside Pennsylvania, <strong className="font-semibold text-[#171717]">state education agencies</strong> publish their own STEM, CS, and CTE
                grant competitions under different names. Your intermediate unit, BOCES, regional service center, or state grants calendar is
                the right starting point—PA SMART links on this page apply to Pennsylvania only.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <DocumentMagnifyingGlassIcon className="h-5 w-5 text-[#4a6b2f]" aria-hidden />
                <h2 className="text-lg font-display font-semibold text-[#171717]">Official PA SMART hub</h2>
              </div>
              <p>
                For descriptions, eligibility, and the latest postings, rely on the Commonwealth—not third-party
                summaries. The state&apos;s school grants hub includes the PA SMART entry point:
              </p>
              <p className="mt-4">
                <a
                  href={PA_SMART_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#4a6b2f] font-semibold underline underline-offset-2 hover:opacity-90"
                >
                  Pennsylvania school grants — PA SMART (pa.gov)
                  <ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden />
                </a>
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <BanknotesIcon className="h-5 w-5 text-[#4a6b2f]" aria-hidden />
                <h2 className="text-lg font-display font-semibold text-[#171717]">Why drone + Part 107 is a familiar grant story</h2>
              </div>
              <p>
                Reviewers for STEM/CTE-oriented competitions often look for industry-recognized credentials, applied
                learning, and clear workforce relevance. The FAA Remote Pilot Certificate (Part 107) is a federal
                credential; pairing it with structured flight application, media production, or career-pathway
                capstones matches the way many districts already describe funded UAS pathways—as long as your proposal
                follows that year&apos;s scoring rubric and allowable costs.
              </p>
              <p className="mt-4">
                Drone Edge supplies the instructional backbone: ACS-aligned Part 107 prep, practice exams, optional video
                and AI tracks, and org-level progress reporting. You still map those pieces to the outcomes and
                partnerships your funder asks for (employer letters, equity goals, evaluation, equipment vs. curriculum
                split, etc.).
              </p>
            </div>

            <div className="border border-[#e5e5e5] bg-[#fafafa] p-5 space-y-3" style={{ borderRadius: '4px' }}>
              <h3 className="text-base font-display font-semibold text-[#171717]">Practical next steps</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Share this page and the official PA link with your curriculum lead and grants coordinator.</li>
                <li>Align vocabulary in your narrative to the RFA: credential names, course hours, equipment, and evaluation.</li>
                <li>Book a consultation if you want help describing how Drone Edge courses fit your program design.</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-[#f0f5eb] border-b border-[#d4e0c8]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-display font-semibold text-[#171717]">Need help framing your program?</h2>
            <p className="text-sm text-[#525252] mt-1 max-w-md">
              We can walk through tracks, seat counts, and how schools describe certification outcomes—separate from any
              grant decision.
            </p>
          </div>
          <Link
            href="/consultation"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#4a6b2f] text-white text-sm font-semibold tracking-wide hover:bg-[#3b5526] transition-colors"
            style={{ borderRadius: '2px' }}
          >
            Book a consultation
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs text-[#737373]">
            <Link href="/schools/curriculum" className="text-[#4a6b2f] font-medium underline underline-offset-2 hover:opacity-90">
              Curriculum overview
            </Link>
            <span className="mx-2">·</span>
            <Link href="/schools" className="text-[#4a6b2f] font-medium underline underline-offset-2 hover:opacity-90">
              For Schools home
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
