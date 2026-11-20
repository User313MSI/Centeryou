import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// mock partiel du domaine rappels : on garde la logique pure, on espionne l'affichage réel
const showSpy = vi.fn(async (_n: unknown) => true);
vi.mock('../src/lib/rappels', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/lib/rappels')>();
  return {
    ...orig,
    showRappelNotification: (n: unknown) => showSpy(n),
    rappelPermission: () => 'granted' as const,
    notificationActionsSupported: () => true,
  };
});

import { defaultSettings } from '../src/lib/defaults';

import { loadRappelState, occurrenceKey, RAPPEL_STATE_KEY, type RappelNotification } from '../src/lib/rappels';

import { consumeRappelParam, handleRappelAction, runRappelTick, startRappelService, RAPPEL_TICK_MS } from '../src/lib/rappels-service';

import { useStore } from '../src/lib/store';

import { useUiStore } from '../src/lib/ui-store';

import type { EventItem, Settings, TaskItem } from '../src/types';

const TODAY = '2026-11-20';
const at = (h: number, m: number, s = 0) => new Date(2026, 10, 20, h, m, s);

function ev(over: Partial<EventItem> = {}): EventItem {
  return {
    id: 'e1',
    title: 'Réunion équipe',
    date: TODAY,
    start: '10:00',
    end: '11:00',
    category: 'travail',
    repeat: 'jamais',
    createdAt: 1,
    reminderMinutes: 10,
    ...over,
  };
}

function settings(over: Partial<Settings> = {}): Settings {
  return { ...defaultSettings, ...over };
}

function taskToday(done = false): TaskItem {
  return { id: `t${Math.random()}`, title: 'Rapport', date: TODAY, time: null, category: 'travail', priority: 'moyenne', done, createdAt: 2 };
}

/** deps de tick fully injectées : état tampon en mémoire, pas de localStorage */
function makeDeps(opts: {
  now: Date;
  events?: EventItem[];
  tasks?: TaskItem[];
  settings?: Settings;
  permission?: 'granted' | 'denied' | 'default' | 'unsupported';
  actionsSupported?: boolean;
  state?: ReturnType<typeof loadRappelState>;
}) {
  let state = opts.state ?? loadRappelState();
  const shown: RappelNotification[] = [];
  const toasts: { message: string; actionLabel?: string }[] = [];
  const deps = {
    now: () => opts.now,
    permission: () => opts.permission ?? 'granted',
    actionsSupported: () => opts.actionsSupported ?? true,
    show: (n: RappelNotification) => {
      shown.push(n);
      return true;
    },
    pushToast: (t: { message: string; actionLabel?: string }) => {
      toasts.push(t);
    },
    getData: () => ({ events: opts.events ?? [], tasks: opts.tasks ?? [], settings: opts.settings ?? settings() }),
    getRappelState: () => state,
    saveRappelState: (s: typeof state) => {
      state = s;
    },
  };
  return { deps, shown, toasts, getState: () => state };
}

