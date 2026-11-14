import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { categoryColors, colors, darkColors, darkShadows, hexToRgbTriplet, shadows, themeCssVars } from '../../design/tokens';
import { AppShell } from '../components/layout/app-shell';
import './globals.css';

const catVars = Object.entries(categoryColors)
  .map(([k, v]) => `--c-cat-${k}: ${hexToRgbTriplet(v)};`)
  .join(' ');

/** variables CSS des deux thèmes, produites depuis design/tokens.ts (source unique) */
const themeStyle = `:root{${themeCssVars(colors, shadows)} ${catVars}}.dark{color-scheme:dark;${themeCssVars(darkColors, darkShadows)} ${catVars}}`;

/**
 * Anti-flash : applique la classe .dark avant le premier rendu si le thème
 * sombre est mémorisé dans le localStorage (même clé que le store Zustand).
 */
const themeInitScript = `(function(){try{var d=localStorage.getItem('centeryou-v1');if(!d)return;var s=JSON.parse(d);var t=s&&s.state&&s.state.settings&&s.state.settings.theme;if(t==='sombre'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

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
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
