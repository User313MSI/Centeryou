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
    title: 'Centeryou',
  },
};

export const viewport: Viewport = {
  themeColor: colors.primary,
  width: 'device-width',
  initialScale: 1,
  // encoche / barre système : le contenu s'étend sous la barre d'état (géré via env(safe-area-inset-*))
  viewportFit: 'cover',
  // clavier mobile : la fenêtre se redimensionne à l'ouverture du clavier, aucun champ n'est jamais masqué
  interactiveWidget: 'resizes-content',
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
