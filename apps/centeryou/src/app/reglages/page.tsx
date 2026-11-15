'use client';

import { useState } from 'react';
import { AlertTriangle, Download, Moon } from 'lucide-react';
import { AccountSection } from '../../components/account/account-section';
import { Button } from '../../components/ui/button';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Field, Input } from '../../components/ui/input';
import { Toggle } from '../../components/ui/toggle';
import { todayISO } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import type { WelcomeSequenceMode } from '../../types';

const selectClass =
  'w-full min-h-11 rounded-card border border-line bg-surface px-4 text-base text-ink transition-colors duration-fast ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function ReglagesPage() {
  const settings = useStore((s) => s.settings);
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const pushToast = useUiStore((s) => s.pushToast);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportJson = () => {
    const data = {
      app: 'centeryou',
      version: 1,
      exportedAt: new Date().toISOString(),
      events,
      tasks,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centeryou-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ message: 'Export JSON téléchargé ✓' });
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-ink md:text-4xl">Réglages</h1>

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

      <AccountSection />

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Apparence</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Moon size={16} aria-hidden className="text-primary" /> Mode sombre
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Un thème sombre reposant pour les yeux, mémorisé sur cet appareil.
              </p>
            </div>
            <Toggle
              checked={settings.theme === 'sombre'}
              onChange={(v) => updateSettings({ theme: v ? 'sombre' : 'clair' })}
              label="Mode sombre"
              id="toggle-theme"
            />
          </div>
        </CardBody>
      </Card>

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
          <h2 className="text-base font-bold text-ink">Export des données</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Télécharge toutes tes données (événements, tâches, réglages) dans un fichier JSON.
          </p>
          <div>
            <Button variant="secondary" size="sm" onClick={exportJson}>
              <Download size={15} aria-hidden /> Télécharger mes données (JSON)
            </Button>
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
            Par défaut, toutes tes données restent dans ce navigateur (localStorage). Si tu crées un compte (carte
            ci-dessus), une copie est enregistrée en ligne.
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
