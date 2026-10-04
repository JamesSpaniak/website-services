import type { NextConfig } from "next";

const nextConfig = {
    compiler: {
      removeConsole: false,
    },
    trailingSlash: false,
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'media.thedroneedge.com',
          port: '',
          pathname: '/**',
        },
      ],
    },
    // Shadowed by next.config.mjs (Next loads .mjs first) — keep in sync.
    async redirects() {
      return [
        { source: '/courses/tracks/video', destination: '/courses', permanent: true },
        { source: '/courses/tracks/ai', destination: '/courses', permanent: true },
      ];
    },
  };

export default nextConfig;
