import { SITE_ASSETS } from '@/app/lib/site-assets';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';
const SITE_NAME = 'Drone Edge';

/** Square brand mark for Organization / publisher logos (Google-friendly minimum size when rendered from SVG). */
const ORG_LOGO_URL = `${SITE_URL}${SITE_ASSETS.brandMark}`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: ORG_LOGO_URL,
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/articles?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function articleJsonLd(article: {
  title: string;
  sub_heading: string;
  submitted_at: string | Date;
  updated_at?: string | Date;
  image_url?: string;
  id: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.sub_heading,
    datePublished: new Date(article.submitted_at).toISOString(),
    ...(article.updated_at && { dateModified: new Date(article.updated_at).toISOString() }),
    ...(article.image_url && { image: [article.image_url] }),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: ORG_LOGO_URL,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${article.id}`,
    },
  };
}

export function courseJsonLd(course: {
  title: string;
  sub_title?: string;
  description?: string;
  price?: number;
  images_url?: string[];
  image_url?: string;
  video_url?: string;
  id: number;
}) {
  const primaryImage =
    course.images_url?.find(Boolean) || course.image_url;
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description || course.sub_title || course.title,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(primaryImage && { image: primaryImage }),
    ...(course.video_url && {
      video: {
        '@type': 'VideoObject',
        contentUrl: course.video_url,
      },
    }),
    ...(course.price !== undefined && {
      offers: {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
    url: `${SITE_URL}/courses/${course.id}`,
  };
}
