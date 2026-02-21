import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderComponent from "./ui/components/header";
import { AuthProvider } from "./lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedroneedge.com';
const SITE_NAME = 'Drone Training Pro';
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
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — FAA Certification & Drone Education`,
    description: DEFAULT_DESCRIPTION,
    images: ['/og-default.png'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
            <div className="flex flex-col min-h-screen">
                <HeaderComponent />
                <main className="flex-grow">{children}</main>
            </div>
        </AuthProvider>
      </body>
    </html>
  );
}
