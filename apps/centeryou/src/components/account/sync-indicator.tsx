'use client';

import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { isSupabaseConfigured } from '../../lib/supabase';
import { cx } from '../../lib/utils';

/**
 * Indicateur discret de synchronisation dans la barre de navigation :
 * visible uniquement avec un compte connecté et Supabase configuré.
 */
export function SyncIndicator() {
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  if (!isSupabaseConfigured() || !user) return null;

  const label =
    syncStatus === 'syncing'
      ? 'Enregistrement…'
      : syncStatus === 'saved'
        ? 'Enregistré ✓'
        : syncStatus === 'restored'
          ? 'Récupéré ✓'
          : syncStatus === 'offline'
            ? 'Hors ligne'
            : syncStatus === 'error'
              ? 'Synchro indisponible'
              : 'Connecté';

  return (
    <span
      aria-live="polite"
      title={label}
      className={cx(
        'hidden items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold sm:flex',
        syncStatus === 'error'
          ? 'border-danger/40 text-danger'
          : syncStatus === 'offline'
            ? 'border-warning/50 text-warning'
            : 'border-line text-muted',
      )}
    >
      {syncStatus === 'syncing' ? (
        <Loader2 size={13} aria-hidden className="animate-spin" />
      ) : syncStatus === 'offline' ? (
        <CloudOff size={13} aria-hidden />
      ) : syncStatus === 'saved' || syncStatus === 'restored' ? (
        <Check size={13} aria-hidden className="text-voice" />
      ) : (
        <Cloud size={13} aria-hidden />
      )}
      {label}
    </span>
  );
}
