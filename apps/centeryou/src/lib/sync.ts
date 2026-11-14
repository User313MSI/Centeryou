'use client';

/**
 * Synchronisation multi-appareils (offre Premium) : snapshot local (événements,
 * tâches, réglages) envoyé au serveur, indexé par customer Stripe.
 * Dernier écrivain gagne (horodatage updatedAt). Sans customer Premium,
 * rien n'est envoyé. Toute erreur est ignorée : la synchro ne casse jamais l'app.
 */

import { defaultSettings, useStore } from './store';
import { isPremiumActive } from './subscription';

let started = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function snapshotState() {
  const s = useStore.getState();
  return { events: s.events, tasks: s.tasks, settings: s.settings };
}

async function push(): Promise<void> {
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
    void push();
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
  if (started || typeof window === 'undefined') return;
  started = true;
  void pullSync();
  useStore.subscribe((s, prev) => {
    if (s.events !== prev.events || s.tasks !== prev.tasks || s.settings !== prev.settings) {
      schedulePush();
    }
  });
}
