/** @type {import('next').NextConfig} */
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
  // Root is app/page.tsx (re-exports home); no rewrite needed
  // Retired "coming soon" track stubs (W1) — keep old links working.
  async redirects() {
    return [
      { source: '/courses/tracks/video', destination: '/courses', permanent: true },
      { source: '/courses/tracks/ai', destination: '/courses', permanent: true },
    ];
  },
};

export default nextConfig;
