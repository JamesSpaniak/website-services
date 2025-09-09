'use client';

import NextImage, { ImageProps as NextImageProps } from 'next/image';

interface ImageComponentProps extends Omit<NextImageProps, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
}

export default function ImageComponent({ src, alt, fallbackSrc = '/about-placeholder.jpg', ...props }: ImageComponentProps) {
  const imageSrc = src || fallbackSrc;

  return (
    <NextImage
      src={imageSrc}
      alt={alt}
      {...props}
    />
  );
}