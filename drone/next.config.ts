import type { NextConfig } from "next";

const nextConfig = {
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
