import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/reglages',
}));

// voix mockée (comme tests/launch-film.test.tsx)
vi.mock('../src/lib/voice', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

// Diapason : on espionne les lecteurs du moteur, on garde les helpers purs réels
vi.mock('../src/lib/sons', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/lib/sons')>();
  return {
    ...orig,
    playDing: vi.fn(() => true),
    playPop: vi.fn(() => true),
    playCarillon: vi.fn(() => true),
    playRecord: vi.fn(() => true),
    startNappe: vi.fn(() => vi.fn(() => undefined)),
    stopNappe: vi.fn(),
  };
});

import ReglagesPage from '../src/app/reglages/page';

import { LaunchFilm } from '../src/components/today/launch-film';

import { spawnConfetti, spawnFirework, spawnRipple } from '../src/lib/celebrate';

import { defaultSettings } from '../src/lib/defaults';

import { runRappelTick } from '../src/lib/rappels-service';

import { playCarillon, playDing, playPop, playRecord, startNappe, stopNappe } from '../src/lib/sons';

import { useStore } from '../src/lib/store';

import { useUiStore } from '../src/lib/ui-store';

import type { EventItem, Settings } from '../src/types';

const TODAY = '2026-11-21';

function reglage(over: Partial<Settings> = {}): Settings {
  return { ...defaultSettings, ...over };
}

function persistSettings(): Settings {
  const raw = window.localStorage.getItem('centeryou-v1');
  expect(raw).toBeTruthy();
  return JSON.parse(raw as string).state.settings as Settings;
}

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

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
  useUiStore.setState({ toasts: [], highlightEventId: null, highlightAt: 0 });
});

/* ---------------------------------------------------------------- *
 *  Intégration célébrations (celebrate.ts)
 * ---------------------------------------------------------------- */

describe('Diapason — célébrations (celebrate.ts)', () => {
  it('coche de tâche (spawnConfetti) -> « ding »', () => {
    useStore.setState({ settings: reglage({ animations: true, sounds: true }) });
    const host = document.createElement('div');
    document.body.appendChild(host);
    spawnConfetti(host);
    expect(playDing).toHaveBeenCalledTimes(1);
    host.remove();
  });

  it('création d’événement (spawnRipple) -> « pop »', () => {
    useStore.setState({ settings: reglage({ animations: true }) });
    spawnRipple(10, 20);
    expect(playPop).toHaveBeenCalledTimes(1);
  });

  it('record battu (spawnFirework) -> petit motif « record »', () => {
    useStore.setState({ settings: reglage({ animations: true }) });
    spawnFirework(10, 20);
    expect(playRecord).toHaveBeenCalledTimes(1);
  });

  it('animations coupées : le DOM reste statique MAIS le son joue quand même (réglages indépendants)', () => {
    useStore.setState({ settings: reglage({ animations: false, sounds: true }) });
    const host = document.createElement('div');
    document.body.appendChild(host);
    spawnConfetti(host);
    expect(playDing).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.celebrate-confetti')).toBeNull(); // aucun effet DOM
    host.remove();
  });
});

/* ---------------------------------------------------------------- *
 *  Intégration rappels (rappels-service.ts) : carillon discret
 * ---------------------------------------------------------------- */

