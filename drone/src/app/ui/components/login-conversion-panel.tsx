import Link from 'next/link';
import {
  coursePreviewPath,
  FEATURED_COURSE_ID,
  loginHref,
  redirectIndicatesPurchase,
  registerHref,
  sanitizeRedirect,
} from '@/app/lib/auth-redirect';

interface LoginConversionPanelProps {
  redirect?: string;
  /** Default Part 107 course id for generic CTAs when redirect is absent. */
  featuredCourseId?: number;
}

export default function LoginConversionPanel({
  redirect,
  featuredCourseId = FEATURED_COURSE_ID,
}: LoginConversionPanelProps) {
  const safeRedirect = sanitizeRedirect(redirect ?? null);
  const purchaseIntent = redirectIndicatesPurchase(safeRedirect);
  const previewHref = coursePreviewPath(featuredCourseId);
  const tryFreeHref = registerHref(`/courses/${featuredCourseId}`);
  const purchaseHref = registerHref(`/courses/${featuredCourseId}?purchase=1`);

  return (
    <aside
      className="p-6 sm:p-8 border border-[var(--surface-border)] bg-[var(--surface)] h-fit"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      {purchaseIntent && safeRedirect ? (
        <>
          <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase mb-2">
            Complete your purchase
          </p>
          <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)]">
            Sign in to unlock the course
          </h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed">
            Payment is tied to your account. Sign in after checkout, or create an account first — then
            we&apos;ll take you straight to secure checkout.
          </p>
          <Link
            href={registerHref(safeRedirect)}
            className="mt-5 flex w-full items-center justify-center min-h-[44px] px-4 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Create account &amp; checkout
          </Link>
        </>
      ) : (
        <>
          <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase mb-2">
            FAA Part 107 prep
          </p>
          <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)]">
            Start with Unit 1 free
          </h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed">
            Create a free account to preview Unit 1, track progress, and try practice questions.
            Full course access is a one-time $129 purchase.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={tryFreeHref}
              className="flex w-full items-center justify-center min-h-[44px] px-4 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Create free account
            </Link>
            <Link
              href={purchaseHref}
              className="flex w-full items-center justify-center min-h-[44px] px-4 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--background)] transition-colors"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Purchase full course — $129
            </Link>
          </div>
        </>
      )}

      <ul className="mt-6 space-y-2 text-sm text-[var(--brand-muted)]">
        <li>· Unit 1 free — no credit card</li>
        <li>· Lifetime access after purchase</li>
        <li>· Practice exams included</li>
      </ul>

      <Link
        href={previewHref}
        className="mt-5 inline-block text-sm text-[var(--brand-primary)] hover:opacity-90"
      >
        Browse course details →
      </Link>
      {!purchaseIntent && safeRedirect && (
        <p className="mt-4 text-xs text-[var(--brand-muted)]">
          After sign-in you&apos;ll return to your course.
          {' '}
          <Link href={loginHref(safeRedirect)} className="text-[var(--brand-primary)]">
            Already have an account?
          </Link>
        </p>
      )}
    </aside>
  );
}
