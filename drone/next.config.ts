import type { NextConfig } from "next";

const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https', // Your CloudFront distribution hostname
          hostname: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'localhost',
          port: '',
          pathname: '/**',
        },
      ],
    },
  };

export default nextConfig;
