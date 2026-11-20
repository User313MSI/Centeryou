/**
 * Harnais d'audit Apollon (scratch, non commité) : rejoue les 4 parcours en jsdom
 * contre les vrais composants, après corrections.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, prefetch: vi.fn() }),
  usePathname: () => '/aujourdhui',
}));

import { HomeGate } from '../src/components/landing/home-gate';
import { InscriptionCard } from '../src/components/auth/inscription-card';
import { OnboardingSteps } from '../src/components/auth/onboarding-steps';
import { AujourdhuiView } from '../src/components/today/aujourdhui-view';
import PlanningPage from '../src/app/planning/page';
import TachesPage from '../src/app/taches/page';
import VoixPage from '../src/app/voix/page';
import ReglagesPage from '../src/app/reglages/page';
import { StatsView } from '../src/components/stats/stats-view';
import { DemoView } from '../src/components/demo/demo-view';
import OffresPage from '../src/app/offres/page';
import PressePage from '../src/app/presse/page';
import LegalPage from '../src/app/legal/page';
import CguPage from '../src/app/cgu/page';
import ConfidentialitePage from '../src/app/confidentialite/page';
import ContactPage from '../src/app/contact/page';
import BienvenuePage from '../src/app/bienvenue/page';
import { EventDialog } from '../src/components/events/event-dialog';
import { WelcomeSequence } from '../src/components/today/welcome-sequence';
import { HelpDialog } from '../src/components/help-dialog';
import { defaultSettings } from '../src/lib/defaults';
import { todayISO } from '../src/lib/dates';
import { useStore } from '../src/lib/store';
import { useUiStore } from '../src/lib/ui-store';
import { handleVoiceCommand } from '../src/lib/voice-commands';
import { speak } from '../src/lib/voice';
import { layoutOverlaps } from '../src/lib/overlap';
import type { EventItem } from '../src/types';

const TODAY = todayISO();

function resetStores(over: Partial<Parameters<typeof useStore.setState>[0]> = {}) {
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings, onboarded: true, welcomeSequence: 'off', welcomeShownDate: TODAY },
    hydrated: true,
    ...over,
  });
  useUiStore.setState({ toasts: [], eventDialog: { open: false }, helpOpen: false, lastReply: '', transcript: '', listening: false });
}

const ANGLICISMS = [
  /mobile-first/i, /local-first/i, /\bto-do\b/i, /\bemail\b/i, /dentist/i, /NovaLoom/i, /Dev-Apps/i,
  /© 2025/, />Stop</, /▶/, /✅/, /\bStats</, /essai\(s\)/, /sûr\(e\)/,
];

function sweep(name: string, container: HTMLElement) {
  const text = container.textContent ?? '';
  for (const re of ANGLICISMS) {
    expect(text, `${name} contient ${re}`).not.toMatch(re);
  }
}

describe('Balayage FR — toutes les pages rendues', () => {
  it('aucun anglicisme / marque parasite dans les textes visibles', () => {
    resetStores();
    const pages: [string, () => JSX.Element][] = [
      ['vitrine', () => <HomeGate />],
      ['inscription', () => <InscriptionCard />],
      ['onboarding', () => <OnboardingSteps />],
      ['aujourdhui', () => <AujourdhuiView />],
      ['planning', () => <PlanningPage />],
      ['taches', () => <TachesPage />],
      ['voix', () => <VoixPage />],
      ['reglages', () => <ReglagesPage />],
      ['stats', () => <StatsView />],
      ['demo', () => <DemoView />],
      ['offres', () => <OffresPage />],
      ['presse', () => <PressePage />],
      ['legal', () => <LegalPage />],
      ['cgu', () => <CguPage />],
      ['confidentialite', () => <ConfidentialitePage />],
      ['contact', () => <ContactPage />],
      ['bienvenue', () => <BienvenuePage />],
    ];
    for (const [name, make] of pages) {
      resetStores();
      const { container, unmount } = render(make());
      sweep(name, container);
      unmount();
    }
    resetStores();
    useUiStore.setState({ helpOpen: true });
    const h = render(<HelpDialog />);
    sweep('aide', h.container);
    h.unmount();
  });
});

describe('PARCOURS A — Camille découvre l’app', () => {
  it('vitrine -> inscription -> onboarding -> premier élément créé, tout en français', async () => {
    resetStores({ settings: { ...defaultSettings } });
    // 1. vitrine
    const landing = render(<HomeGate />);
    expect(screen.getByRole('link', { name: /créer mon compte/i })).toBeInTheDocument();
    landing.unmount();

    // 2. inscription : prénom
    const ins = render(<InscriptionCard />);
    fireEvent.change(screen.getByLabelText(/comment t’appelles-tu/i), { target: { value: 'Camille' } });
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
    expect(pushMock).toHaveBeenCalledWith('/onboarding');
    expect(useStore.getState().settings.prenom).toBe('Camille');
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('Bienvenue Camille'))).toBe(true);
    ins.unmount();

    // 3. onboarding
    const onb = render(<OnboardingSteps />);
    expect(screen.getByText(/Bienvenue, Camille !/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /c’est parti !/i }));
    expect(pushMock).toHaveBeenCalledWith('/aujourdhui');
    onb.unmount();

    // 4. aujourd’hui : ajout rapide en langage naturel
    resetStores({ settings: { ...defaultSettings, prenom: 'Camille', onboarded: true, welcomeSequence: 'off', welcomeShownDate: TODAY } });
    const today = render(<AujourdhuiView />);
    const input = screen.getByLabelText(/ajout rapide/i);
    fireEvent.change(input, { target: { value: 'sport demain 14h' } });
    fireEvent.click(screen.getByRole('button', { name: /^ajouter$/i }));
    expect(useStore.getState().tasks.some((t) => t.title === 'Sport')).toBe(true);

    // 5. premier événement via un clic sur un créneau de la grille
    const slot = screen.getAllByRole('button', { name: /créer un événement le/i })[0];
    fireEvent.click(slot);
    expect(useUiStore.getState().eventDialog.open).toBe(true);
    today.unmount();

    // 6. la fenêtre d’événement crée l’événement
    const dlg = render(<EventDialog />);
    fireEvent.change(screen.getByLabelText(/^titre$/i), { target: { value: 'Réunion équipe' } });
    fireEvent.click(screen.getByRole('button', { name: /créer l’événement/i }));
    const evs = useStore.getState().events;
    expect(evs).toHaveLength(1);
    expect(evs[0].title).toBe('Réunion équipe');
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('Événement ajouté'))).toBe(true);
    dlg.unmount();
  });

  it('bienvenue : « sport demain 14h » crée un ÉVÉNEMENT (pas une tâche), comme la commande vocale', () => {
    resetStores({ settings: { ...defaultSettings } });
    const b = render(<BienvenuePage />);
    fireEvent.change(screen.getByLabelText(/ton prénom/i), { target: { value: 'Camille' } });
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));
    fireEvent.change(screen.getByLabelText(/premier événement/i), { target: { value: 'sport demain 14h' } });
    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));
    expect(useStore.getState().events.some((e) => e.title === 'Sport' && e.start === '14:00')).toBe(true);
    expect(useStore.getState().tasks).toHaveLength(0);
    b.unmount();
  });
});

describe('PARCOURS B — journée dense (12 événements le même jour)', () => {
  const dense: EventItem[] = Array.from({ length: 12 }, (_, i) => ({
    id: `e${i}`,
    title: `Bloc ${i + 1}`,
    date: TODAY,
    start: `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
    end: `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '30' : '00'}`,
    category: 'travail',
    repeat: 'jamais',
    createdAt: i + 1,
  }));

  it('les 12 blocs sont rendus, les chevauchements sont mis en colonnes (pas de recouvrement total)', () => {
    resetStores({ events: dense });
    useUiStore.setState({ planningView: 'jour' });
    const p = render(<PlanningPage />);
    for (let i = 0; i < 12; i += 1) {
      expect(screen.getByText(`Bloc ${i + 1}`)).toBeInTheDocument();
    }
    // deux blocs qui se chevauchent (Bloc 1 8h00-8h30 et Bloc 2 8h30-9h00 ne se chevauchent pas ;
    // prenons un vrai chevauchement : e0 8h00-8h30 et un doublon 8h15)
    p.unmount();

    const overlap = layoutOverlaps([
      { id: 'a', start: '08:00', end: '09:00' },
      { id: 'b', start: '08:30', end: '09:30' },
      { id: 'c', start: '10:00', end: '11:00' },
    ]);
    expect(overlap.get('a')).toEqual({ leftPct: 0, widthPct: 50 });
    expect(overlap.get('b')).toEqual({ leftPct: 50, widthPct: 50 });
    expect(overlap.get('c')).toEqual({ leftPct: 0, widthPct: 100 });
  });

  it('vue semaine : 12 blocs dans la colonne du jour, largeurs réduites pour les chevauchements', () => {
    resetStores({ events: [...dense, { id: 'x', title: 'Chevauchant', date: TODAY, start: '08:15', end: '08:45', category: 'perso', repeat: 'jamais', createdAt: 99 }] });
    useUiStore.setState({ planningView: 'semaine' });
    const p = render(<PlanningPage />);
    const el = screen.getByText('Chevauchant').closest('[role="button"]');
    expect(el).not.toBeNull();
    // bloc chevauché : largeur réduite (< 100 %), jamais pleine largeur qui masquerait l’autre
    expect(el!.getAttribute('style')).toMatch(/width: calc\((?!100%)/);
    p.unmount();
  });

  it('vue mois : la journée dense affiche 3 pastilles + « +N », sans débordement de cellule', () => {
    resetStores({ events: dense });
    useUiStore.setState({ planningView: 'mois' });
    const p = render(<PlanningPage />);
    expect(screen.getByText('+9')).toBeInTheDocument();
    p.unmount();
  });

  it('un événement hors grille (23h00) n’est pas rendu en dehors de la carte en vue jour', () => {
    resetStores({ events: [{ id: 'late', title: 'Veille tardive', date: TODAY, start: '23:00', end: '23:30', category: 'perso', repeat: 'jamais', createdAt: 1 }] });
    useUiStore.setState({ planningView: 'jour' });
    const p = render(<PlanningPage />);
    expect(screen.queryByText('Veille tardive')).toBeNull(); // visible en vue Mois, pas hors grille en Jour
    useUiStore.setState({ planningView: 'mois' });
    p.unmount();
    const p2 = render(<PlanningPage />);
    expect(screen.getByText('Veille tardive')).toBeInTheDocument();
    p2.unmount();
  });
});

describe('PARCOURS D — voix : cas limites', () => {
  beforeEach(() => {
    vi.stubGlobal('speechSynthesis', {
      cancel: vi.fn(),
      speak: vi.fn((u: { onend: (() => void) | null }) => {
        u.onend?.();
      }),
      getVoices: () => [{ lang: 'fr-FR', name: 'Test' }],
    });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = '';
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    });
  });

  it('voix désactivée : « Écouter le résumé » renvoie un toast clair au lieu de ne rien faire', async () => {
    resetStores({ settings: { ...defaultSettings, prenom: 'Camille', onboarded: true, voice: false, welcomeSequence: 'always', welcomeShownDate: '' } });
    render(<WelcomeSequence />);
    fireEvent.click(screen.getByRole('button', { name: /écouter le résumé/i }));
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('désactivé'))).toBe(true);
  });

  it('voix désactivée : une commande vocale répond en texte (toast), jamais muette', async () => {
    resetStores({ settings: { ...defaultSettings, voice: false } });
    const reply = await handleVoiceCommand('mon programme');
    expect(reply.length).toBeGreaterThan(0);
    expect(useUiStore.getState().toasts.some((t) => t.message === reply)).toBe(true);
  });

  it('pas de clé ElevenLabs (503) : bascule douce sur la voix du navigateur, aucune erreur', async () => {
    resetStores({ settings: { ...defaultSettings, prenom: 'Camille', voice: true } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    await expect(speak('Bonjour Camille.')).resolves.toBeUndefined();
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('quota épuisé (429) : toast avec le message du serveur puis voix du navigateur', async () => {
    resetStores({ settings: { ...defaultSettings, prenom: 'Camille', voice: true } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Quota de voix premium atteint pour aujourd’hui.' }),
    }));
    await expect(speak('Résumé du jour.')).resolves.toBeUndefined();
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('Quota de voix premium'))).toBe(true);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
});

describe('Démo — lecture seule réelle', () => {
  it('aucun élément cliquable/role bouton dans la démo', () => {
    resetStores();
    const d = render(<DemoView />);
    expect(screen.queryAllByRole('button', { name: /créer un événement le/i })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /voir la journée du/i })).toHaveLength(0);
    d.unmount();
  });
});
