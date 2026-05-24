import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./font-imports.css";
import "./globals.css";
import HeaderComponent from "./ui/components/header";
import FooterComponent from "./ui/components/footer";
import PageAnalytics from "./ui/components/page-analytics";
import { AuthProvider } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-context";
import { SITE_ASSETS, THEME_COLOR } from "./lib/site-assets";

/** Canonical site origin (apex). www redirects here via middleware. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';
const SITE_NAME = 'Drone Edge';
const DEFAULT_DESCRIPTION = 'Master drone regulations, earn your FAA Part 107 certification, and stay current with the latest in drone technology through expert-led courses and articles.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — FAA Certification & Drone Education`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ['drone', 'FAA Part 107', 'drone certification', 'drone training', 'UAS', 'remote pilot', 'drone courses', 'drone technology'],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — FAA Certification & Drone Education`,
    description: DEFAULT_DESCRIPTION,
    /* og:image / twitter:image: `app/opengraph-image.tsx` + `app/twitter-image.tsx` */
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — FAA Certification & Drone Education`,
    description: DEFAULT_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: SITE_ASSETS.iconPng, type: 'image/png', sizes: 'any' },
      { url: SITE_ASSETS.favicon, type: 'image/svg+xml' },
      { url: SITE_ASSETS.brandMark, type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: [{ url: SITE_ASSETS.iconPng, sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    // google: 'your-google-verification-code',  // Add after setting up Google Search Console
    // yandex: 'your-yandex-verification-code',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLOR.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased">
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            async
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL || 'http://localhost:3001'}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
        <ThemeProvider>
          <AuthProvider>
            <PageAnalytics />
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <div className="relative z-10 flex min-h-screen flex-col">
              <HeaderComponent />
              <main
                id="main-content"
                tabIndex={-1}
                className="flex-grow outline-none"
              >
                {children}
              </main>
              <FooterComponent />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
