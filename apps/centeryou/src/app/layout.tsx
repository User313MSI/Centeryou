import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { colors } from '../../design/tokens';
import { AppShell } from '../components/layout/app-shell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Centeryou — ton planning, ta voix',
  description:
    "Agenda, tâches et assistant vocal personnel, 100 % en français. Données locales uniquement.",
  manifest: '/manifest.webmanifest',
  icons: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Centeryou',
  },
};

export const viewport: Viewport = {
  themeColor: colors.primary,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
