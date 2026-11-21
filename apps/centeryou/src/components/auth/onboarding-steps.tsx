'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Mic, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardBody } from '../ui/card';
import { useStore } from '../../lib/store';

const STEPS = [
  {
    icon: Mic,
    title: 'Parle-lui, ou écris',
    text: '« Ajoute sport demain 14h » : la saisie naturelle comprend le français — date, heure, catégorie, priorité (« !lundi réunion »).',
  },
  {
    icon: CalendarDays,
    title: 'Glisse pour déplacer',
    text: 'Dans le planning, attrape un événement et pose-le sur un autre créneau. Un clic sur un créneau en crée un nouveau.',
  },
  {
    icon: Sun,
    title: 'Ton brief du matin, à la voix',
    text: 'Chaque matin, trois phrases à écouter pour savoir où tu en es. La voix ne se lance jamais toute seule.',
  },
];

export function OnboardingSteps() {
  const router = useRouter();
  const prenom = useStore((s) => s.settings.prenom);
  const updateSettings = useStore((s) => s.updateSettings);

  const go = () => {
    updateSettings({ onboarded: true });
    router.push('/aujourdhui');
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink md:text-4xl">
          Bienvenue{prenom.trim() ? `, ${prenom.trim()}` : ''} !
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-muted">
          Trois choses à savoir pour commencer — c’est parti en moins d’une minute.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Card key={s.title}>
            <CardBody className="flex flex-col gap-3 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-primary/10">
                <s.icon size={22} aria-hidden className="text-primarydark" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Étape {i + 1}</p>
              <h2 className="text-base font-bold text-ink">{s.title}</h2>
              <p className="text-sm text-muted">{s.text}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="flex flex-col items-center gap-3 pt-5 text-center">
          <p className="max-w-md text-sm text-muted">
            Tes données restent dans ce navigateur (localStorage) — effaçables à tout moment dans{' '}
            <Link href="/reglages" className="font-semibold text-primarydark underline-offset-2 hover:underline">
              Réglages
            </Link>
            .
          </p>
          <Button size="lg" onClick={go} className="px-8">
            C’est parti !
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
