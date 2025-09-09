import type { NextConfig } from "next";

const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'd123abcde.cloudfront.net', // <-- Your CloudFront distribution hostname
          port: '',
          pathname: '/**',
        },
        {
            protocol: 'https',
            hostname: 'your-bucket-name.s3.your-region.amazonaws.com',
            port: '',
            pathname: '/**', // This allows any image path within your bucket
          },
      ],
    },
    video: [
        {
            protocol: 'https',
            hostname: 'd123abcde.cloudfront.net', // <-- Your CloudFront distribution hostname
            port: '',
            pathname: '/**',
          },
          {
              protocol: 'https',
              hostname: 'your-bucket-name.s3.your-region.amazonaws.com',
              port: '',
              pathname: '/**', // This allows any image path within your bucket
            },
    ]
  };

export default nextConfig;
