'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, EventItem, Priority, Repeat, Settings, TaskItem, WelcomeSequenceMode } from '../types';
import { minutesOf, parseISO, timeOf, todayISO } from './dates';
import { uid } from './utils';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const CATEGORIES: readonly Category[] = ['travail', 'perso', 'sante', 'focus', 'autre'];
const REPEATS: readonly Repeat[] = ['jamais', 'jour', 'semaine', 'mois'];
const PRIORITIES: readonly Priority[] = ['basse', 'moyenne', 'haute'];

function isValidDate(iso: unknown): iso is string {
  return typeof iso === 'string' && ISO_DATE.test(iso) && !Number.isNaN(parseISO(iso).getTime());
}

function isValidEvent(e: unknown): e is EventItem {
  const v = e as Partial<EventItem> | null;
  return (
    !!v &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    isValidDate(v.date) &&
    typeof v.start === 'string' && HH_MM.test(v.start) &&
    typeof v.end === 'string' && HH_MM.test(v.end) &&
    CATEGORIES.includes(v.category as Category) &&
    REPEATS.includes(v.repeat as Repeat) &&
    typeof v.createdAt === 'number'
  );
}

function isValidTask(t: unknown): t is TaskItem {
  const v = t as Partial<TaskItem> | null;
  return (
    !!v &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    isValidDate(v.date) &&
    (v.time === null || (typeof v.time === 'string' && HH_MM.test(v.time))) &&
    CATEGORIES.includes(v.category as Category) &&
    PRIORITIES.includes(v.priority as Priority) &&
    typeof v.done === 'boolean' &&
    typeof v.createdAt === 'number'
  );
}

function sanitizeSettings(s: Partial<Settings> | undefined): Settings {
  const dayStart = Number(s?.dayStart);
  return {
    ...defaultSettings,
    ...(s ?? {}),
    dayStart: Number.isFinite(dayStart) ? Math.min(10, Math.max(6, dayStart)) : defaultSettings.dayStart,
  };
}

export const defaultSettings: Settings = {
  prenom: '',
  dayStart: 8,
  sounds: true,
  voice: true,
  briefShownDate: '',
  welcomeSequence: 'daily',
  welcomeShownDate: '',
  onboarded: false,
};

interface CenteryouState {
  events: EventItem[];
  tasks: TaskItem[];
  settings: Settings;
  hydrated: boolean;

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
  setHydrated: () => void;
}

export const useStore = create<CenteryouState>()(
  persist(
    (set, get) => ({
      events: [],
      tasks: [],
      settings: defaultSettings,
      hydrated: false,

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
            onboarded: get().settings.onboarded,
          },
        }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'centeryou-v1',
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ events: s.events, tasks: s.tasks, settings: s.settings }),
      // fusion douce + sanitation : les entrées persistées malformées (localStorage édité
      // ou corrompu) sont ignorées pour éviter tout crash de rendu ; les nouveaux champs
      // de réglages prennent leur valeur par défaut si absents de l'état persisté
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CenteryouState>;
        return {
          ...current,
          events: Array.isArray(p.events) ? p.events.filter(isValidEvent) : [],
          tasks: Array.isArray(p.tasks) ? p.tasks.filter(isValidTask) : [],
          settings: sanitizeSettings(p.settings),
        };
      },
    },
  ),
);

export type { Category, Priority, Repeat, WelcomeSequenceMode };
