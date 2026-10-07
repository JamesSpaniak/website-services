import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';

/**
 * Agents that fetch a page because a person asked them to (not training crawlers).
 * They may browse courses, register, and buy on that person's behalf — see the
 * "Buying with an AI assistant" section on /refunds and /llms.txt.
 */
const USER_AGENT_FETCHERS = ['ChatGPT-User', 'Claude-User', 'Perplexity-User'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: USER_AGENT_FETCHERS,
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/manager/',
          '/profile',
          '/settings',
          '/forgot-password',
          '/reset-password',
          '/reset-code',
          '/verify-email',
          '/unsubscribe',
        ],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/manager/',
          '/login',
          '/register',
          '/profile',
          '/settings',
          '/forgot-password',
          '/reset-password',
          '/reset-code',
          '/verify-email',
          '/unsubscribe',
        ],
      },
      {
        userAgent: 'GPTBot',
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
