'use client';

import NextImage, { ImageProps as NextImageProps } from 'next/image';

interface ImageComponentProps extends Omit<NextImageProps, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
}

export default function ImageComponent({ src, alt, fallbackSrc = '/about-placeholder.svg', ...props }: ImageComponentProps) {
  const imageSrc = src || fallbackSrc;
  const isExternal = imageSrc.startsWith('http');
  const isSvg = imageSrc.endsWith('.svg');

  return (
    <NextImage
      src={imageSrc}
      alt={alt}
      unoptimized={props.unoptimized ?? (isSvg || isExternal)}
      {...props}
    />
  );
}