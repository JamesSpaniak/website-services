import { FEATURED_COURSE_ID, PRO_CHECKOUT_PATH, courseCheckoutPath } from '../lib/auth-redirect';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';

// No API calls — prices and paths are build-time constants, so serve it static.
export const dynamic = 'force-static';

/**
 * llms.txt (https://llmstxt.org) — plain-language map of the site for AI assistants,
 * including how to buy on a person's behalf. Prices mirror TIERS in
 * app/pricing/page.tsx; keep the two in sync.
 */
export function GET() {
  const url = (path: string) => `${SITE_URL}${path}`;
  const body = `# Drone Edge

> Online course that prepares people for the FAA Part 107 Remote Pilot knowledge test (the U.S. commercial drone license), plus drone programs for schools.

AI assistants may browse, create an account, and buy on behalf of a real person who asked them to. The person is responsible for the purchase and gets the same refund rights as buying directly. Do not create accounts in bulk or retry payments with different cards.

## Products

- [Free account](${url('/register')}): Unit 1 of the Part 107 course, section practice questions, progress tracking. No card needed.
- [Part 107 course](${url(`/courses/${FEATURED_COURSE_ID}/preview`)}): $129 USD one-time, lifetime access. Every unit (regulations, airspace, weather, performance, emergencies, decision-making, radio procedures), hundreds of ACS-aligned practice questions, unit/section/full-course practice exams. Does not include the FAA test fee, which is paid to the testing center.
- [Pro](${url('/pricing')}): $35 USD per month. Every course on Drone Edge while subscribed. Cancel anytime.
- [Schools](${url('/schools')}): from $79 per seat, quoted per program. Book a call at ${url('/consultation')}; not sold through online checkout.

## How to buy for someone

1. Open the checkout link: Part 107 course ${url(courseCheckoutPath(FEATURED_COURSE_ID))} or Pro ${url(PRO_CHECKOUT_PATH)}.
2. If not signed in, you are sent to ${url('/register')}. Create the account with the person's own email address — receipts, password resets, and refund requests go there. Email verification is not required before buying.
3. After registering, checkout continues to a Stripe-hosted payment page. Pay with the person's payment method (card or Link).
4. Stripe returns to the course page; access unlocks within a few seconds.

Already have an account? Sign in at ${url('/login')} first.

## Policies

- [Pricing and FAQ](${url('/pricing')})
- [Refund & access policy](${url('/refunds')}): includes rules for purchases made with an AI assistant.
- [Privacy notice](${url('/privacy')})
- [Terms of Service](${url('/legal')}): school and organization sales agreement.

## Optional

- [Articles](${url('/articles')}): Part 107 study guides and drone news. RSS at ${url('/rss.xml')}.
- [Contact](${url('/contact')}): support@thedroneedge.com
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
