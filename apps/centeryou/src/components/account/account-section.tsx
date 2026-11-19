'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, CloudUpload, Download, LogOut, UserRound } from 'lucide-react';
import { useAuthStore, type SyncStatus } from '../../lib/auth-store';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { Button } from '../ui/button';
import { Card, CardBody, CardHeader } from '../ui/card';
import { Field, Input } from '../ui/input';
import { AuthDialog, type AuthMode } from './auth-dialog';

export function syncStatusText(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return 'Enregistrement en cours…';
    case 'saved':
      return 'Enregistré ✓';
    case 'restored':
      return 'Données récupérées ✓';
    case 'offline':
      return 'Hors ligne — synchro à la reconnexion';
    case 'error':
      return 'Synchronisation impossible pour le moment';
    default:
      return 'Non synchronisé';
  }
}

/** Carte « Compte & sauvegarde en ligne » de la page Réglages. */
export function AccountSection() {
  const configured = isSupabaseConfigured();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const prenom = useAuthStore((s) => s.prenom);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const signOut = useAuthStore((s) => s.signOut);
  const savePrenom = useAuthStore((s) => s.savePrenom);
  const pushNow = useAuthStore((s) => s.pushNow);
  const pullNow = useAuthStore((s) => s.pullNow);
  const settingsPrenom = useStore((s) => s.settings.prenom);
  const pushToast = useUiStore((s) => s.pushToast);
  const [dialog, setDialog] = useState<null | AuthMode>(null);
  const [prenomDraft, setPrenomDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrenomDraft(prenom || settingsPrenom);
  }, [prenom, settingsPrenom]);

  const onPush = async () => {
    setBusy(true);
    try {
      const outcome = await pushNow();
      pushToast({
        message: outcome === 'saved' ? 'Données enregistrées en ligne ✓' : outcome === 'offline' ? 'Hors ligne — réessayé à la reconnexion' : 'Enregistrement en ligne impossible pour le moment',
      });
    } finally {
      setBusy(false);
    }
  };

  const onPull = async () => {
    setBusy(true);
    try {
      const outcome = await pullNow();
      pushToast({ message: outcome === 'restored' ? 'Données récupérées depuis ton compte ✓' : 'Déjà à jour ✓' });
    } finally {
      setBusy(false);
    }
  };

  const onSavePrenom = async () => {
    const res = await savePrenom(prenomDraft);
    pushToast({ message: res.error ? res.error : 'Prénom enregistré (brief vocal mis à jour) ✓' });
  };

  const onSignOut = async () => {
    await signOut();
    pushToast({ message: 'Déconnecté — tes données restent dans ce navigateur' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Cloud size={18} aria-hidden className="text-primary" /> Compte &amp; sauvegarde en ligne
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {!configured && (
            <p className="text-sm text-muted">
              La sauvegarde en ligne n’est pas activée sur ce déploiement (variables Supabase non renseignées). Centeryou
              reste 100 % local.
            </p>
          )}
          {configured && status === 'loading' && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted">
              <span className="h-3.5 w-24 animate-pulse rounded-pill bg-line/80" aria-hidden /> Chargement du compte…
            </p>
          )}
          {configured && status === 'ready' && !user && (
            <>
              <p className="text-sm text-muted">
                Sans compte, tout reste dans ce navigateur. Avec un compte gratuit, tes données sont aussi enregistrées en
                ligne et retrouvées sur un autre appareil.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog('login')}>
                  Se connecter
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDialog('signup')}>
                  Créer un compte
                </Button>
              </div>
            </>
          )}
          {configured && status === 'ready' && user && (
            <>
              <div className="flex items-center gap-2 text-sm text-ink">
                <UserRound size={16} aria-hidden className="text-primary" />
                <span className="font-semibold">{user.email}</span>
              </div>
              <Field label="Prénom du compte" htmlFor="compte-prenom">
                <div className="flex gap-2">
                  <Input
                    id="compte-prenom"
                    value={prenomDraft}
                    onChange={(e) => setPrenomDraft(e.target.value)}
                    placeholder="Ex. : Camille"
                    maxLength={30}
                  />
                  <Button variant="secondary" size="md" onClick={onSavePrenom} disabled={busy || prenomDraft.trim() === prenom}>
                    Enregistrer
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted">Ce prénom personnalise aussi ton brief vocal.</p>
              </Field>
              <p className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
                {syncStatus === 'offline' || syncStatus === 'error' ? (
                  <CloudOff size={14} aria-hidden className={syncStatus === 'error' ? 'text-danger' : 'text-warning'} />
                ) : (
                  <Cloud size={14} aria-hidden className="text-voice" />
                )}
                {syncStatusText(syncStatus)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={onPush} disabled={busy}>
                  <CloudUpload size={15} aria-hidden /> Enregistrer mes données en ligne
                </Button>
                <Button variant="secondary" size="sm" onClick={onPull} disabled={busy}>
                  <Download size={15} aria-hidden /> Récupérer mes données en ligne
                </Button>
                <Button variant="ghost" size="sm" onClick={onSignOut}>
                  <LogOut size={15} aria-hidden /> Se déconnecter
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
      <AuthDialog open={dialog !== null} mode={dialog ?? 'login'} onClose={() => setDialog(null)} onSwitch={(m) => setDialog(m)} />
    </>
  );
}
