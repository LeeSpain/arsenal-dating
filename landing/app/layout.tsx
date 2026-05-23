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

export const metadata: Metadata = {
  title: 'Arsenal Dating — Built by a Gooner, for Gooners',
  description:
    'A dating and community app for Arsenal supporters worldwide. Coming soon — join the waitlist.',
  metadataBase: new URL('https://arsenaldating.com'),
  openGraph: {
    title: 'Arsenal Dating — Built by a Gooner, for Gooners',
    description: 'Meet fellow Arsenal obsessives. Coming soon — be first in when we launch.',
    url: 'https://arsenaldating.com',
    siteName: 'Arsenal Dating',
    type: 'website',
  },
  robots: { index: true, follow: true },
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
