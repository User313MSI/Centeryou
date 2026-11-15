'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, EventItem, Priority, Repeat, Settings, TaskItem, Theme, WelcomeSequenceMode } from '../types';
import type { BackupPayload } from './backup';
import { minutesOf, timeOf, todayISO } from './dates';
import { defaultSettings } from './defaults';
import { currentMonth, defaultSubscription, defaultVoiceQuota, type SubscriptionState, type VoiceQuota } from './subscription';
import { sanitizeEvents, sanitizeSettings, sanitizeTasks } from './sanitize';
import { createSafeStorage } from './safe-storage';
import { uid } from './utils';

export { defaultSettings };

interface CenteryouState {
  events: EventItem[];
  tasks: TaskItem[];
  settings: Settings;
  hydrated: boolean;
  /** identifiant d'appareil (local), transmis à Stripe comme client_reference_id */
  deviceId: string;
  /** statut d'abonnement Stripe (synchronisé depuis le serveur) */
  subscription: SubscriptionState;
  /** quota mensuel d'essais de voix premium (offre Découverte) */
  voiceQuota: VoiceQuota;
  /** horodatage du dernier snapshot de synchro appliqué/envoyé */
  syncUpdatedAt: number;

  addEvent: (e: Omit<EventItem, 'id' | 'createdAt'>) => EventItem;
  updateEvent: (id: string, patch: Partial<Omit<EventItem, 'id' | 'createdAt'>>) => void;
  deleteEvent: (id: string) => void;
  moveEvent: (id: string, date: string, start: string) => void;

  addTask: (t: Omit<TaskItem, 'id' | 'createdAt' | 'done'>) => TaskItem;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  markBriefShown: () => void;
  markWelcomeShown: () => void;
  resetAll: () => void;
  /** applique une sauvegarde importée (déjà validée/sanitisée) */
  restoreBackup: (payload: BackupPayload) => void;
  setHydrated: () => void;

  setSubscription: (patch: Partial<SubscriptionState>) => void;
  /** enregistre une utilisation de voix premium ; renvoie le total utilisé ce mois-ci */
  recordPremiumVoice: () => number;
  setSyncUpdatedAt: (n: number) => void;
}

export const useStore = create<CenteryouState>()(
  persist(
    (set, get) => ({
      events: [],
      tasks: [],
      settings: defaultSettings,
      hydrated: false,
      deviceId: '',
      subscription: defaultSubscription,
      voiceQuota: defaultVoiceQuota,
      syncUpdatedAt: 0,

      addEvent: (e) => {
        const ev: EventItem = { ...e, id: uid(), createdAt: Date.now() };
        set((s) => ({ events: [...s.events, ev] }));
        return ev;
      },
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      moveEvent: (id, date, start) =>
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== id) return e;
            const duration = Math.max(15, minutesOf(e.end) - minutesOf(e.start));
            const maxStart = 24 * 60 - duration;
            const clamped = Math.min(Math.max(minutesOf(start), 0), Math.max(0, maxStart));
            return { ...e, date, start: timeOf(clamped), end: timeOf(clamped + duration) };
          }),
        })),

      addTask: (t) => {
        const task: TaskItem = { ...t, id: uid(), done: false, createdAt: Date.now() };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      markBriefShown: () =>
        set((s) => ({ settings: { ...s.settings, briefShownDate: todayISO() } })),
      markWelcomeShown: () =>
        set((s) => ({ settings: { ...s.settings, welcomeShownDate: todayISO() } })),
      resetAll: () =>
        set({
          events: [],
          tasks: [],
          settings: {
            ...defaultSettings,
            briefShownDate: get().settings.briefShownDate,
            welcomeShownDate: get().settings.welcomeShownDate,
          },
        }),
      restoreBackup: (payload) =>
        set({
          events: sanitizeEvents(payload.events),
          tasks: sanitizeTasks(payload.tasks),
          settings: sanitizeSettings(payload.settings),
        }),
      setHydrated: () => set({ hydrated: true }),

      setSubscription: (patch) =>
        set((s) => ({ subscription: { ...s.subscription, ...patch, updatedAt: Date.now() } })),
      recordPremiumVoice: () => {
        const month = currentMonth();
        const prev = get().voiceQuota;
        const used = prev.month === month ? prev.used + 1 : 1;
        set({ voiceQuota: { month, used } });
        return used;
      },
      setSyncUpdatedAt: (n) => set({ syncUpdatedAt: n }),
    }),
    {
      name: 'centeryou-v1',
      version: 2,
      skipHydration: true,
      // stockage résilient (Hugo) : localStorage corrompu -> copie de côté + état neuf,
      // quota plein -> message clair en français, aucune écriture ne plante l'app
      storage: createSafeStorage(),
      partialize: (s) => ({
        events: s.events,
        tasks: s.tasks,
        settings: s.settings,
        deviceId: s.deviceId,
        subscription: s.subscription,
        voiceQuota: s.voiceQuota,
        syncUpdatedAt: s.syncUpdatedAt,
      }),
      // v1 -> v2 (Dario) : ajout de theme + onboarded. Les utilisateurs existants (données
      // déjà présentes) sont considérés comme déjà onboardés ; seuls les nouveaux arrivants
      // voient le parcours d'accueil.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<CenteryouState>;
        if (version < 2) {
          return { ...p, settings: { ...sanitizeSettings(p.settings), onboarded: true } } as CenteryouState;
        }
        return persisted as CenteryouState;
      },
      // fusion douce + sanitation (Alpha/Hugo) : les entrées persistées malformées (localStorage
      // édité ou corrompu) sont écartées sans perdre les valides, pour éviter tout crash de
      // rendu ; les nouveaux champs (réglages theme/onboarded/darkMode, compte/paiement
      // deviceId/subscription/voiceQuota/syncUpdatedAt) prennent une valeur sûre par défaut
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CenteryouState>;
        return {
          ...current,
          events: sanitizeEvents(p.events),
          tasks: sanitizeTasks(p.tasks),
          settings: sanitizeSettings(p.settings),
          deviceId: typeof p.deviceId === 'string' ? p.deviceId : '',
          subscription: { ...defaultSubscription, ...p.subscription },
          voiceQuota: { ...defaultVoiceQuota, ...p.voiceQuota },
          syncUpdatedAt: typeof p.syncUpdatedAt === 'number' ? p.syncUpdatedAt : 0,
        };
      },
    },
  ),
);

export type { Category, Priority, Repeat, Theme, WelcomeSequenceMode };
