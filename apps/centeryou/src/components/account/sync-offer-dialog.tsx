'use client';

import { CloudUpload, Download } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { useUiStore } from '../../lib/ui-store';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';

/**
 * À la connexion, quand des données locales existent et qu'aucune sauvegarde
 * distante n'existe encore : proposition « Enregistrer mes données en ligne ».
 */
export function SyncOfferDialog() {
  const offerOpen = useAuthStore((s) => s.offerOpen);
  const remoteAvailable = useAuthStore((s) => s.remoteAvailable);
  const setOfferOpen = useAuthStore((s) => s.setOfferOpen);
  const pushNow = useAuthStore((s) => s.pushNow);
  const pullNow = useAuthStore((s) => s.pullNow);
  const pushToast = useUiStore((s) => s.pushToast);

  const onPush = async () => {
    const outcome = await pushNow();
    setOfferOpen(false);
    if (outcome === 'saved') pushToast({ message: 'Données enregistrées en ligne ✓' });
    else pushToast({ message: 'Enregistrement reporté (hors ligne ou erreur réseau)' });
  };

  const onPull = async () => {
    await pullNow();
    setOfferOpen(false);
    pushToast({ message: 'Données récupérées depuis ton compte ✓' });
  };

  return (
    <Dialog
      open={offerOpen}
      onClose={() => setOfferOpen(false)}
      title="Sauvegarder tes données en ligne ?"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => setOfferOpen(false)}>
            Plus tard
          </Button>
          {remoteAvailable && (
            <Button variant="secondary" size="md" onClick={onPull}>
              <Download size={15} aria-hidden /> Récupérer mes données en ligne
            </Button>
          )}
          <Button size="md" onClick={onPush}>
            <CloudUpload size={15} aria-hidden /> Enregistrer mes données en ligne
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">
        Tu es connecté. Tes événements, tâches et réglages peuvent être enregistrés en ligne pour les retrouver sur un
        autre appareil. Sans action de ta part, ils restent uniquement dans ce navigateur.
      </p>
      <p className="text-xs text-muted">
        Ensuite, chaque modification est synchronisée automatiquement en arrière-plan — la version la plus récente gagne.
      </p>
    </Dialog>
  );
}
