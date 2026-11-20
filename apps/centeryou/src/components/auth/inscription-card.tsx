'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardBody } from '../ui/card';
import { Field, Input } from '../ui/input';
import { useHydrated } from '../../lib/useHydrated';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';

export function InscriptionCard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [prenom, setPrenom] = useState('');
  const updateSettings = useStore((s) => s.updateSettings);
  const prenomSaved = useStore((s) => s.settings.prenom);
  const onboarded = useStore((s) => s.settings.onboarded);
  const hasEvents = useStore((s) => s.events.length > 0);
  const hasTasks = useStore((s) => s.tasks.length > 0);
  const pushToast = useUiStore((s) => s.pushToast);

  const connected = hydrated && (prenomSaved.trim() !== '' || Boolean(onboarded) || hasEvents || hasTasks);

  useEffect(() => {
    if (connected) router.replace('/aujourdhui');
  }, [connected, router]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = prenom.trim();
    if (!p) return;
    updateSettings({ prenom: p, onboarded: true });
    pushToast({ message: `Bienvenue ${p} ! Ton compte local est créé.` });
    router.push('/onboarding');
  };

  const skip = () => {
    updateSettings({ onboarded: true });
    router.push('/aujourdhui');
  };

  if (connected) {
    return <p className="py-10 text-center text-sm font-semibold text-muted">Redirection vers ton aujourd’hui…</p>;
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardBody className="flex flex-col gap-5 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-primary/10">
            <Sparkles size={22} aria-hidden className="text-primary" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink">Ton compte, sur cet appareil</h2>
            <p className="text-xs text-muted">100 % local : aucun serveur, aucun mot de passe à retenir.</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Comment t’appelles-tu ?" htmlFor="inscription-prenom">
            <Input
              id="inscription-prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Ex. : Camille"
              maxLength={30}
              autoComplete="given-name"
              required
              data-autofocus
            />
          </Field>
          <p className="text-xs text-muted">
            Ton prénom sert à te saluer et à personnaliser ton brief du matin. Il reste dans ce navigateur — rien n’est
            envoyé sur un serveur.
          </p>
          <Button type="submit" size="lg" className="w-full" disabled={prenom.trim().length === 0}>
            Créer mon compte
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={skip}
            className="min-h-11 rounded-pill px-4 text-sm font-semibold text-muted transition-colors duration-fast ease-out hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Continuer sans compte
          </button>
          <Link href="/demo" className="text-xs font-semibold text-primarydark underline-offset-2 hover:underline">
            Voir la démo d’abord →
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