beforeEach(() => {
  window.localStorage.clear();
  showSpy.mockClear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
  useUiStore.setState({ toasts: [], highlightEventId: null, highlightAt: 0 });
  window.history.replaceState(null, '', '/aujourdhui');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Moteur — runRappelTick (déclenchement, anti-spam, permission)', () => {
  it('déclenche à l’heure exacte et affiche UNE notification (titre = événement, actions Terminé/Reporter)', async () => {
    const { deps, shown, getState } = makeDeps({ now: at(9, 50), events: [ev()] });
    await runRappelTick(deps);
    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe('Réunion équipe');
    expect(shown[0].body).toContain('10h00');
    expect(shown[0].actions?.map((a) => a.action)).toEqual(['done', 'snooze']);
    expect(getState().notifies).toContain(occurrenceKey('e1', TODAY));
  });

  it('anti-doublons : un second tick ne réaffiche rien (tampon persisté entre les appels)', async () => {
    const { deps, shown } = makeDeps({ now: at(9, 50), events: [ev()] });
    await runRappelTick(deps);
    await runRappelTick(deps); // même tick
    deps.now = () => at(9, 51);
    await runRappelTick(deps); // tick suivant
    expect(shown).toHaveLength(1);
  });

  it('permission refusée : AUCUNE notification, tampon non marqué (rien d’envoyé, rien de perdu)', async () => {
    const { deps, shown, getState } = makeDeps({ now: at(9, 50), events: [ev()], permission: 'denied' });
    const s = await runRappelTick(deps);
    expect(shown).toHaveLength(0);
    expect(s.notifies).toEqual([]);
    expect(getState().notifies).toEqual([]);
  });

  it('permission non accordée (default) : idem, aucune notification', async () => {
    const { deps, shown } = makeDeps({ now: at(9, 50), events: [ev()], permission: 'default' });
    await runRappelTick(deps);
    expect(shown).toHaveLength(0);
  });

  it('réglage global coupé : aucune notification même avec permission accordée', async () => {
    const { deps, shown } = makeDeps({ now: at(9, 50), events: [ev()], settings: settings({ reminders: false }) });
    await runRappelTick(deps);
    expect(shown).toHaveLength(0);
  });

  it('événement supprimé avant le rappel : pas de notification fantôme', async () => {
    const { deps, shown } = makeDeps({ now: at(9, 50), events: [ev()] });
    deps.getData = () => ({ events: [], tasks: [], settings: settings() }); // supprimé entre-temps
    await runRappelTick(deps);
    expect(shown).toHaveLength(0);
  });

  it('sans actions supportées : notification sans boutons + toast dans l’app avec « Reporter »', async () => {
    const { deps, shown, toasts } = makeDeps({ now: at(9, 50), events: [ev()], actionsSupported: false });
    await runRappelTick(deps);
    expect(shown).toHaveLength(1);
    expect(shown[0].actions).toBeUndefined();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].actionLabel).toBe('Reporter');
    expect(toasts[0].message).toContain('Réunion équipe');
  });

  it('le toast « Reporter » reprogramme bien le rappel (snooze) : notif à 9h56, une seule fois', async () => {
    const t0 = makeDeps({ now: at(9, 50), events: [ev()], actionsSupported: false });
    await runRappelTick(t0.deps);
    // l'utilisateur clique « Reporter » dans le toast (action différée du toast)
    const key = occurrenceKey('e1', TODAY);
    const { snoozeOccurrence } = await import('../src/lib/rappels');
    const s = snoozeOccurrence(t0.getState(), key, at(9, 51).getTime());
    const t1 = makeDeps({ now: at(9, 55), events: [ev()], state: s });
    await runRappelTick(t1.deps);
    expect(t1.shown).toHaveLength(0); // pas encore
    const t2 = makeDeps({ now: at(9, 56), events: [ev()], state: t1.getState() });
    await runRappelTick(t2.deps);
    expect(t2.shown).toHaveLength(1);
    expect(t2.shown[0].body).toContain('reporté');
    const t3 = makeDeps({ now: at(9, 57), events: [ev()], state: t2.getState() });
    await runRappelTick(t3.deps);
    expect(t3.shown).toHaveLength(0); // une seule fois
  });

  it('rappel des tâches : à 9h00, 2 tâches non faites -> notification récapitulative, une fois par jour', async () => {
    const tasks = [taskToday(false), taskToday(false)];
    const t0 = makeDeps({ now: at(9, 0), tasks });
    await runRappelTick(t0.deps);
    expect(t0.shown).toHaveLength(1);
    expect(t0.shown[0].title).toBe('Il te reste 2 tâches aujourd’hui');
    expect(t0.getState().tachesDate).toBe(TODAY);
    // même jour, tick suivant : plus rien
    const t1 = makeDeps({ now: at(9, 30), tasks, state: t0.getState() });
    await runRappelTick(t1.deps);
    expect(t1.shown).toHaveLength(0);
  });

  it('rappel des tâches désactivé indépendamment : rien', async () => {
    const t0 = makeDeps({ now: at(9, 0), tasks: [taskToday(false)], settings: settings({ tasksReminder: false }) });
    await runRappelTick(t0.deps);
    expect(t0.shown).toHaveLength(0);
    expect(t0.getState().tachesDate).toBe('');
  });
});

