'use client';

import { ChevronDoubleDownIcon } from '@heroicons/react/24/solid';

type HeroScrollNextProps = {
  /** Element id to scroll into view (default: home “Course Tracks” section). */
  targetId?: string;
};

export default function HeroScrollNext({ targetId = 'explore' }: HeroScrollNextProps) {
  const scrollToNext = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button
      type="button"
      onClick={scrollToNext}
      aria-label="Scroll to next section"
      className="absolute z-[2] inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-[var(--brand-primary)] text-[var(--brand-black)] shadow-lg shadow-black/15 ring-2 ring-[var(--brand-primary)]/30 hover:opacity-90 active:scale-95 transition-all touch-manipulation ring-focus bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-[calc(1.5rem+env(safe-area-inset-right,0px))]"
    >
      <ChevronDoubleDownIcon className="h-6 w-6" aria-hidden />
    </button>
  );
}
