import { beforeEach, describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/reglages',
}));

import ReglagesPage from '../src/app/reglages/page';

import { EventBlock } from '../src/components/events/event-block';

import { motionAllowed, spawnConfetti, vibrateShort } from '../src/lib/celebrate';

import { defaultSettings } from '../src/lib/defaults';

import type { CalendarInstance } from '../src/lib/events';

import {
  CELEBRATE_PALETTE,
  animationsActiveFrom,
  isNewRecord,
  prefersReducedMotion,
  readRecord,
  writeRecord,
  type RecordStorage,
} from '../src/lib/motion';

import { sanitizeSettings } from '../src/lib/sanitize';

import { useStore } from '../src/lib/store';

import { EXIT_ANIMATION_MS, useUiStore } from '../src/lib/ui-store';

import { useMotionEnabled } from '../src/lib/use-motion';

const requestExit = (id: string, done: () => void) => useUiStore.getState().requestExit(id, done);
const cancelExit = (id: string) => useUiStore.getState().cancelExit(id);

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
  useUiStore.setState({ toasts: [], exitingIds: [] });
});

/* ---------- Réglage « Animations & célébrations » ---------- */

describe('Réglage « Animations & célébrations »', () => {
  it('est activé par défaut', () => {
    expect(defaultSettings.animations).toBe(true);
    expect(sanitizeSettings(undefined).animations).toBe(true);
    expect(sanitizeSettings({ prenom: 'Léa' }).animations).toBe(true); // champ absent -> défaut sûr
  });

  it('est persisté tel quel quand il est valide, et réparé sinon', () => {
    expect(sanitizeSettings({ animations: false }).animations).toBe(false);
    expect(sanitizeSettings({ animations: true }).animations).toBe(true);
    expect(sanitizeSettings({ animations: 'oui' }).animations).toBe(true); // valeur malformée -> défaut
    expect(sanitizeSettings({ prenom: 'Léa', animations: false }).prenom).toBe('Léa'); // autres champs préservés
  });

  it('la page Réglages affiche la bascule « Animations & célébrations » (cochée par défaut) qui pilote le store', () => {
    render(<ReglagesPage />);
    const toggle = screen.getByRole('switch', { name: /animations & célébrations/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(useStore.getState().settings.animations).toBe(false);
    fireEvent.click(toggle);
    expect(useStore.getState().settings.animations).toBe(true);
  });
});

/* ---------- motion.ts (aides pures) ---------- */

describe('motion — activation des animations', () => {
  it('actives si le réglage est activé et prefers-reduced-motion inactif', () => {
    expect(prefersReducedMotion()).toBe(false); // bouchon setup.ts : matches = false
    expect(animationsActiveFrom({ animations: true })).toBe(true);
  });

  it('inactives si le réglage est désactivé', () => {
    expect(animationsActiveFrom({ animations: false })).toBe(false);
  });

  it('inactives si le système demande prefers-reduced-motion, même avec le réglage activé', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia);
    expect(prefersReducedMotion()).toBe(true);
    expect(animationsActiveFrom({ animations: true })).toBe(false);
    spy.mockRestore();
  });

  it('useMotionEnabled reflète le réglage (sonde React)', () => {
    function Probe() {
      const on = useMotionEnabled();
      return <span data-testid="motion">{on ? 'oui' : 'non'}</span>;
    }
    useStore.setState({ settings: { ...defaultSettings, animations: true } });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('motion').textContent).toBe('oui');
    act(() => {
      useStore.setState({ settings: { ...defaultSettings, animations: false } });
    });
    expect(getByTestId('motion').textContent).toBe('non');
  });
});

