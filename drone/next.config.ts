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
  };

export default nextConfig;
