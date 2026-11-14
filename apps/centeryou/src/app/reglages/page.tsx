'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Field, Input } from '../../components/ui/input';
import { Toggle } from '../../components/ui/toggle';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import type { WelcomeSequenceMode } from '../../types';

const selectClass =
  'w-full min-h-11 rounded-card border border-line bg-surface px-4 text-base text-ink transition-colors duration-fast ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function ReglagesPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const pushToast = useUiStore((s) => s.pushToast);
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 8000);
      return;
    }
    setDeleting(true);
    try {
      await fetch('/api/compte/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      pushToast({ message: 'Suppression serveur indisponible, données locales supprimées' });
    }
    deleteAccount();
    setConfirmDelete(false);
    pushToast({ message: 'Ton compte et tes données ont été supprimés' });
    router.push('/');
  };

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
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <AlertTriangle size={18} aria-hidden className="text-danger" /> Données locales
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Toutes tes données restent dans ce navigateur (localStorage). Aucune donnée n’est envoyée ailleurs.
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

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Trash2 size={18} aria-hidden className="text-danger" /> Supprimer mon compte et mes données
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Suppression définitive et irréversible : ton prénom, tes événements et tes tâches sont effacés
            de ce navigateur (stockage local), et une demande d’effacement est envoyée au serveur. Voir la{' '}
            <Link href="/confidentialite" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
              politique de confidentialité
            </Link>
            .
          </p>
          {confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-card border border-danger/40 bg-danger/5 px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                Es-tu sûr(e) ? Cette action est définitive et ne peut pas être annulée.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={onDeleteAccount} disabled={deleting}>
                  {deleting ? 'Suppression en cours…' : 'Oui, supprimer définitivement'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="secondary" size="sm" onClick={onDeleteAccount} disabled={deleting}>
                Supprimer mon compte et mes données
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
