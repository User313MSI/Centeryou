import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/reglages',
}));

// voix mockée : on vérifie les appels sans jamais bloquer
vi.mock('../src/lib/voice', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

import { speak, stopSpeaking } from '../src/lib/voice';

import { LaunchFilm } from '../src/components/today/launch-film';

import ReglagesPage from '../src/app/reglages/page';

import { buildBriefText } from '../src/lib/brief';

import { defaultSettings } from '../src/lib/defaults';

import { buildFilmData, encouragementFor, launchFilmVoiceWanted, shouldShowLaunchFilm } from '../src/lib/launch-film';

import { sanitizeSettings } from '../src/lib/sanitize';

import { useStore } from '../src/lib/store';

import { todayISO } from '../src/lib/dates';

const TODAY = todayISO();

const EVENTS = [
  { id: 'e1', title: 'Sport', date: TODAY, start: '14:00', end: '15:00', category: 'perso' as const, repeat: 'jamais' as const, createdAt: 1 },
  { id: 'e2', title: 'Réunion', date: TODAY, start: '10:00', end: '11:00', category: 'travail' as const, repeat: 'jamais' as const, createdAt: 2 },
];

const TASKS = [
  { id: 't1', title: 'Rapport', date: TODAY, time: null, category: 'travail' as const, priority: 'haute' as const, done: true, createdAt: 3 },
  { id: 't2', title: 'Courses', date: TODAY, time: '18:00', category: 'perso' as const, priority: 'basse' as const, done: false, createdAt: 4 },
];

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
  useStore.setState({
    events: EVENTS.map((e) => ({ ...e })),
    tasks: TASKS.map((t) => ({ ...t })),
    settings: { ...defaultSettings, prenom: 'Camille' },
    hydrated: true,
  });
});

describe('shouldShowLaunchFilm — les 3 modes du réglage « Film de lancement »', () => {
  it("'off' (Jamais) -> jamais, même jamais joué", () => {
    expect(shouldShowLaunchFilm('off', '', TODAY)).toBe(false);
    expect(shouldShowLaunchFilm('off', TODAY, TODAY)).toBe(false);
  });
  it("'daily' (défaut) -> une fois par jour", () => {
    expect(shouldShowLaunchFilm('daily', '', TODAY)).toBe(true);
    expect(shouldShowLaunchFilm('daily', TODAY, TODAY)).toBe(false);
    expect(shouldShowLaunchFilm('daily', '2025-01-05', TODAY)).toBe(true);
    expect(shouldShowLaunchFilm(undefined, '', TODAY)).toBe(true); // défaut = daily
  });
  it("'always' (À chaque ouverture) -> à chaque ouverture", () => {
    expect(shouldShowLaunchFilm('always', TODAY, TODAY)).toBe(true);
    expect(shouldShowLaunchFilm('always', '', TODAY)).toBe(true);
  });
});

describe('launchFilmVoiceWanted — bascule « voix du film »', () => {
  it('voix assistant désactivée -> pas de voix de film', () => {
    expect(launchFilmVoiceWanted({ voice: false, launchFilmVoice: true })).toBe(false);
  });
  it('bascule « voix du film » désactivée -> pas de voix de film', () => {
    expect(launchFilmVoiceWanted({ voice: true, launchFilmVoice: false })).toBe(false);
  });
  it('les deux actives -> voix du film (défaut : launchFilmVoice undefined = true)', () => {
    expect(launchFilmVoiceWanted({ voice: true, launchFilmVoice: true })).toBe(true);
    expect(launchFilmVoiceWanted({ voice: true })).toBe(true);
  });
});

describe('buildFilmData — données réelles du film', () => {
  it('chiffres du jour, prochaine étape et exemple magique réels', () => {
    const film = buildFilmData(EVENTS, TASKS, 'Camille', TODAY, 12 * 60);
    expect(film.prenom).toBe('Camille');
    expect(film.eventCount).toBe(2);
    expect(film.taskTotal).toBe(2);
    expect(film.taskDone).toBe(1);
    expect(film.taskOpen).toBe(1);
    expect(film.plannedMinutes).toBe(180); // 2 événements d'1 h + 1 tâche à 18h00 d'1 h
    expect(film.next?.title).toBe('Sport');
    expect(film.magicPhrase).toBe('ajoute Sport à 14h00');
    expect(film.magicTitle).toBe('Sport');
    // narration = texte du brief du matin, exactement (source unique)
    expect(film.briefText).toBe(buildBriefText('Camille', EVENTS, TASKS, TODAY));
    expect(film.captions).toHaveLength(5);
  });
  it('journée vide : jamais un écran vide (phrase motivante + suggestion + première semaine)', () => {
    const film = buildFilmData([], [], 'Léa', TODAY, 9 * 60);
    expect(film.emptyDay).toBe(true);
    expect(film.next).toBeNull();
    expect(film.magicPhrase).toBe('ajoute sport demain 14h');
    expect(film.weekPercent).toBeNull();
    expect(film.encouragement).toBe('Ta première semaine commence aujourd’hui.');
    expect(film.captions[1]).toContain('Journée libre');
    expect(encouragementFor(85)).toContain('rythme');
    expect(encouragementFor(0)).toContain('Chaque tâche');
  });
});

