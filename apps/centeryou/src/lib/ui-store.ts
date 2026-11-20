'use client';

import { create } from 'zustand';

import { useStore } from './store';

import { uid } from './utils';

/** durée de la sortie douce à la suppression (rétrécissement + fondu) — 0 = statique instantané */
export const EXIT_ANIMATION_MS = 220;

/** animations actives maintenant ? (réglage + prefers-reduced-motion) — check local pour ne pas alourdir le graphe initial */
function motionActiveNow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    // matchMedia indisponible : on se fie au réglage
  }
  return useStore.getState().settings.animations === true;
}

const exitTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type PlanningView = 'jour' | 'semaine' | 'mois';

export interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface EventDialogState {
  open: boolean;
  eventId?: string;
  date?: string;
  start?: string;
}

interface UiState {
  toasts: Toast[];
  pushToast: (t: { message: string; actionLabel?: string; onAction?: () => void; duration?: number }) => void;
  dismissToast: (id: string) => void;

  eventDialog: EventDialogState;
  openEventDialog: (p: { eventId?: string; date?: string; start?: string }) => void;
  closeEventDialog: () => void;

  planningView: PlanningView;
  setPlanningView: (v: PlanningView) => void;

  /** dernier événement déposé (drag & drop) : id + horodatage, pour le rebond de confirmation (non persisté) */
  lastDrop: { id: string; at: number } | null;
  setLastDrop: (id: string) => void;

  listening: boolean;
  setListening: (b: boolean) => void;
  toggleListening: () => void;
  transcript: string;
  setTranscript: (s: string) => void;
  lastReply: string;
  setLastReply: (s: string) => void;

  helpOpen: boolean;
  setHelpOpen: (b: boolean) => void;

  /** appui long sur une tâche (mobile) : id de la tâche dont le menu d'actions est ouvert */
  taskMenuId: string | null;
  openTaskMenu: (id: string) => void;
  closeTaskMenu: () => void;

  /** invite d'installation PWA refusée pour la session (non persistée) */
  installDismissed: boolean;
  dismissInstall: () => void;

  /** ids (préfixés « event: » / « task: ») en cours de sortie douce avant suppression (non persisté) */
  exitingIds: string[];
  /**
   * Sortie douce : marque `id` (classe animate-exit) puis exécute `done` (suppression réelle)
   * après EXIT_ANIMATION_MS — délai 0 (immédiat) si les animations sont inactives.
   */
  requestExit: (id: string, done: () => void) => void;
  /**
   * Annule une sortie programmée (bouton « Annuler » du toast) ; renvoie true si une sortie
   * était en cours — l'élément est alors toujours présent, rien à restaurer.
   */
  cancelExit: (id: string) => boolean;
}

export const useUiStore = create<UiState>()((set, get) => ({
  toasts: [],
  pushToast: ({ message, actionLabel, onAction, duration = 4000 }) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, message, actionLabel, onAction }] }));
    // globalThis.setTimeout : utilisable aussi hors navigateur (tests node du parseur)
    globalThis.setTimeout(() => {
      if (get().toasts.some((t) => t.id === id)) set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  eventDialog: { open: false },
  openEventDialog: (p) => set({ eventDialog: { open: true, ...p } }),
  closeEventDialog: () => set({ eventDialog: { open: false } }),

  planningView: 'semaine',
  setPlanningView: (v) => set({ planningView: v }),

  lastDrop: null,
  setLastDrop: (id) => set({ lastDrop: { id, at: Date.now() } }),

  listening: false,
  setListening: (b) => set({ listening: b }),
  toggleListening: () => set((s) => ({ listening: !s.listening })),
  transcript: '',
  setTranscript: (s) => set({ transcript: s }),
  lastReply: '',
  setLastReply: (s) => set({ lastReply: s }),

  helpOpen: false,
  setHelpOpen: (b) => set({ helpOpen: b }),

  taskMenuId: null,
  openTaskMenu: (id) => set({ taskMenuId: id }),
  closeTaskMenu: () => set({ taskMenuId: null }),

  installDismissed: false,
  dismissInstall: () => set({ installDismissed: true }),

  exitingIds: [],
  requestExit: (id, done) => {
    // une seule sortie par id
    const prev = exitTimers.get(id);
    if (prev !== undefined) {
      clearTimeout(prev);
      exitTimers.delete(id);
    }
    set((s) => ({ exitingIds: s.exitingIds.includes(id) ? s.exitingIds : [...s.exitingIds, id] }));
    const delay = motionActiveNow() ? EXIT_ANIMATION_MS : 0;
    exitTimers.set(
      id,
      setTimeout(() => {
        exitTimers.delete(id);
        set((s) => ({ exitingIds: s.exitingIds.filter((x) => x !== id) }));
        done();
      }, delay),
    );
  },
  cancelExit: (id) => {
    const t = exitTimers.get(id);
    if (t === undefined) return false;
    clearTimeout(t);
    exitTimers.delete(id);
    set((s) => ({ exitingIds: s.exitingIds.filter((x) => x !== id) }));
    return true;
  },
}));
