/**
 * Default Part 107 course used for home/login conversion CTAs.
 * Course ids differ per environment (1 on a fresh local DB, 35 in prod), so
 * the id is inlined at build time from NEXT_PUBLIC_FEATURED_COURSE_ID
 * (see drone/Dockerfile and pipeline.sh).
 */
export const FEATURED_COURSE_ID = Number(process.env.NEXT_PUBLIC_FEATURED_COURSE_ID) || 1;

/** Query param — opens Stripe checkout when the user lands on a course page. */
export const PURCHASE_QUERY = 'purchase';

/** Query param — section to auto-expand and scroll to on a unit page. */
export const FOCUS_QUERY = 'focus';

export function unitPath(courseId: number, unitId: string, focusUnitId?: string | null): string {
  const base = `/courses/${courseId}/units/${encodeURIComponent(unitId)}`;
  return focusUnitId ? `${base}?${FOCUS_QUERY}=${encodeURIComponent(focusUnitId)}` : base;
}

const SAFE_REDIRECT = /^\/(?!\/)[^\\]*$/;

/** Validates same-origin relative paths only (blocks open redirects). */
export function sanitizeRedirect(path: string | null | undefined): string | null {
  if (!path || !SAFE_REDIRECT.test(path)) return null;
  return path;
}

export function coursePath(courseId: number, purchase = false): string {
  const base = `/courses/${courseId}`;
  return purchase ? `${base}?${PURCHASE_QUERY}=1` : base;
}

export function coursePreviewPath(courseId: number, purchase = false): string {
  const base = `/courses/${courseId}/preview`;
  return purchase ? `${base}#purchase` : base;
}

export function loginHref(redirect: string): string {
  return `/login?redirect=${encodeURIComponent(redirect)}`;
}

export function registerHref(redirect: string): string {
  return `/register?redirect=${encodeURIComponent(redirect)}`;
}

/** Persist redirect across email verification (verify page has no redirect param). */
export function stashPostAuthRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  const safe = sanitizeRedirect(path);
  if (safe) sessionStorage.setItem('postAuthRedirect', safe);
}

export function readStashedPostAuthRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  return sanitizeRedirect(sessionStorage.getItem('postAuthRedirect'));
}

export function clearStashedPostAuthRedirect(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('postAuthRedirect');
}

export function redirectIndicatesPurchase(redirect: string | null | undefined): boolean {
  if (!redirect) return false;
  try {
    const url = new URL(redirect, 'http://local');
    return url.searchParams.get(PURCHASE_QUERY) === '1';
  } catch {
    return redirect.includes(`${PURCHASE_QUERY}=1`);
  }
}
