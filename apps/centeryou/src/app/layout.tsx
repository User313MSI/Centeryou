import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { categoryColors, colors, darkColors, darkShadows, hexToRgbTriplet, shadows, themeCssVars } from '../../design/tokens';
import { AppShell } from '../components/layout/app-shell';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SLOGAN } from '../lib/site';
import { themeInitScript } from '../lib/theme-init';
import './globals.css';

const catVars = Object.entries(categoryColors)
  .map(([k, v]) => `--c-cat-${k}: ${hexToRgbTriplet(v)};`)
  .join(' ');

/** variables CSS des deux thèmes, produites depuis design/tokens.ts (source unique) */
const themeStyle = `:root{${themeCssVars(colors, shadows)} ${catVars}}.dark{color-scheme:dark;${themeCssVars(darkColors, darkShadows)} ${catVars}}`;

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — ${SLOGAN}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: `${SITE_DESCRIPTION} Sauvegarde en ligne optionnelle avec un compte.`,
  keywords: [
    'planning',
    'agenda',
    'organisation',
    'tâches',
    'tâches à faire',
    'assistant vocal',
    'français',
    '100 % local',
    'vie privée',
    'Centeryou',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  category: 'productivité',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SLOGAN} (logo sur fond #FAFAFC)`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  themeColor: colors.primary,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Nonce CSP généré par src/middleware.ts (posé sur l'en-tête de requête x-nonce) :
  // il signe le script inline anti-flash ci-dessous. Next.js signe de la même façon
  // ses propres scripts inline grâce à l'en-tête Content-Security-Policy de la requête.
  const nonce = headers().get('x-nonce') ?? undefined;
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <body>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
