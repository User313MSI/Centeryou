import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyPayload, pullSync, type BackupPayload } from '../src/lib/sync';
import { useStore } from '../src/lib/store';
import { defaultSettings } from '../src/lib/defaults';
import { defaultSubscription } from '../src/lib/subscription';
import type { EventItem, TaskItem } from '../src/types';

/**
 * M-08 — sanitation item par item des payloads distants (Supabase / Stripe),
 * avec les mêmes sanitizers que la sauvegarde locale : un payload distant
 * malformé est réparé en douceur, jamais persisté tel quel (plus de crash de
 * rendu jusqu'au prochain rechargement).
 */

const validEvent: EventItem = {
  id: 'e1',
  title: 'Sport',
  date: '2026-11-20',
  start: '14:00',
  end: '15:00',
  category: 'perso',
  repeat: 'jamais',
  createdAt: 1,
};

const validTask: TaskItem = {
  id: 't1',
  title: 'Rapport',
  date: '2026-11-21',
  time: null,
  category: 'autre',
  priority: 'moyenne',
  done: false,
  createdAt: 2,
};

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings },
    subscription: { ...defaultSubscription, status: 'active', plan: 'premium', customerId: 'cus_x', updatedAt: 1 },
    syncUpdatedAt: 0,
    hydrated: true,
  });
});

describe('applyPayload (sauvegarde distante Supabase) — sanitation item par item (M-08)', () => {
  it('un payload malformé est réparé : les valides sont conservés, les invalides écartés, aucun crash', () => {
    applyPayload({
      v: 1,
      savedAt: 123,
      events: [validEvent, { id: '', title: 'x' }, 'pas un objet', { ...validEvent, id: 'e2', date: 'pas-une-date' }, null],
      tasks: [validTask, { title: 'sans id' }, 42],
      settings: { prenom: 42, dayStart: 999, theme: 'sombre', sounds: 'oui' },
    } as unknown as BackupPayload);
    const s = useStore.getState();
    expect(s.events).toEqual([validEvent]);
    expect(s.tasks).toEqual([validTask]);
    expect(s.settings.theme).toBe('sombre'); // champ valide conservé
    expect(s.settings.dayStart).toBe(10); // borné par sanitizeSettings (6–10)
    expect(s.settings.prenom).toBe(''); // champ malformé → défaut sûr
  });

  it('un payload entièrement valide s’applique tel quel', () => {
    applyPayload({ v: 1, savedAt: 5, events: [validEvent], tasks: [validTask], settings: { ...defaultSettings, prenom: 'Camille' } });
    const s = useStore.getState();
    expect(s.events).toEqual([validEvent]);
    expect(s.tasks).toEqual([validTask]);
    expect(s.settings.prenom).toBe('Camille');
  });
});

describe('pullSync (snapshot distant Stripe) — sanitation item par item (M-08)', () => {
  it('un snapshot malformé ne casse pas le store : items valides appliqués, le reste conservé localement', async () => {
    useStore.setState({ events: [validEvent], tasks: [validTask], syncUpdatedAt: 0 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            snapshot: {
              updatedAt: 999,
              state: {
                events: [{ ...validEvent, id: 'e9', title: 'Course' }, { id: 'x' }, 'garbage'],
                tasks: 'pas un tableau',
                settings: 42,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    await pullSync();
    const s = useStore.getState();
    expect(s.events.map((e) => e.id)).toEqual(['e9']); // valide appliqué, invalides écartés
    expect(s.tasks).toEqual([validTask]); // champ non tableau → état local conservé
    expect(s.settings).toEqual(defaultSettings); // réglages malformés → défauts sûrs
    expect(s.syncUpdatedAt).toBe(999);
    vi.unstubAllGlobals();
  });

  it('un snapshot valide s’applique normalement', async () => {
    useStore.setState({ events: [], tasks: [], syncUpdatedAt: 0 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            snapshot: { updatedAt: 50, state: { events: [validEvent], tasks: [validTask], settings: { ...defaultSettings, prenom: 'Léa' } } },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    await pullSync();
    const s = useStore.getState();
    expect(s.events).toEqual([validEvent]);
    expect(s.tasks).toEqual([validTask]);
    expect(s.settings.prenom).toBe('Léa');
    expect(s.syncUpdatedAt).toBe(50);
    vi.unstubAllGlobals();
  });

  it('updatedAt non numérique → snapshot ignoré, état local intact', async () => {
    useStore.setState({ events: [validEvent], syncUpdatedAt: 0 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ snapshot: { updatedAt: 'demain', state: { events: [] } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await pullSync();
    expect(useStore.getState().events).toEqual([validEvent]);
    expect(useStore.getState().syncUpdatedAt).toBe(0);
    vi.unstubAllGlobals();
  });
});
