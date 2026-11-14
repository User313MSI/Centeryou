'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, EventItem, Priority, Repeat, Settings, TaskItem, WelcomeSequenceMode } from '../types';
import { minutesOf, timeOf, todayISO } from './dates';
import { uid } from './utils';

export const defaultSettings: Settings = {
  prenom: '',
  dayStart: 8,
  sounds: true,
  voice: true,
  briefShownDate: '',
  welcomeSequence: 'daily',
  welcomeShownDate: '',
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
          },
        }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'centeryou-v1',
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ events: s.events, tasks: s.tasks, settings: s.settings }),
      // fusion douce : les nouveaux champs de réglages prennent leur valeur par défaut
      // si l'état persisté (version antérieure) ne les contient pas
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<CenteryouState>),
        settings: { ...defaultSettings, ...(persisted as { settings?: Partial<Settings> } | undefined)?.settings },
      }),
    },
  ),
);

export type { Category, Priority, Repeat, WelcomeSequenceMode };
