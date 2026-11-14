import { beforeEach, describe, expect, it, vi } from 'vitest';

const speakMock = vi.fn().mockResolvedValue(undefined);
const playBlipMock = vi.fn();

vi.mock('../src/lib/voice', () => ({
  speak: (...args: unknown[]) => speakMock(...args),
  playBlip: (...args: unknown[]) => playBlipMock(...args),
  stopSpeaking: vi.fn(),
  isSynthesisAvailable: () => false,
  isRecognitionAvailable: () => false,
  startListening: () => null,
}));

import { handleVoiceCommand, programSentence } from '../src/lib/voice-commands';
import { defaultSettings } from '../src/lib/defaults';
import { useStore } from '../src/lib/store';
import { useUiStore } from '../src/lib/ui-store';
import { addDaysISO, todayISO } from '../src/lib/dates';

beforeEach(() => {
  window.localStorage.clear();
  speakMock.mockClear();
  playBlipMock.mockClear();
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings, voice: false, sounds: false },
    hydrated: true,
  });
  useUiStore.setState({ lastReply: '', toasts: [] });
});

describe('commandes vocales / texte', () => {
  it('« ajoute sport demain 14h » crée un événement 14h00–15h00', async () => {
    const reply = await handleVoiceCommand('ajoute sport demain 14h');
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ title: 'Sport', date: addDaysISO(todayISO(), 1), start: '14:00', end: '15:00' });
    expect(reply).toContain('Ajouté : Sport, demain à 14h00');
  });

  it('« ajoute » sans heure crée une tâche', async () => {
    const reply = await handleVoiceCommand('ajoute rapport vendredi travail');
    const s = useStore.getState();
    expect(s.events).toHaveLength(0);
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ title: 'Rapport', time: null, category: 'travail' });
    expect(reply).toContain('tâches');
  });

  it('créneau déjà pris exactement -> refus poli, rien n’est créé', async () => {
    useStore.getState().addEvent({ title: 'Réunion', date: todayISO(), start: '10:00', end: '11:00', category: 'travail', repeat: 'jamais' });
    const reply = await handleVoiceCommand(`ajoute dentist aujourd'hui 10h`);
    expect(useStore.getState().events).toHaveLength(1);
    expect(reply).toContain('déjà pris');
  });

  it('« c’est fait sport » coche la tâche et répond « Bravo »', async () => {
    useStore.getState().addTask({ title: 'Sport', date: todayISO(), time: null, category: 'autre', priority: 'moyenne' });
    const reply = await handleVoiceCommand("c'est fait sport");
    expect(useStore.getState().tasks[0].done).toBe(true);
    expect(reply).toBe('Bravo ! « Sport » est cochée.');
  });

  it('« quoi de prévu demain ? » lit le programme de demain', async () => {
    useStore.getState().addEvent({ title: 'Sport', date: addDaysISO(todayISO(), 1), start: '14:00', end: '15:00', category: 'perso', repeat: 'jamais' });
    const reply = await handleVoiceCommand('quoi de prévu demain ?');
    expect(reply).toContain('demain');
    expect(reply).toContain('Sport à 14h00');
  });

  it('jour libre -> message gentil', async () => {
    const reply = await handleVoiceCommand('mon programme');
    expect(reply).toContain('libre');
  });

  it('commande inconnue -> suggestion douce, jamais d’erreur', async () => {
    const reply = await handleVoiceCommand('blabla incompris');
    expect(reply).toContain("Je n’ai pas compris");
  });

  it('programSentence salue avec le prénom quand il est réglé', () => {
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille' } });
    expect(programSentence(todayISO())).toContain('Camille');
  });
});

describe('quota / activation voix', () => {
  it('voix désactivée (réglage) -> speak() n’est jamais appelé', async () => {
    useStore.setState({ settings: { ...defaultSettings, voice: false } });
    await handleVoiceCommand('mon programme');
    expect(speakMock).not.toHaveBeenCalled();
    // la réponse reste disponible en texte
    expect(useUiStore.getState().lastReply.length).toBeGreaterThan(0);
  });

  it('voix activée -> speak() est appelé avec la réponse', async () => {
    useStore.setState({ settings: { ...defaultSettings, voice: true } });
    await handleVoiceCommand('mon programme');
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0][0]).toContain('complètement libre');
  });

  it('sons désactivés -> aucun bip à la coche', async () => {
    useStore.setState({ settings: { ...defaultSettings, sounds: false } });
    useStore.getState().addTask({ title: 'Sport', date: todayISO(), time: null, category: 'autre', priority: 'moyenne' });
    await handleVoiceCommand("c'est fait sport");
    expect(playBlipMock).not.toHaveBeenCalled();
  });
});
