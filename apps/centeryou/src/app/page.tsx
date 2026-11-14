import type { Metadata } from 'next';
import { HomeGate } from '../components/landing/home-gate';
import { SITE_DESCRIPTION, SLOGAN } from '../lib/site';

export const metadata: Metadata = {
  title: `Accueil — ${SLOGAN}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: `Centeryou — ${SLOGAN}`,
    description: SITE_DESCRIPTION,
    url: '/',
  },
};

export default function HomePage() {
  return <HomeGate />;
}
