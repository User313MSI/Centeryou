import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/card';

export const metadata: Metadata = {
  title: 'Offres',
  description:
    'Centeryou : agenda illimité, tâches en langage naturel, assistant vocal et données 100 % locales, gratuits. Offre Premium optionnelle pour la voix premium illimitée et la synchronisation multi-appareils.',
  alternates: { canonical: '/offres' },
};

const INCLUDED = [
  'Agenda illimité — vues Jour, Semaine, Mois, glisser-déposer',
  'Tâches en langage naturel (« sport demain 14h », « !lundi réunion »)',
  'Assistant vocal en français + brief du matin à la voix',
  'Application installable sur téléphone, même hors-ligne',
  'Données 100 % locales : aucun compte serveur, rien d’envoyé',
];

const PRINCIPLES = [
  'Aucune publicité, aucune revente de données, aucun pistage (aucun cookie tiers, aucune mesure d’audience externe)',
  'Gratuit par défaut : aucune carte bancaire demandée pour commencer',
  'Stockage uniquement dans ce navigateur — effaçable en un clic dans Réglages',
];

export default function OffresPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">Offres</h1>
        <p className="mt-1 text-sm font-semibold text-muted">
          L’essentiel est gratuit, et tout reste chez toi par défaut. Une offre Premium optionnelle existe pour aller plus loin.
        </p>
      </header>

      <Card className="border-primary/40">
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Gratuit — 0 €</h2>
          <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-bold text-primarydark">Tout inclus</span>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-voicetext" />
                {item}
              </li>
            ))}
          </ul>
          <div>
            <Link
              href="/inscription"
              className="inline-flex min-h-11 items-center rounded-pill bg-primarydark px-6 text-sm font-semibold text-surface shadow-card transition-all duration-normal ease-out hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]"
            >
              Créer mon compte
            </Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ShieldCheck size={18} aria-hidden className="text-primary" /> Nos principes
          </h2>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col gap-2">
            {PRINCIPLES.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Centeryou est 100 % local par défaut : sans compte, rien ne quitte ton appareil. Tu peux aussi{' '}
            <Link href="/demo" className="font-semibold text-primarydark underline-offset-2 hover:underline">
              essayer la démo
            </Link>{' '}
            sans compte. L’offre Premium optionnelle (voix premium illimitée, sauvegarde en ligne et
            synchronisation multi-appareils) se gère dans{' '}
            <Link href="/reglages" className="font-semibold text-primarydark underline-offset-2 hover:underline">
              Réglages → Abonnement
            </Link>
            .
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
