import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';

import './globals.css';

// Fonts per DESIGN.md — Inter for body, Archivo (extrabold) for display + hero.
// Wired the proper web way via next/font.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const SITE_URL = 'https://arsenaldating.com';
const TITLE = 'Arsenal Dating — Built by a Gooner, for Gooners';
const DESCRIPTION =
  'A dating and community app for Arsenal supporters worldwide. An independent fan project — not affiliated with Arsenal Football Club. Coming soon — join the waitlist.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: 'Arsenal Dating',
  authors: [{ name: 'Arsenal Dating' }],
  keywords: ['Arsenal', 'Gooners', 'dating', 'football', 'community', 'fan project'],
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Arsenal Dating',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Arsenal Dating — Built by a Gooner, for Gooners',
      },
    ],
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.jpg'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: '#0E0F12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${archivo.variable}`}
    >
      <body className="bg-bg text-text font-sans antialiased">{children}</body>
    </html>
  );
}
