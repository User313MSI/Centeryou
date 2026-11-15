'use client';

import type { EventItem, Settings, TaskItem } from '../types';
import { defaultSettings, useStore } from './store';
import { getSupabase } from './supabase';
import { isPremiumActive } from './subscription';

/**
 * Synchronisation « hors-ligne d'abord » :
 * - le localStorage reste le chef d'orchestre ;
 * - une seule sauvegarde JSON par compte dans Supabase (table `backups`) ;
 * - la version la plus récente gagne (champ `savedAt` du payload vs méta local).
 */

export interface BackupPayload {
  v: 1;
  savedAt: number;
  events: EventItem[];
  tasks: TaskItem[];
  settings: Settings;
}

export type SyncOutcome = 'saved' | 'restored' | 'up-to-date' | 'offline' | 'error' | 'disabled';

const META_KEY = 'centeryou-sync-meta-v1';

let applyingRemote = false;

export function isApplyingRemote(): boolean {
  return applyingRemote;
}

export function hasLocalData(): boolean {
  const s = useStore.getState();
  return s.events.length > 0 || s.tasks.length > 0 || s.settings.prenom.trim() !== '';
}

/** Méta local : horodatage du dernier changement local connu. */
export function readSyncMeta(): { lastChangeAt: number } {
  if (typeof window === 'undefined') return { lastChangeAt: 0 };
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { lastChangeAt?: unknown };
      if (typeof parsed?.lastChangeAt === 'number') return { lastChangeAt: parsed.lastChangeAt };
    }
  } catch {
    // méta illisible : on repart proprement
  }
  // Première exécution : les données déjà présentes localement comptent comme un changement « maintenant » ;
  // un appareil vierge (2e appareil) démarre à 0 pour laisser gagner la sauvegarde distante.
  const lastChangeAt = hasLocalData() ? Date.now() : 0;
  writeSyncMeta(lastChangeAt);
  return { lastChangeAt };
}

export function writeSyncMeta(lastChangeAt: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify({ lastChangeAt }));
  } catch {
    // localStorage plein / indisponible : la synchro reste locale, jamais bloquante
  }
}

export function buildPayload(savedAt = Date.now()): BackupPayload {
  const s = useStore.getState();
  return { v: 1, savedAt, events: s.events, tasks: s.tasks, settings: s.settings };
}

function isBackupPayload(p: unknown): p is BackupPayload {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.savedAt === 'number' &&
    Array.isArray(o.events) &&
    Array.isArray(o.tasks) &&
    !!o.settings &&
    typeof o.settings === 'object'
  );
}

/** Applique une sauvegarde distante dans le store local (et la persiste). */
export function applyPayload(p: BackupPayload): void {
  applyingRemote = true;
  try {
    useStore.setState({
      events: p.events,
      tasks: p.tasks,
      settings: { ...defaultSettings, ...p.settings },
    });
    writeSyncMeta(p.savedAt);
  } finally {
    applyingRemote = false;
  }
}

/** Sauvegarde distante actuelle, ou null si aucune / erreur. */
export async function fetchBackup(userId: string): Promise<BackupPayload | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('backups').select('payload').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  const payload = data?.payload;
  return isBackupPayload(payload) ? payload : null;
}

/** Envoie l'état local en ligne (écrase la sauvegarde distante). */
export async function pushBackup(userId: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase non configuré');
  const savedAt = Date.now();
  const payload = buildPayload(savedAt);
  const { error } = await sb
    .from('backups')
    .upsert({ user_id: userId, payload, updated_at: new Date(savedAt).toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  writeSyncMeta(savedAt);
}

/** Récupère la sauvegarde distante et l'applique localement. */
export async function pullBackup(userId: string): Promise<BackupPayload | null> {
  const payload = await fetchBackup(userId);
  if (payload) applyPayload(payload);
  return payload;
}

/**
 * Synchronisation automatique : la version la plus récente gagne.
 * - distante plus récente → on restaure localement ;
 * - locale plus récente → on pousse en ligne ;
 * - identiques → rien à faire.
 */
export async function syncNow(userId: string): Promise<SyncOutcome> {
  const sb = await getSupabase();
  if (!sb) return 'disabled';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  try {
    const remote = await fetchBackup(userId);
    const remoteSavedAt = remote?.savedAt ?? 0;
    const local = readSyncMeta().lastChangeAt;
    if (remote && remoteSavedAt > local) {
      applyPayload(remote);
      return 'restored';
    }
    if (remote && remoteSavedAt === local) return 'up-to-date';
    await pushBackup(userId);
    return 'saved';
  } catch {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error';
  }
}

// ---------------------------------------------------------------------------
// Synchronisation multi-appareils (offre Premium, Stripe) : snapshot local
// envoyé au serveur, indexé par customer Stripe. Dernier écrivain gagne
// (horodatage updatedAt). Sans customer Premium, rien n'est envoyé.
// Toute erreur est ignorée : la synchro ne casse jamais l'app.
// ---------------------------------------------------------------------------

let stripeSyncStarted = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function snapshotState() {
  const s = useStore.getState();
  return { events: s.events, tasks: s.tasks, settings: s.settings };
}

async function pushStripe(): Promise<void> {
  const s = useStore.getState();
  if (!isPremiumActive(s.subscription) || !s.subscription.customerId) return;
  const updatedAt = Date.now();
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: s.subscription.customerId,
        updatedAt,
        state: snapshotState(),
      }),
    });
    useStore.getState().setSyncUpdatedAt(updatedAt);
  } catch {
    // synchro indisponible : on réessaiera au prochain changement
  }
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushStripe();
  }, 2000);
}

/** récupère le snapshot distant s'il est plus récent que le local */
export async function pullSync(): Promise<void> {
  const s = useStore.getState();
  if (!isPremiumActive(s.subscription) || !s.subscription.customerId) return;
  try {
    const res = await fetch(`/api/sync?customerId=${encodeURIComponent(s.subscription.customerId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = (await res.json().catch(() => ({}))) as {
      snapshot?: { updatedAt: number; state?: { events?: unknown; tasks?: unknown; settings?: unknown } } | null;
    };
    const snap = data.snapshot;
    if (!snap || snap.updatedAt <= s.syncUpdatedAt) return;
    const st = snap.state ?? {};
    useStore.setState((state) => ({
      events: Array.isArray(st.events) ? (st.events as typeof state.events) : state.events,
      tasks: Array.isArray(st.tasks) ? (st.tasks as typeof state.tasks) : state.tasks,
      settings: { ...defaultSettings, ...(st.settings as Partial<typeof state.settings> | undefined) },
      syncUpdatedAt: snap.updatedAt,
    }));
  } catch {
    // ignore
  }
}

/** à appeler une fois côté client (AppShell) : pull initial + push différé sur chaque changement */
export function initSync(): void {
  if (stripeSyncStarted || typeof window === 'undefined') return;
  stripeSyncStarted = true;
  void pullSync();
  useStore.subscribe((s, prev) => {
    if (s.events !== prev.events || s.tasks !== prev.tasks || s.settings !== prev.settings) {
      schedulePush();
    }
  });
}
