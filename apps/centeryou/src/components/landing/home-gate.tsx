'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, ShieldCheck, Smartphone } from 'lucide-react';
import { Card, CardBody } from '../ui/card';
import { Logo } from '../brand/logo';
import { ProductMock } from './product-mock';
import { useHydrated } from '../../lib/useHydrated';
import { useStore } from '../../lib/store';
import { LEGAL } from '../../lib/legal';
import { SLOGAN } from '../../lib/site';

const CTA_BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold transition-all duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]';
const CTA_PRIMARY = `${CTA_BASE} bg-primarydark bg-cta text-surface shadow-card hover:brightness-95 hover:shadow-hover`;
const CTA_SECONDARY = `${CTA_BASE} border border-line bg-surface text-ink hover:border-primary hover:text-primarydark`;

const ARGUMENTS = [
  {
    icon: Smartphone,
    title: 'Le mobile d’abord',
    text: 'Pensé d’abord pour le téléphone : ajoute, coche et déplace en deux gestes, même depuis le canapé. Installable en application.',
  },
  {
    icon: Mic,
    title: 'Ta voix te briefe',
    text: 'Parle à Centeryou : « ajoute sport demain 14h », « mon programme », « c’est fait sport ». Il comprend le français et te répond à voix haute.',
  },
  {
    icon: ShieldCheck,
    title: 'Tes données restent les tiennes',
    text: 'Aucun compte serveur : tout reste sur cet appareil. Rien n’est envoyé, rien n’est vendu, effaçable en un clic.',
  },
];

function LandingPage() {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <section className="flex flex-col items-center gap-8 pt-8 text-center md:pt-12">
        {/* Nuage (M-23) : le nom « Centeryou » vit dans la barre du haut — le hero ne montre
            que le monogramme, plus grand : plus de logo doublé */}
        <Logo size={56} />
        {/* Nuage (M-23) : slogan en dégradé violet discret (texte large 48 px, ≥ 3:1 requis, primary fait 4,17:1) */}
        <h1 className="max-w-3xl bg-gradient-to-r from-primary to-primarydark bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent md:text-4xl">
          {SLOGAN}
        </h1>
        <p className="max-w-xl text-base font-semibold text-muted md:text-lg">
          Dis « ajoute sport demain 14h » — ou écris-le — et Centeryou range ton agenda, tes tâches et te briefe à la voix.
          100 % en français, gratuit, et tes données restent sur ton appareil.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/inscription" className={`${CTA_PRIMARY} px-8`}>
            Créer mon compte
          </Link>
          <Link href="/demo" className={`${CTA_SECONDARY} px-8`}>
            Voir la démo
          </Link>
        </div>
        <p className="text-xs text-muted">
          Déjà un planning sur cet appareil ?{' '}
          <Link href="/aujourdhui" className="font-semibold text-primarydark underline-offset-2 hover:underline">
            Ouvrir mon aujourd’hui →
          </Link>
        </p>
      </section>

      <section aria-label="Pourquoi Centeryou" className="grid gap-4 md:grid-cols-3">
        {ARGUMENTS.map((a) => (
          <Card key={a.title}>
            <CardBody className="flex flex-col gap-3 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-primary/10">
                <a.icon size={22} aria-hidden className="text-primarydark" />
              </span>
              <h2 className="text-base font-bold text-ink">{a.title}</h2>
              <p className="text-sm text-muted">{a.text}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section aria-label="Aperçu du produit" className="flex flex-col gap-3">
        <Card>
          <CardBody className="p-2 md:p-4">
            <ProductMock />
          </CardBody>
        </Card>
        <p className="text-center text-sm text-muted">
          Aperçu — la semaine type de <strong>Sofia, graphiste indépendante</strong> (données fictives).{' '}
          <Link href="/demo" className="font-semibold text-primarydark underline-offset-2 hover:underline">
            Ouvrir la démo en lecture seule →
          </Link>
        </p>
      </section>

      <footer className="flex flex-col items-center gap-2 border-t border-line pt-6 text-center">
        <nav aria-label="Liens publics" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
          <Link href="/demo" className="hover:text-primarydark">Démo</Link>
          <Link href="/offres" className="hover:text-primarydark">Offres</Link>
          <Link href="/presse" className="hover:text-primarydark">Presse</Link>
          <Link href="/legal" className="hover:text-primarydark">Mentions légales & confidentialité</Link>
        </nav>
        <p className="text-xs text-muted">© {LEGAL.copyrightYear} {LEGAL.appName} — fait avec soin, en français.</p>
      </footer>
    </div>
  );
}

export function HomeGate() {
  const hydrated = useHydrated();
  const router = useRouter();
  const prenom = useStore((s) => s.settings.prenom);
  const onboarded = useStore((s) => s.settings.onboarded);
  const hasEvents = useStore((s) => s.events.length > 0);
  const hasTasks = useStore((s) => s.tasks.length > 0);

  const connected = hydrated && (prenom.trim() !== '' || Boolean(onboarded) || hasEvents || hasTasks);

  useEffect(() => {
    if (connected) router.replace('/aujourdhui');
  }, [connected, router]);

  if (connected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted">Redirection vers ton aujourd’hui…</p>
      </div>
    );
  }

  return <LandingPage />;
}
