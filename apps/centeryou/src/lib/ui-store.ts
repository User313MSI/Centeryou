'use client';

import { create } from 'zustand';
import { uid } from './utils';

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
}));
