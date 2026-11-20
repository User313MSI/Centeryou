import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import { colors } from '../../../design/tokens';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { SLOGAN, SITE_NAME } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Presse — fiche de presse',
  description:
    'Fiche de presse de Centeryou : description, slogan, logo et visuels à télécharger, et démo en ligne. Planning personnel en français, à la voix, 100 % local.',
  alternates: { canonical: '/presse' },
  openGraph: {
    title: `Presse — ${SITE_NAME}`,
    description: 'Ressources presse de Centeryou : logo, image de partage 1200×630, slogan et démo en ligne.',
    url: '/presse',
  },
};

const POINTS = [
  'Le mobile d’abord : ajoute, coche et déplace en deux gestes, installable en application.',
  'Ta voix te briefe : « ajoute sport demain 14h », « mon programme » — saisie et commandes 100 % en français.',
  'Tes données restent les tiennes : aucun compte serveur, stockage local uniquement, effaçable en un clic.',
];

const ASSETS = [
  { label: 'Logo vectoriel (SVG)', href: '/icons/icon.svg', note: 'icône officielle, fond transparent' },
  { label: 'Logo PNG 512×512', href: '/icons/icon-512.png', note: 'icône haute définition' },
  { label: 'Image de partage 1200×630 (PNG)', href: '/opengraph-image', note: `logo + slogan « ${SLOGAN} » sur fond #FAFAFC` },
];

export default function PressePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">Fiche de presse</h1>
        <blockquote className="mt-2 border-l-4 border-primary pl-4 text-lg font-bold text-ink md:text-xl">
          « {SLOGAN} »
        </blockquote>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">En deux phrases</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Centeryou est un planning personnel qui se comprend en français parlé : on lui dit « ajoute sport demain 14h »
            (ou on l’écrit), et il range l’agenda, les tâches et le brief du matin. L’application est pensée d’abord pour
            le mobile et fonctionne comme une app installable.
          </p>
          <p className="text-sm text-muted">
            Centeryou est 100 % local : aucune donnée ne quitte l’appareil de l’utilisateur (stockage local du navigateur,
            aucun compte serveur, aucun pistage). Gratuit, sans publicité.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Le produit en 3 points</h2>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col gap-2">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Logo</h2>
        </CardHeader>
        <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span
            className="flex h-24 w-24 items-center justify-center rounded-tile border border-line"
            style={{ backgroundColor: colors.bg }}
          >
            <svg width="64" height="64" viewBox="0 0 40 40" role="img" aria-label="Logo Centeryou">
              <circle cx="20" cy="20" r="19" fill={colors.primary} />
              <path
                d="M10.5 20c2.2-4.4 4.4-4.4 6.6 0s4.4 4.4 6.6 0 4.4-4.4 6.3 0"
                fill="none"
                stroke={colors.voice}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-extrabold tracking-tight text-ink">Centeryou</p>
            <p className="text-sm text-muted">« {SLOGAN} » — rond violet #7C5CFF, onde turquoise #2DD4BF sur fond #FAFAFC.</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Visuels & captures à télécharger</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {ASSETS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-card border border-line/70 bg-bg/60 px-4 py-3 transition-colors duration-fast ease-out hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Download size={16} aria-hidden className="text-primary" /> {a.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{a.note}</span>
              </span>
              <ExternalLink size={16} aria-hidden className="shrink-0 text-muted" />
            </a>
          ))}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Image de partage (Open Graph, 1200×630)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/opengraph-image"
              alt={`Centeryou — ${SLOGAN}`}
              width={1200}
              height={630}
              className="w-full max-w-md rounded-card border border-line"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Voir le produit en direct</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            La démo publique montre une semaine type (Sofia, graphiste indépendante) en lecture seule, sans compte et sans
            aucune donnée réelle.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center rounded-pill bg-primarydark px-5 text-sm font-semibold text-surface shadow-card transition-all duration-normal ease-out hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]"
            >
              Ouvrir la démo
            </Link>
            <Link
              href="/inscription"
              className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors duration-fast ease-out hover:border-primary hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Créer mon compte
            </Link>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-muted">
        Contact presse : dépôt GitHub{' '}
        <a
          href="https://github.com/User313MSI/Centeryou"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primarydark underline-offset-2 hover:underline"
        >
          User313MSI/Centeryou
        </a>
        . Voir aussi :{' '}
        <Link href="/offres" className="font-semibold text-primarydark underline-offset-2 hover:underline">
          offres
        </Link>{' '}
        ·{' '}
        <Link href="/legal" className="font-semibold text-primarydark underline-offset-2 hover:underline">
          mentions légales & confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
