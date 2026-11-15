'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../../lib/auth-store';
import { isApplyingRemote, writeSyncMeta } from '../../lib/sync';
import { useStore } from '../../lib/store';
import { SyncOfferDialog } from './sync-offer-dialog';

const SYNC_DEBOUNCE_MS = 2500;

/**
 * Branche la synchronisation en arrière-plan (uniquement avec un compte connecté) :
 * - initialise la session au démarrage ;
 * - à chaque changement local, enregistre en ligne après 2,5 s d'inactivité ;
 * - resynchronise à la reconnexion réseau.
 * Sans compte ni Supabase configuré, ce composant ne fait strictement rien.
 */
export function SyncProvider() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const runSync = useAuthStore((s) => s.runSync);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!user) return;
    let timer: number | undefined;
    let prev = useStore.getState();
    const unsubscribe = useStore.subscribe((s) => {
      if (!s.hydrated || isApplyingRemote()) return;
      const changed = s.events !== prev.events || s.tasks !== prev.tasks || s.settings !== prev.settings;
      prev = s;
      if (!changed) return;
      writeSyncMeta(Date.now());
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void runSync();
      }, SYNC_DEBOUNCE_MS);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [user, runSync]);

  useEffect(() => {
    const onOnline = () => {
      if (useAuthStore.getState().user) void runSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runSync]);

  return <SyncOfferDialog />;
}
