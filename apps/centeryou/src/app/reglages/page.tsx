'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Field, Input } from '../../components/ui/input';
import { Toggle } from '../../components/ui/toggle';
import { startCheckout } from '../../lib/billing';
import { useStore } from '../../lib/store';
import { isPremiumActive } from '../../lib/subscription';
import { useUiStore } from '../../lib/ui-store';
import { SubscriptionCard } from '../../components/settings/subscription-card';
import type { WelcomeSequenceMode } from '../../types';

const selectClass =
  'w-full min-h-11 rounded-card border border-line bg-surface px-4 text-base text-ink transition-colors duration-fast ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function ReglagesPage() {
  const settings = useStore((s) => s.settings);
  const subscription = useStore((s) => s.subscription);
  const premium = isPremiumActive(subscription);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const pushToast = useUiStore((s) => s.pushToast);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-ink">Réglages</h1>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Profil</h2>
        </CardHeader>
        <CardBody>
          <Field label="Ton prénom" htmlFor="reglage-prenom">
            <Input
              id="reglage-prenom"
              value={settings.prenom}
              onChange={(e) => updateSettings({ prenom: e.target.value })}
              placeholder="Ex. : Camille"
              maxLength={30}
            />
          </Field>
          <p className="mt-2 text-xs text-muted">
            Utilisé pour te saluer et personnaliser ton brief du matin.
          </p>
        </CardBody>
      </Card>

      <SubscriptionCard />

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Ma journée</h2>
        </CardHeader>
        <CardBody>
          <Field label="Début de la journée (grille du planning)" htmlFor="reglage-daystart">
            <select
              id="reglage-daystart"
              value={settings.dayStart}
              onChange={(e) => updateSettings({ dayStart: Number(e.target.value) })}
              className={selectClass}
            >
              {[6, 7, 8, 9, 10].map((h) => (
                <option key={h} value={h}>
                  {h}h00
                </option>
              ))}
            </select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Séquence d’accueil</h2>
        </CardHeader>
        <CardBody>
          <Field label="Séquence d’accueil (page Aujourd’hui)" htmlFor="reglage-welcome">
            <select
              id="reglage-welcome"
              value={settings.welcomeSequence ?? 'daily'}
              onChange={(e) => updateSettings({ welcomeSequence: e.target.value as WelcomeSequenceMode })}
              className={selectClass}
            >
              <option value="always">À chaque ouverture</option>
              <option value="daily">Une fois par jour (défaut)</option>
              <option value="off">Désactivée</option>
            </select>
          </Field>
          <p className="mt-2 text-xs text-muted">
            Plein écran animé qui résume ta journée à l’arrivée. La voix ne se lance jamais toute seule : bouton
            « ▶ Écouter le résumé » uniquement.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Son &amp; voix</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Sons de l’interface</p>
              <p className="text-xs text-muted">Petits bips discrets lors des actions.</p>
            </div>
            <Toggle checked={settings.sounds} onChange={(v) => updateSettings({ sounds: v })} label="Sons de l’interface" id="toggle-sons" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Assistant vocal</p>
              <p className="text-xs text-muted">
                Si désactivé, aucune voix ne sera prononcée (commandes toujours utilisables par texte).
              </p>
            </div>
            <Toggle checked={settings.voice} onChange={(v) => updateSettings({ voice: v })} label="Assistant vocal" id="toggle-voix" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Affichage</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Mode sombre</p>
              <p className="text-xs text-muted">
                {premium
                  ? 'Thème sombre de toute l’interface.'
                  : 'Réservé à l’offre Premium — il se désactive automatiquement si ton Premium retombe à Découverte.'}
              </p>
            </div>
            {premium ? (
              <Toggle
                checked={settings.darkMode}
                onChange={(v) => updateSettings({ darkMode: v })}
                label="Mode sombre"
                id="toggle-dark"
              />
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void startCheckout()}>
                Passer Premium
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <AlertTriangle size={18} aria-hidden className="text-danger" /> Données locales
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Toutes tes données restent dans ce navigateur (localStorage). Aucune donnée n’est envoyée ailleurs —
            sauf la synchronisation multi-appareils si tu es Premium (voir Abonnement ci-dessus).
          </p>
          <div>
            <Button
              variant={confirmReset ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  window.setTimeout(() => setConfirmReset(false), 4000);
                  return;
                }
                resetAll();
                setConfirmReset(false);
                pushToast({ message: 'Toutes les données ont été effacées' });
              }}
            >
              {confirmReset ? 'Cliquer encore pour confirmer la suppression' : 'Effacer toutes mes données'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
