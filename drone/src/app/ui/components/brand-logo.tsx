'use client';

import Image from 'next/image';
import { useTheme } from '@/app/lib/theme-context';

type BrandLogoProps = {
  /** Header bar: compact icon on small screens. Home hero: larger icon on small screens. */
  variant?: 'header' | 'hero';
};

export const BRAND_MARK_SRC = '/brand-mark.svg';

/**
 * Compact mark (`/brand-mark.svg`) below `md` (768px); wordmark (`/logo.svg`) from `md` up — same breakpoint as the header nav.
 * Use `/brand-mark.svg` (not `/icon.svg`) so requests don’t collide with `app/icon.svg` (Next.js metadata/favicon).
 */
export default function BrandLogo({ variant = 'header' }: BrandLogoProps) {
  const { resolved } = useTheme();
  const invert = resolved === 'dark' ? 'invert' : '';

  if (variant === 'hero') {
    return (
      <span className="inline-flex min-w-0 max-w-full items-center justify-start leading-none">
        <Image
          src={BRAND_MARK_SRC}
          alt=""
          width={56}
          height={56}
          unoptimized
          className={`block h-14 w-14 shrink-0 object-contain object-left md:hidden opacity-95 ${invert}`}
          decoding="async"
        />
        <Image
          src="/logo.svg"
          alt=""
          width={240}
          height={40}
          unoptimized
          className={`hidden md:block h-10 w-auto max-w-full min-w-0 object-contain object-left opacity-95 ${invert}`}
          style={{ width: 'auto' }}
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center justify-start leading-none">
      <Image
        src={BRAND_MARK_SRC}
        alt=""
        width={32}
        height={32}
        unoptimized
        className={`block h-8 w-8 shrink-0 object-contain object-left md:hidden opacity-90 ${invert}`}
        decoding="async"
      />
      <Image
        src="/logo.svg"
        alt=""
        width={200}
        height={32}
        unoptimized
        className={`hidden md:block h-8 w-auto max-w-full min-w-0 object-contain object-left opacity-90 ${invert}`}
        style={{ width: 'auto' }}
        decoding="async"
      />
    </span>
  );
}
