import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/articles', '/articles/', '/courses', '/about', '/contact'],
        disallow: ['/api/', '/admin/', '/login', '/profile', '/settings', '/forgot-password', '/reset-password', '/verify-email'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/articles/', '/about', '/contact'],
        disallow: ['/courses/', '/api/', '/admin/', '/login', '/profile', '/settings'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/articles/', '/about', '/contact'],
        disallow: ['/courses/', '/api/', '/admin/', '/login', '/profile', '/settings'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/articles/', '/about', '/contact'],
        disallow: ['/courses/', '/api/', '/admin/', '/login', '/profile', '/settings'],
      },
      {
        userAgent: 'CCBot',
        allow: ['/', '/articles/', '/about', '/contact'],
        disallow: ['/courses/', '/api/', '/admin/', '/login', '/profile', '/settings'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/articles/', '/about', '/contact'],
        disallow: ['/courses/', '/api/', '/admin/', '/login', '/profile', '/settings'],
      },
      {
        userAgent: 'Bytespider',
        disallow: ['/'],
      },
      {
        userAgent: 'Applebot-Extended',
        allow: ['/', '/articles/', '/about', '/contact'],
        disallow: ['/courses/', '/api/', '/admin/', '/login', '/profile', '/settings'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
