import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '../ui/components/page-shell';

export const metadata: Metadata = {
  title: 'Privacy Notice',
  description:
    'How Drone Edge collects, uses, and protects information for visitors, account holders, and school programs. Read alongside our Terms of Service.',
  openGraph: {
    title: 'Privacy Notice — Drone Edge',
    description: 'Privacy practices for the Drone Edge website and educational offerings.',
  },
};

/** Keep in sync with §10 of Sales Agreement and docs/tech/legal-and-privacy-site-sync.md */
const PRIVACY_LAST_UPDATED = '2026-09-12';

export default function PrivacyPage() {
  return (
    <PageShell maxWidthClass="max-w-3xl" title="Privacy Notice" subtitle="Drone Edge — website and services">
      <p className="text-xs text-[var(--brand-muted)] mb-8">Last updated: {PRIVACY_LAST_UPDATED}</p>

      <div className="mb-8 rounded-md border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-sm text-[var(--brand-muted)] leading-relaxed">
        <p>
          This Privacy Notice describes how Drone Edge (&quot;we,&quot; &quot;us&quot;) handles personal information in
          connection with our website and digital offerings. It is published at the URL referenced in our Sales Agreement
          (see also our{' '}
          <Link href="/legal" className="text-[var(--brand-primary)] underline underline-offset-2">
            Terms of Service
          </Link>
          ). This Notice is a general description of our practices; your school or organization may have additional
          obligations under contract or law.
        </p>
      </div>

      <article className="space-y-8 text-sm text-[var(--brand-muted)] leading-relaxed">
        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            1. Who this applies to
          </h2>
          <p>
            This Notice applies to visitors to thedroneedge.com, users who create accounts, students and educators who
            access courses through a school or organization, and individuals who contact us or book consultations.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            2. Information we collect
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-[var(--brand-foreground)]">Account and profile data:</strong> such as name,
              email address, username, and organization affiliation when you register or are invited to an organization.
            </li>
            <li>
              <strong className="text-[var(--brand-foreground)]">Usage and technical data:</strong> such as device type,
              browser, approximate location derived from IP, pages viewed, and interactions with the platform. As described
              in our Terms of Service, we may use configuration, performance, security, and usage information to operate
              and improve the service, including in aggregated or de-identified form where permitted.
            </li>
            <li>
              <strong className="text-[var(--brand-foreground)]">Payment data:</strong> payments are processed by our
              payment provider; we do not store full payment card numbers on our servers.
            </li>
            <li>
              <strong className="text-[var(--brand-foreground)]">Communications:</strong> content you send through contact
              forms, email, or support channels.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            3. How we use information
          </h2>
          <p>We use personal information to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Provide, secure, and improve the Offerings;</li>
            <li>Authenticate users, manage organizations, and track progress as described in the product;</li>
            <li>Communicate about the service, respond to inquiries, and send transactional messages;</li>
            <li>Comply with law and enforce our agreements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            4. Schools, COPPA, and student data
          </h2>
          <p>
            Where a school or district is the customer, the school is often responsible for consent and authority for
            student data under applicable laws (including FERPA) and under our Sales Agreement. Where we collect personal
            information from children under 13 in an educational context, we rely on the school&apos;s consent and
            direction for use limited to educational purposes that benefit the school and not for unrelated commercial
            purposes, consistent with the Sales Agreement.
          </p>
          <p className="mt-3">
            If you access courses through a school or organization, that organization&apos;s designated administrators
            and teachers can see your enrollment, lesson progress, video completion, exam results, and recent activity in
            the courses they provide. We do not use organization members&apos; activity for marketing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            5. Sharing and subprocessors
          </h2>
          <p>
            We may share information with service providers who assist us (for example hosting, email delivery, analytics,
            or payment processing) under contractual safeguards. We may disclose information if required by law or to
            protect rights and safety.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            6. Cookies and analytics
          </h2>
          <p>
            We use cookies and similar technologies for session management (sign-in) and preferences. You can control
            cookies through your browser settings; blocking the session cookie will prevent sign-in.
          </p>
          <p className="mt-3">
            <strong className="text-[var(--brand-foreground)]">First-party analytics.</strong> We measure how the website
            and courses are used with our own analytics, stored on our servers. To understand which pages lead visitors to
            create an account, we store a random identifier in your browser&apos;s local storage (it is not derived from
            your device, name, or email). Before you sign in it is linked only to page views of articles, course
            overviews, and pricing. If you later create an account, that identifier is associated with your account so we
            can see the path that led to sign-up. It is not created for members of school or organization programs, is
            never sold or shared with advertisers, and is removed when you clear your browser&apos;s site data.
          </p>
          <p className="mt-3">
            We do not currently use third-party advertising pixels or cross-site tracking. If that changes, we will update
            this Notice and, where required, ask for your consent first. We also collect aggregate, non-identifying
            operational metrics (request counts, response times, error rates) to keep the service running.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">7. Retention</h2>
          <p>
            We retain information for as long as needed to provide the service, meet legal obligations, resolve disputes,
            and enforce our agreements. Account and course-progress records are kept while your account exists. Detailed
            activity records (individual page views, video heartbeats, and similar events) are kept in our active systems
            for approximately 12 months, after which only aggregated summaries remain available in the product. When an
            account is deleted at your request, its progress, exam, and activity records are deleted with it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">8. Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect personal information. No method of
            transmission over the Internet is completely secure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">9. Your choices</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or restrict certain processing of
            your personal information. Contact us at{' '}
            <a href="mailto:james@thedroneedge.com" className="text-[var(--brand-primary)] underline underline-offset-2">
              james@thedroneedge.com
            </a>{' '}
            to make a request. We may need to verify your identity before responding.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">
            10. Changes to this Notice
          </h2>
          <p>
            We may update this Notice from time to time. We will post the updated version on this page and revise the
            &quot;Last updated&quot; date. Material changes may be communicated through the service or by email where
            appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-base font-display font-semibold text-[var(--brand-foreground)] mb-3">11. Contact</h2>
          <p>
            Questions about this Notice:{' '}
            <a href="mailto:james@thedroneedge.com" className="text-[var(--brand-primary)] underline underline-offset-2">
              james@thedroneedge.com
            </a>
          </p>
        </section>
      </article>
    </PageShell>
  );
}