describe('motion — records (/stats)', () => {
  it('isNewRecord : battu uniquement si strictement supérieur et > 0', () => {
    expect(isNewRecord(0, 3)).toBe(true);
    expect(isNewRecord(2, 3)).toBe(true);
    expect(isNewRecord(3, 3)).toBe(false);
    expect(isNewRecord(5, 3)).toBe(false);
    expect(isNewRecord(0, 0)).toBe(false);
    expect(isNewRecord(0, -1)).toBe(false);
  });

  it('readRecord / writeRecord : stockage factice, valeurs sûres', () => {
    const m = new Map<string, string>();
    const storage: RecordStorage = {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => {
        m.set(k, v);
      },
    };
    expect(readRecord(storage, 'centeryou-record-serie')).toBe(0); // absent
    writeRecord(storage, 'centeryou-record-serie', 4);
    expect(readRecord(storage, 'centeryou-record-serie')).toBe(4);
    m.set('centeryou-record-serie', 'abc');
    expect(readRecord(storage, 'centeryou-record-serie')).toBe(0); // illisible -> 0
    m.set('centeryou-record-serie', '-3');
    expect(readRecord(storage, 'centeryou-record-serie')).toBe(0); // négatif -> 0
    expect(readRecord(undefined, 'x')).toBe(0); // pas de stockage
    const quiLance = { getItem: () => { throw new Error('plein'); }, setItem: () => { throw new Error('plein'); } };
    expect(readRecord(quiLance, 'x')).toBe(0); // lecture en échec -> 0, sans exception
    expect(() => writeRecord(quiLance, 'x', 2)).not.toThrow(); // écriture en échec -> silencieuse
  });

  it('palette des célébrations adossée aux tokens de marque', () => {
    expect(CELEBRATE_PALETTE).toHaveLength(4);
    expect(CELEBRATE_PALETTE[0]).toBe('rgb(var(--c-primary))'); // #7C5CFF
    expect(CELEBRATE_PALETTE[1]).toBe('rgb(var(--c-primarydark))'); // #5B3FE8
    expect(CELEBRATE_PALETTE[2]).toBe('rgb(var(--c-voice))'); // #2DD4BF
    expect(CELEBRATE_PALETTE[3]).toBe('rgb(var(--c-warning))'); // #FFB020
    expect(EXIT_ANIMATION_MS).toBeGreaterThan(0);
  });
});

/* ---------- celebrate (effets DOM) ---------- */

describe('celebrate — effets DOM', () => {
  it('motionAllowed reflète le réglage + prefers-reduced-motion', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: true } });
    expect(motionAllowed()).toBe(true);
    useStore.setState({ settings: { ...defaultSettings, animations: false } });
    expect(motionAllowed()).toBe(false);
  });

  it('spawnConfetti : micro-confettis DANS le bloc hôte (jamais plein écran), nettoyés ensuite', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: true } });
    vi.useFakeTimers();
    try {
      const host = document.createElement('div');
      document.body.appendChild(host);
      spawnConfetti(host);
      const overlay = host.querySelector('.celebrate-confetti');
      expect(overlay).toBeTruthy();
      expect(overlay?.childElementCount).toBe(12); // micro-confettis discrets
      expect(document.querySelectorAll('.celebrate-confetti')).toHaveLength(1); // contenu dans le bloc
      vi.advanceTimersByTime(2100); // sécurité de nettoyage
      expect(host.querySelector('.celebrate-confetti')).toBeNull();
      host.remove();
    } finally {
      vi.useRealTimers();
    }
  });

  it('spawnConfetti ne crée RIEN si les animations sont désactivées', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: false } });
    const host = document.createElement('div');
    document.body.appendChild(host);
    spawnConfetti(host);
    expect(host.querySelector('.celebrate-confetti')).toBeNull();
    expect(document.querySelector('.celebrate-confetti')).toBeNull();
    host.remove();
  });

  it('vibrateShort : vibration très courte (30 ms) uniquement si les animations sont actives', () => {
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      useStore.setState({ settings: { ...defaultSettings, animations: true } });
      vibrateShort();
      expect(vibrate).toHaveBeenCalledWith(30);
      vibrate.mockClear();
      useStore.setState({ settings: { ...defaultSettings, animations: false } });
      vibrateShort();
      expect(vibrate).not.toHaveBeenCalled();
    } finally {
      delete (window.navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });
});