describe('sanitizeSettings — nouveaux champs bornés', () => {
  it('défauts : launchFilm daily, launchFilmVoice true, launchFilmShownDate vide', () => {
    const s = sanitizeSettings(undefined);
    expect(s.launchFilm).toBe('daily');
    expect(s.launchFilmVoice).toBe(true);
    expect(s.launchFilmShownDate).toBe('');
  });
  it('valeurs invalides écartées, valeurs sûres conservées (migrations intactes)', () => {
    const s = sanitizeSettings({ launchFilm: 'nope', launchFilmVoice: 'oui', launchFilmShownDate: 42, welcomeSequence: 'off' });
    expect(s.launchFilm).toBe('daily');
    expect(s.launchFilmVoice).toBe(true);
    expect(s.launchFilmShownDate).toBe('');
    expect(s.welcomeSequence).toBe('off'); // champ historique intact
    const s2 = sanitizeSettings({ launchFilm: 'always', launchFilmVoice: false, launchFilmShownDate: '2026-11-20' });
    expect(s2.launchFilm).toBe('always');
    expect(s2.launchFilmVoice).toBe(false);
    expect(s2.launchFilmShownDate).toBe('2026-11-20');
  });
});

describe('LaunchFilm (composant)', () => {
  it("mode 'off' (Jamais) -> le film ne s'ouvre pas", () => {
    useStore.setState({ settings: { ...defaultSettings, launchFilm: 'off' } });
    render(<LaunchFilm />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("mode 'daily', déjà joué aujourd'hui -> ne s'ouvre pas", () => {
    useStore.setState({ settings: { ...defaultSettings, launchFilm: 'daily', launchFilmShownDate: TODAY } });
    render(<LaunchFilm />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("mode 'always', déjà joué aujourd'hui -> s'ouvre quand même", async () => {
    useStore.setState({ settings: { ...defaultSettings, launchFilm: 'always', launchFilmShownDate: TODAY } });
    render(<LaunchFilm />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it("mode 'daily' neuf -> s'ouvre et marque les deux tampons de date (welcome + film)", async () => {
    render(<LaunchFilm />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(useStore.getState().settings.welcomeShownDate).toBe(TODAY);
    expect(useStore.getState().settings.launchFilmShownDate).toBe(TODAY);
  });

  it('première ouverture de session : bouton « Lancer le film » (le son ne démarre jamais seul)', async () => {
    render(<LaunchFilm />);
    await screen.findByRole('dialog');
    const gate = screen.getByRole('button', { name: /lancer le film/i });
    expect(gate).toBeInTheDocument();
    expect(gate.getAttribute('aria-label')).toMatch(/écouter le résumé/i);
    expect(speak).not.toHaveBeenCalled();
  });

  it('clic sur « Lancer le film » : la narration du brief du matin est dite (texte déjà calculé, un seul speak)', async () => {
    render(<LaunchFilm />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /lancer le film/i }));
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    expect(speak).toHaveBeenCalledWith(buildBriefText('Camille', EVENTS, TASKS, TODAY));
  });

  it('bascule « voix du film » désactivée : pas de bouton d’amorce, aucune voix', async () => {
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille', launchFilmVoice: false } });
    render(<LaunchFilm />);
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: /lancer le film/i })).not.toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it('geste déjà vu dans la session : lecture auto de la voix sans bouton', async () => {
    window.sessionStorage.setItem('centeryou-film-gesture-v1', '1');
    render(<LaunchFilm />);
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: /lancer le film/i })).not.toBeInTheDocument();
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
  });

  it('« Passer » ferme le film et coupe la voix', async () => {
    render(<LaunchFilm />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /passer/i }));
    expect(dialog).not.toBeInTheDocument();
    expect(stopSpeaking).toHaveBeenCalled();
  });

  it('Échap ferme le film', async () => {
    render(<LaunchFilm />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dialog).not.toBeInTheDocument();
  });

  it('clic hors zone (fond) ferme le film', async () => {
    render(<LaunchFilm />);
    const dialog = await screen.findByRole('dialog');
    const bg = dialog.querySelector('.film-bg') as HTMLElement;
    fireEvent.click(bg);
    expect(dialog).not.toBeInTheDocument();
  });

  it('prefers-reduced-motion : version sobre statique avec sous-titres complets (pas de scènes animées)', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia);
    // voix du film désactivée -> pas d'amorce, le panneau statique s'affiche directement
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille', launchFilmVoice: false } });
    render(<LaunchFilm />);
    expect(await screen.findByTestId('film-static')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer le film/i })).not.toBeInTheDocument();
    // sous-titres complets = le texte intégral du brief du matin
    expect(screen.getByText(buildBriefText('Camille', EVENTS, TASKS, TODAY), { exact: false })).toBeInTheDocument();
  });
});

describe('Réglages — carte « Film de lancement »', () => {
  it('le sélecteur à 3 valeurs met à jour launchFilm (et synchronise welcomeSequence)', () => {
    render(<ReglagesPage />);
    const select = screen.getByLabelText(/film de lancement/i);
    fireEvent.change(select, { target: { value: 'always' } });
    expect(useStore.getState().settings.launchFilm).toBe('always');
    expect(useStore.getState().settings.welcomeSequence).toBe('always');
    fireEvent.change(select, { target: { value: 'off' } });
    expect(useStore.getState().settings.launchFilm).toBe('off');
    fireEvent.change(select, { target: { value: 'daily' } });
    expect(useStore.getState().settings.launchFilm).toBe('daily');
  });

  it('la bascule « Voix du film » met à jour launchFilmVoice', () => {
    render(<ReglagesPage />);
    const toggle = screen.getByRole('switch', { name: /voix du film/i });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(useStore.getState().settings.launchFilmVoice).toBe(false);
    fireEvent.click(toggle);
    expect(useStore.getState().settings.launchFilmVoice).toBe(true);
  });
});