describe('Diapason — rappels (rappels-service.ts)', () => {
  function depsTick(opts: { settings?: Settings; jouerCarillon?: () => void } = {}) {
    const shown: unknown[] = [];
    let state = { notifies: [] as string[], snoozes: {}, fait: [] as string[], tachesDate: '' };
    const deps = {
      now: () => new Date(2026, 10, 21, 9, 50),
      permission: () => 'granted' as const,
      actionsSupported: () => true,
      show: (n: unknown) => {
        shown.push(n);
        return true;
      },
      ...(opts.jouerCarillon ? { jouerCarillon: opts.jouerCarillon } : {}),
      getData: () => ({ events: [ev()], tasks: [], settings: opts.settings ?? reglage() }),
      getRappelState: () => state,
      saveRappelState: (s: typeof state) => {
        state = s;
      },
    };
    return { deps, shown };
  }

  it('une notification de rappel -> carillon joué une fois (injecté)', async () => {
    const carillon = vi.fn();
    const { deps, shown } = depsTick({ jouerCarillon: carillon });
    await runRappelTick(deps);
    expect(shown).toHaveLength(1);
    expect(carillon).toHaveBeenCalledTimes(1);
  });

  it('câblage par défaut : sans injection, c’est playCarillon du moteur qui est appelé (avec les bons réglages)', async () => {
    const { deps, shown } = depsTick();
    await runRappelTick(deps);
    expect(shown).toHaveLength(1);
    expect(playCarillon).toHaveBeenCalledTimes(1);
    expect(playCarillon).toHaveBeenCalledWith(expect.objectContaining({ getSettings: expect.any(Function) }));
  });

  it('réglage « rappels » coupé -> aucune notification, donc aucun carillon', async () => {
    const { deps, shown } = depsTick({ settings: reglage({ reminders: false }) });
    await runRappelTick(deps);
    expect(shown).toHaveLength(0);
    expect(playCarillon).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------- *
 *  Intégration film de lancement (launch-film.tsx) : nappe OFF par défaut
 * ---------------------------------------------------------------- */

describe('Diapason — film de lancement (launch-film.tsx)', () => {
  function storeFilm(over: Partial<Settings> = {}) {
    useStore.setState({
      events: [],
      tasks: [],
      settings: reglage({
        prenom: 'Camille',
        welcomeSequence: 'always',
        launchFilm: 'always',
        voice: true,
        launchFilmVoice: true,
        ...over,
      }),
      hydrated: true,
    });
  }

  it('nappe du film OFF par défaut : le film démarre sans jamais appeler startNappe', async () => {
    storeFilm({ filmPad: false });
    window.sessionStorage.setItem('centeryou-film-gesture-v1', '1'); // geste déjà fait -> lecture auto
    render(<LaunchFilm />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await waitFor(() => expect(stopNappe).not.toHaveBeenCalled());
    expect(startNappe).not.toHaveBeenCalled();
  });

  it('nappe activée dans Réglages + lecture auto (geste déjà fait) -> startNappe appelé au démarrage', async () => {
    storeFilm({ filmPad: true });
    window.sessionStorage.setItem('centeryou-film-gesture-v1', '1');
    render(<LaunchFilm />);
    await waitFor(() => expect(startNappe).toHaveBeenCalledTimes(1));
  });

  it('nappe activée + premier geste (bouton « Activer le son », M-20) -> startNappe au clic, arrêt à « Passer »', async () => {
    storeFilm({ filmPad: true });
    // pas de geste dans l'onglet -> le film démarre visuellement, seul un petit bouton
    // « Activer le son » attend le geste (M-20) ; la nappe ne démarre pas sans geste
    render(<LaunchFilm />);
    const bouton = await screen.findByRole('button', { name: /activer le son/i });
    expect(startNappe).not.toHaveBeenCalled();
    fireEvent.click(bouton);
    await waitFor(() => expect(startNappe).toHaveBeenCalledTimes(1));
    const stopRenvoye = (startNappe as ReturnType<typeof vi.fn>).mock.results[0].value as () => void;
    fireEvent.click(screen.getByRole('button', { name: /passer le film/i }));
    await waitFor(() => expect(stopRenvoye).toHaveBeenCalled());
  });
});

/* ---------------------------------------------------------------- *
 *  Carte « Sons » des Réglages + persistance
 * ---------------------------------------------------------------- */

describe('Diapason — carte « Sons » (reglages/page.tsx)', () => {
  it('la carte « Sons » expose effets on/off, volume et nappe du film (off par défaut)', () => {
    useStore.setState({ settings: reglage() });
    render(<ReglagesPage />);
    expect(screen.getByRole('heading', { name: 'Sons' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Effets sonores' })).toHaveAttribute('aria-checked', 'true');
    const volume = document.getElementById('reglage-volume-sons') as HTMLInputElement;
    expect(volume).toBeTruthy();
    expect(volume.type).toBe('range');
    expect(volume.value).toBe('60'); // volume par défaut 0,6 (M-20 : audible, avant 0,35 = murmure)
    expect(screen.getByRole('switch', { name: 'Nappe du film' })).toHaveAttribute('aria-checked', 'false');
  });

  it('bascule « Effets sonores » -> settings.sounds persisté sous centeryou-v1', () => {
    useStore.setState({ settings: reglage() });
    render(<ReglagesPage />);
    fireEvent.click(screen.getByRole('switch', { name: 'Effets sonores' }));
    expect(useStore.getState().settings.sounds).toBe(false);
    expect(persistSettings().sounds).toBe(false);
  });

  it('curseur de volume -> soundVolume 0–1 persisté (et libellé % à jour)', () => {
    useStore.setState({ settings: reglage() });
    render(<ReglagesPage />);
    const volume = document.getElementById('reglage-volume-sons') as HTMLInputElement;
    fireEvent.change(volume, { target: { value: '80' } });
    expect(useStore.getState().settings.soundVolume).toBe(0.8);
    expect(persistSettings().soundVolume).toBe(0.8);
    expect(screen.getByText(/Volume des sons — 80 %/)).toBeInTheDocument();
  });

  it('bascule « Nappe du film » -> filmPad persisté (false par défaut)', () => {
    useStore.setState({ settings: reglage() });
    render(<ReglagesPage />);
    expect(useStore.getState().settings.filmPad).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Nappe du film' }));
    expect(useStore.getState().settings.filmPad).toBe(true);
    expect(persistSettings().filmPad).toBe(true);
  });

  it('volume désactivé (grisé) quand les effets sonores sont coupés', () => {
    useStore.setState({ settings: reglage() });
    render(<ReglagesPage />);
    fireEvent.click(screen.getByRole('switch', { name: 'Effets sonores' }));
    const volume = document.getElementById('reglage-volume-sons') as HTMLInputElement;
    expect(volume.disabled).toBe(true);
  });
});