describe('Moteur — actions de la notification (Terminé / Reporter / clic)', () => {
  it('« Terminé » (fait) : tamponne l’occurrence, plus jamais de notification', async () => {
    handleRappelAction({ kind: 'fait', value: occurrenceKey('e1', TODAY) });
    expect(loadRappelState().fait).toContain(occurrenceKey('e1', TODAY));
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('plus aucun rappel'))).toBe(true);
    const { deps, shown } = makeDeps({ now: at(9, 50), events: [ev()] });
    await runRappelTick(deps);
    expect(shown).toHaveLength(0);
  });

  it('« Reporter de 5 min » (reporter) : reprogramme à 9h56, une seule notification ensuite', async () => {
    handleRappelAction({ kind: 'reporter', value: occurrenceKey('e1', TODAY) });
    const s = loadRappelState();
    expect(s.snoozes[occurrenceKey('e1', TODAY)]).toBeGreaterThan(at(9, 50).getTime());
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('reporté de 5 minutes'))).toBe(true);
  });

  it('clic simple (voir) : met l’événement en vedette + toast d’info', () => {
    useStore.setState({ events: [ev()] });
    handleRappelAction({ kind: 'voir', value: 'e1' });
    expect(useUiStore.getState().highlightEventId).toBe('e1');
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('Réunion équipe') && t.message.includes('10h00'))).toBe(true);
  });

  it('clic sur un événement supprimé : toast honnête, aucune mise en vedette', () => {
    handleRappelAction({ kind: 'voir', value: 'inconnu' });
    expect(useUiStore.getState().highlightEventId).toBeNull();
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('n’existe plus'))).toBe(true);
  });

  it('consumeRappelParam : lit ?rappel=… dans l’URL, applique l’action, nettoie l’URL', () => {
    useStore.setState({ events: [ev()] });
    window.history.replaceState(null, '', '/aujourdhui?rappel=voir:e1');
    consumeRappelParam();
    expect(useUiStore.getState().highlightEventId).toBe('e1');
    expect(window.location.search).toBe('');
  });
});

describe('Moteur — startRappelService (boucle 30 s, lazy)', () => {
  it('démarre, vérifie immédiatement puis toutes les 30 s, s’arrête proprement, sans doublon', async () => {
    vi.useFakeTimers();
    useStore.setState({ events: [ev()], settings: settings() });
    window.localStorage.removeItem(RAPPEL_STATE_KEY);
    // "maintenant" figé à 9h50 pour le moteur réel (runRappelTick sans deps lit new Date())
    vi.setSystemTime(at(9, 50));
    const stop = startRappelService();
    await vi.advanceTimersByTimeAsync(0); // tick immédiat
    expect(showSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RAPPEL_TICK_MS); // 2e tick : tampon -> rien
    expect(showSpy).toHaveBeenCalledTimes(1);
    vi.setSystemTime(at(9, 51));
    await vi.advanceTimersByTimeAsync(RAPPEL_TICK_MS);
    expect(showSpy).toHaveBeenCalledTimes(1); // toujours rien (anti-doublons)
    stop();
    vi.setSystemTime(at(9, 55));
    await vi.advanceTimersByTimeAsync(2 * RAPPEL_TICK_MS);
    expect(showSpy).toHaveBeenCalledTimes(1); // arrêté : plus de tick
  });

  it('ne notifie rien si la permission est refusée (domaine réel mocké à granted, mais store vide = rien à due)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(9, 50));
    useStore.setState({ events: [], settings: settings() });
    const stop = startRappelService();
    await vi.advanceTimersByTimeAsync(RAPPEL_TICK_MS * 2);
    expect(showSpy).not.toHaveBeenCalled();
    stop();
  });
});
