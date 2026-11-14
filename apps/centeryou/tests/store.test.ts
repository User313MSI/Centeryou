import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventOccursOn, eventsOnDate } from '../src/lib/events';
import { defaultSettings } from '../src/lib/defaults';
import { getStorageReport, resetStorageReport } from '../src/lib/safe-storage';
import { useStore } from '../src/lib/store';
import { addDaysISO, todayISO } from '../src/lib/dates';
import type { EventItem } from '../src/types';

const STORAGE_KEY = 'centeryou-v1';

function resetStore() {
  window.localStorage.clear();
  resetStorageReport();
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings },
    hydrated: true,
  });
}

beforeEach(resetStore);

describe('store Zustand — événements', () => {
  it('addEvent crée un événement avec id et createdAt', () => {
    const ev = useStore.getState().addEvent({
      title: 'Sport',
      date: '2025-01-07',
      start: '14:00',
      end: '15:00',
      category: 'perso',
      repeat: 'jamais',
    });
    expect(ev.id).toBeTruthy();
    expect(ev.createdAt).toBeGreaterThan(0);
    expect(useStore.getState().events).toHaveLength(1);
    expect(useStore.getState().events[0].title).toBe('Sport');
  });

  it('updateEvent modifie uniquement l’événement ciblé', () => {
    const a = useStore.getState().addEvent({ title: 'A', date: '2025-01-07', start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais' });
    const b = useStore.getState().addEvent({ title: 'B', date: '2025-01-07', start: '12:00', end: '13:00', category: 'autre', repeat: 'jamais' });
    useStore.getState().updateEvent(a.id, { title: 'A2' });
    expect(useStore.getState().events.find((e) => e.id === a.id)?.title).toBe('A2');
    expect(useStore.getState().events.find((e) => e.id === b.id)?.title).toBe('B');
  });

  it('deleteEvent supprime l’événement', () => {
    const ev = useStore.getState().addEvent({ title: 'A', date: '2025-01-07', start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais' });
    useStore.getState().deleteEvent(ev.id);
    expect(useStore.getState().events).toHaveLength(0);
  });

  it('moveEvent conserve la durée et borne dans la journée', () => {
    const ev = useStore.getState().addEvent({ title: 'A', date: '2025-01-07', start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais' });
    useStore.getState().moveEvent(ev.id, '2025-01-08', '23:30');
    const moved = useStore.getState().events[0];
    expect(moved.date).toBe('2025-01-08');
    expect(moved.start).toBe('23:00'); // 60 min de durée -> début max 23:00
    expect(moved.end).toBe('23:59');
  });
});

describe('store Zustand — tâches', () => {
  it('addTask / toggleTask / deleteTask', () => {
    const t = useStore.getState().addTask({ title: 'Sport', date: todayISO(), time: null, category: 'perso', priority: 'haute' });
    expect(t.done).toBe(false);
    useStore.getState().toggleTask(t.id);
    expect(useStore.getState().tasks[0].done).toBe(true);
    useStore.getState().toggleTask(t.id);
    expect(useStore.getState().tasks[0].done).toBe(false);
    useStore.getState().deleteTask(t.id);
    expect(useStore.getState().tasks).toHaveLength(0);
  });
});

describe('store Zustand — récurrence', () => {
  const base: Omit<EventItem, 'id' | 'createdAt'> = { title: 'Stand-up', date: '2025-01-06', start: '09:00', end: '09:30', category: 'travail', repeat: 'jamais' };

  it('jamais : uniquement à sa date', () => {
    const ev = useStore.getState().addEvent(base);
    expect(eventOccursOn(ev, '2025-01-06')).toBe(true);
    expect(eventOccursOn(ev, '2025-01-07')).toBe(false);
  });

  it('jour : tous les jours à partir de sa date', () => {
    const ev = useStore.getState().addEvent({ ...base, repeat: 'jour' });
    expect(eventsOnDate([ev], '2025-01-06')).toHaveLength(1);
    expect(eventsOnDate([ev], '2025-02-14')).toHaveLength(1);
    expect(eventsOnDate([ev], '2025-01-05')).toHaveLength(0); // avant la date de référence
  });

  it('semaine : même jour de semaine', () => {
    const ev = useStore.getState().addEvent({ ...base, repeat: 'semaine' }); // lundi
    expect(eventsOnDate([ev], '2025-01-13')).toHaveLength(1); // lundi suivant
    expect(eventsOnDate([ev], '2025-01-08')).toHaveLength(0); // mercredi
  });

  it('mois : même quantième', () => {
    const ev = useStore.getState().addEvent({ ...base, date: '2025-01-15', repeat: 'mois' });
    expect(eventsOnDate([ev], '2025-02-15')).toHaveLength(1);
    expect(eventsOnDate([ev], '2025-02-16')).toHaveLength(0);
  });
});

describe('store Zustand — réglages', () => {
  it('updateSettings fusionne sans écraser les autres champs', () => {
    useStore.getState().updateSettings({ prenom: 'Camille' });
    useStore.getState().updateSettings({ sounds: false });
    const s = useStore.getState().settings;
    expect(s.prenom).toBe('Camille');
    expect(s.sounds).toBe(false);
    expect(s.voice).toBe(true);
    expect(s.dayStart).toBe(8);
  });

  it('markBriefShown / markWelcomeShown datent aujourd’hui', () => {
    useStore.getState().markBriefShown();
    useStore.getState().markWelcomeShown();
    expect(useStore.getState().settings.briefShownDate).toBe(todayISO());
    expect(useStore.getState().settings.welcomeShownDate).toBe(todayISO());
  });

  it('resetAll vide données mais conserve les marqueurs de brief/accueil', () => {
    useStore.getState().addEvent({ title: 'A', date: '2025-01-07', start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais' });
    useStore.getState().addTask({ title: 'T', date: todayISO(), time: null, category: 'autre', priority: 'moyenne' });
    useStore.getState().updateSettings({ prenom: 'Camille' });
    useStore.getState().markBriefShown();
    useStore.getState().resetAll();
    const s = useStore.getState();
    expect(s.events).toHaveLength(0);
    expect(s.tasks).toHaveLength(0);
    expect(s.settings.prenom).toBe('');
    expect(s.settings.briefShownDate).toBe(todayISO());
  });
});

describe('persistance localStorage', () => {
  it('chaque écriture est persistée sous la clé centeryou-v1', () => {
    useStore.getState().addTask({ title: 'Sport', date: '2025-01-07', time: '14:00', category: 'perso', priority: 'moyenne' });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.version).toBe(1);
    expect(parsed.state.tasks[0].title).toBe('Sport');
  });

  it('localStorage corrompu (JSON invalide) -> réparation douce, sauvegarde de côté, aucun crash', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{ ceci n’est pas du json valide !!!');
    await expect(useStore.persist.rehydrate()).resolves.not.toThrow();
    expect(useStore.getState().events).toEqual([]);
    expect(useStore.getState().tasks).toEqual([]);
    const report = getStorageReport();
    expect(report.status).toBe('corrupt');
    expect(report.message).toContain('lisibles');
    expect(report.backupKey).toBeTruthy();
    // la valeur corrompue est conservée (aucune perte)
    expect(window.localStorage.getItem(report.backupKey as string)).toBe('{ ceci n’est pas du json valide !!!');
  });

  it('état persisté partiellement invalide -> seuls les éléments valides sont conservés', async () => {
    const validEvent = { id: 'e1', title: 'Réunion', date: '2025-01-06', start: '10:00', end: '11:00', category: 'travail', repeat: 'jamais', createdAt: 1 };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          events: [validEvent, { id: 'bad' }, 'pas un objet', { ...validEvent, id: 'e2', date: 'pas-une-date' }],
          tasks: 'pas un tableau',
          settings: { prenom: 'Camille' },
        },
        version: 1,
      }),
    );
    await useStore.persist.rehydrate();
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0].id).toBe('e1');
    expect(s.tasks).toEqual([]);
    // réglages : champ présent conservé, autres complétés par défaut
    expect(s.settings.prenom).toBe('Camille');
    expect(s.settings.dayStart).toBe(8);
    expect(s.settings.welcomeSequence).toBe('daily');
  });

  it('quota plein -> aucun crash, message clair exposé, dernière valeur conservée en mémoire', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() =>
      useStore.getState().addTask({ title: 'Sport', date: '2025-01-07', time: null, category: 'autre', priority: 'moyenne' }),
    ).not.toThrow();
    // l’action a bien eu lieu en mémoire
    expect(useStore.getState().tasks).toHaveLength(1);
    const report = getStorageReport();
    expect(report.status).toBe('full');
    expect(report.message).toContain('plein');
    setItemSpy.mockRestore();
  });

  it('écritures protégées : setItem qui plante ne casse pas l’app et la lecture retombe sur la mémoire', async () => {
    useStore.getState().addTask({ title: 'Courses', date: '2025-01-07', time: null, category: 'autre', priority: 'moyenne' });
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => useStore.getState().addTask({ title: 'Pain', date: '2025-01-07', time: null, category: 'autre', priority: 'moyenne' })).not.toThrow();
    expect(getStorageReport().status).toBe('unavailable');
    expect(useStore.getState().tasks).toHaveLength(2);
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('restoreBackup applique une sauvegarde en ne gardant que les éléments valides', () => {
    useStore.getState().restoreBackup({
      app: 'centeryou',
      version: 1,
      exportedAt: '2025-01-06T10:00:00.000Z',
      events: [
        { id: 'e1', title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'semaine', createdAt: 1 },
        { id: 'bad' } as never,
      ],
      tasks: [
        { id: 't1', title: 'Rapport', date: '2025-01-10', time: null, category: 'travail', priority: 'haute', done: false, createdAt: 2 },
      ],
      settings: { ...defaultSettings, prenom: 'Léa' },
    });
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0].repeat).toBe('semaine');
    expect(s.tasks).toHaveLength(1);
    expect(s.settings.prenom).toBe('Léa');
  });
});