/* ---------- exit (suppression douce) ---------- */

describe('exit — sortie douce avant suppression', () => {
  it('avec animations actives : la suppression réelle attend la mini-animation', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: true } });
    vi.useFakeTimers();
    try {
      const done = vi.fn();
      requestExit('task:t1', done);
      expect(useUiStore.getState().exitingIds).toContain('task:t1');
      expect(done).not.toHaveBeenCalled();
      vi.advanceTimersByTime(EXIT_ANIMATION_MS + 10);
      expect(done).toHaveBeenCalledTimes(1);
      expect(useUiStore.getState().exitingIds).not.toContain('task:t1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancelExit annule la suppression programmée (bouton « Annuler »)', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: true } });
    vi.useFakeTimers();
    try {
      const done = vi.fn();
      requestExit('task:t2', done);
      expect(cancelExit('task:t2')).toBe(true); // sortie encore en cours -> rien à restaurer
      vi.advanceTimersByTime(1000);
      expect(done).not.toHaveBeenCalled();
      expect(useUiStore.getState().exitingIds).not.toContain('task:t2');
      expect(cancelExit('task:t2')).toBe(false); // plus rien à annuler
    } finally {
      vi.useRealTimers();
    }
  });

  it('avec animations désactivées : la suppression redevient immédiate (délai 0)', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: false } });
    vi.useFakeTimers();
    try {
      const done = vi.fn();
      requestExit('task:t3', done);
      vi.advanceTimersByTime(1);
      expect(done).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ---------- EventBlock (composant) ---------- */

function makeEventInstance(createdAt: number): CalendarInstance {
  const event = {
    id: 'e1',
    title: 'Sport',
    date: '2026-11-20',
    start: '14:00',
    end: '15:00',
    category: 'perso' as const,
    repeat: 'jamais' as const,
    createdAt,
  };
  return { kind: 'event', id: 'e1', title: 'Sport', category: 'perso', date: '2026-11-20', start: '14:00', end: '15:00', done: false, event };
}

const noop = () => {};

describe('EventBlock — célébrations', () => {
  it('événement frais : apparition élastique + halo + onde violette depuis le bloc', async () => {
    useStore.setState({ settings: { ...defaultSettings, animations: true } });
    const { container } = render(
      <EventBlock instance={makeEventInstance(Date.now())} pxPerMin={1} dayStartMin={8 * 60} onEventClick={noop} onTaskToggle={noop} onDropAt={noop} />,
    );
    expect(container.querySelector('.animate-event-celebrate')).toBeTruthy();
    expect(container.querySelector('.celebrate-halo.animate-halo')).toBeTruthy();
    // onde depuis le point de création (import dynamique du chunk des célébrations)
    await waitFor(() => expect(document.querySelector('.celebrate-ripple')).toBeTruthy());
    document.querySelectorAll('.celebrate-ripple').forEach((e) => e.remove());
  });

  it('réglage désactivé : aucune onde JS créée (les classes CSS restent posées, tuées par html.animations-off)', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: false } });
    const { container } = render(
      <EventBlock instance={makeEventInstance(Date.now())} pxPerMin={1} dayStartMin={8 * 60} onEventClick={noop} onTaskToggle={noop} onDropAt={noop} />,
    );
    expect(container.querySelector('.animate-event-celebrate')).toBeTruthy();
    expect(document.querySelector('.celebrate-ripple')).toBeNull();
  });

  it('suppression en cours : classe animate-exit (rétrécissement + fondu)', () => {
    useUiStore.setState({ exitingIds: ['event:e1'] });
    const { container } = render(
      <EventBlock instance={makeEventInstance(Date.now() - 999999)} pxPerMin={1} dayStartMin={8 * 60} onEventClick={noop} onTaskToggle={noop} onDropAt={noop} />,
    );
    expect(container.querySelector('.animate-exit')).toBeTruthy();
  });
});
