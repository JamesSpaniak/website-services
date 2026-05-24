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
};

export default nextConfig;
