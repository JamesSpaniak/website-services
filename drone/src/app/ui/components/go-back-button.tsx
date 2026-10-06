'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/** Browser back when this tab has history on our site; otherwise home. */
export default function GoBackButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const goBack = () => {
    const cameFromHere =
      typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin);
    if (cameFromHere && window.history.length > 1) router.back();
    else router.push('/');
  };
  return (
    <button
      type="button"
      onClick={goBack}
      className={`inline-flex items-center gap-2 min-h-[44px] px-5 text-sm font-semibold tracking-wide bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 transition-opacity ${className}`}
      style={{ borderRadius: 'var(--radius-sm)' }}
    >
      <ArrowLeftIcon className="h-4 w-4" aria-hidden />
      Go back
    </button>
  );
}
