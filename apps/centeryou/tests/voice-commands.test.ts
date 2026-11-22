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
import { addDaysISO, nextWeekdayISO, todayISO } from '../src/lib/dates';

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

describe('M-19 — saisie vocale vraiment naturelle (repli parseInput avant « Je n’ai pas compris »)', () => {
  // règle 8 : aucune date littérale comparée au jour réel — tout est recalculé à l’exécution
  const today = () => todayISO();
  const tomorrow = () => addDaysISO(todayISO(), 1);
  const weekday = (idx: number) => nextWeekdayISO(idx, todayISO()); // lundi=0 … dimanche=6

  it('la phrase exacte dictée en production : « écris-moi que demain à 18:00 j’ai un stream sur Red Dead 2 »', async () => {
    const reply = await handleVoiceCommand("écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2");
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ title: 'Stream sur Red Dead 2', date: tomorrow(), start: '18:00', end: '19:00' });
    expect(s.tasks).toHaveLength(0);
    expect(reply).toContain('Ajouté : Stream sur Red Dead 2, demain à 18h00');
  });

  it('« note que vendredi j’ai rdv dentiste 10h30 » -> événement « Rdv dentiste » vendredi 10h30', async () => {
    const reply = await handleVoiceCommand('note que vendredi j’ai rdv dentiste 10h30');
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ title: 'Rdv dentiste', date: weekday(4), start: '10:30', end: '11:30' });
    expect(reply).toContain('Rdv dentiste');
  });

  it('« stream sur Red Dead 2 demain à 18h » -> événement demain 18h00', async () => {
    await handleVoiceCommand('stream sur Red Dead 2 demain à 18h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Stream sur Red Dead 2', date: tomorrow(), start: '18:00', end: '19:00' });
  });

  it('« stream Red Dead 2 demain soir 21h » -> 21h00, « soir » retiré du titre', async () => {
    await handleVoiceCommand('stream Red Dead 2 demain soir 21h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Stream Red Dead 2', date: tomorrow(), start: '21:00', end: '22:00' });
  });

  it('« j’ai une réunion demain matin à 9h » -> événement « Réunion » demain 9h00', async () => {
    await handleVoiceCommand("j'ai une réunion demain matin à 9h");
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Réunion', date: tomorrow(), start: '09:00', end: '10:00' });
  });

  it('« rappelle-moi d’acheter du pain demain » -> tâche (pas d’heure) « D’acheter du pain »', async () => {
    const reply = await handleVoiceCommand("rappelle-moi d'acheter du pain demain");
    const s = useStore.getState();
    expect(s.events).toHaveLength(0);
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ title: "D'acheter du pain", date: tomorrow(), time: null });
    expect(reply).toContain('tâches');
  });

  it('« laver la voiture samedi » -> tâche « Laver la voiture » samedi prochain', async () => {
    await handleVoiceCommand('laver la voiture samedi');
    expect(useStore.getState().tasks[0]).toMatchObject({ title: 'Laver la voiture', date: weekday(5), time: null });
  });

  it('« appel paul à 15h » -> événement aujourd’hui 15h00 (le « à » ne pollue pas le titre)', async () => {
    const reply = await handleVoiceCommand('appel paul à 15h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Appel paul', date: today(), start: '15:00', end: '16:00' });
    expect(reply).toContain("aujourd'hui à 15h00");
  });

  it('« à 18h » seul -> une heure = un événement d’1 h aujourd’hui', async () => {
    await handleVoiceCommand('à 18h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Nouvelle tâche', date: today(), start: '18:00', end: '19:00' });
  });

  it('« demain 18h » -> événement demain 18h00', async () => {
    await handleVoiceCommand('demain 18h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Nouvelle tâche', date: tomorrow(), start: '18:00' });
  });

  it('« ! demain je dois finir le rapport » -> tâche prioritaire haute', async () => {
    await handleVoiceCommand('! demain je dois finir le rapport');
    expect(useStore.getState().tasks[0]).toMatchObject({ title: 'Je dois finir le rapport', date: tomorrow(), priority: 'haute' });
  });

  it('« dans 3 jours j’ai un rendez-vous à 16h » -> événement dans 3 jours à 16h00', async () => {
    await handleVoiceCommand("dans 3 jours j'ai un rendez-vous à 16h");
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Rendez-vous', date: addDaysISO(today(), 3), start: '16:00', end: '17:00' });
  });

  it('« dîner ce soir » -> événement « Dîner » aujourd’hui 19h00', async () => {
    await handleVoiceCommand('dîner ce soir');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Dîner', date: today(), start: '19:00', end: '20:00' });
  });

  it('« mardi 14h30 appel client » -> événement « Appel client » mardi prochain 14h30', async () => {
    await handleVoiceCommand('mardi 14h30 appel client');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Appel client', date: weekday(1), start: '14:30', end: '15:30' });
  });

  it('« courses demain » -> tâche ; « courses demain 18h » -> événement 18h00 (même règle que partout)', async () => {
    await handleVoiceCommand('courses demain');
    expect(useStore.getState().tasks[0]).toMatchObject({ title: 'Courses', date: tomorrow(), time: null });
    expect(useStore.getState().events).toHaveLength(0);
    await handleVoiceCommand('courses demain 18h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Courses', date: tomorrow(), start: '18:00', end: '19:00' });
  });

  it('créneau déjà pris en phrase naturelle -> refus poli, rien n’est créé', async () => {
    useStore.getState().addEvent({ title: 'Réunion', date: tomorrow(), start: '10:00', end: '11:00', category: 'travail', repeat: 'jamais' });
    const reply = await handleVoiceCommand('dentiste demain à 10h');
    expect(useStore.getState().events).toHaveLength(1);
    expect(reply).toContain('déjà pris');
  });

  it('« écris-moi que jeudi à 20h je sors avec Léa » -> événement « Je sors avec Léa » jeudi 20h00', async () => {
    await handleVoiceCommand('écris-moi que jeudi à 20h je sors avec Léa');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Je sors avec Léa', date: weekday(3), start: '20:00', end: '21:00' });
  });

  it('« mets un rappel téléphonique vendredi à 9h » -> événement « Rappel téléphonique » vendredi 9h00', async () => {
    await handleVoiceCommand('mets un rappel téléphonique vendredi à 9h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Rappel téléphonique', date: weekday(4), start: '09:00', end: '10:00' });
  });

  it('échec réel -> message d’aide humain qui invite à parler naturellement + formules figées', async () => {
    const reply = await handleVoiceCommand('blabla incompris');
    expect(reply).toContain('Je n’ai pas compris');
    expect(reply).toContain('dans les mots que tu veux');
    expect(reply).toContain('stream Red Dead 2 demain soir 21h');
    expect(reply).toContain('mon programme');
    expect(reply).toContain('quoi de prévu demain');
    expect(useStore.getState().events).toHaveLength(0);
    expect(useStore.getState().tasks).toHaveLength(0);
  });

  it('les commandes existantes ne changent pas : « agenda » lit toujours le programme du jour', async () => {
    const reply = await handleVoiceCommand('agenda');
    expect(reply).toContain('libre');
    expect(useStore.getState().events).toHaveLength(0);
    expect(useStore.getState().tasks).toHaveLength(0);
  });
});

describe('M-22 — titres propres à la voix (même usine à titres que la saisie clavier)', () => {
  // règle 8 : aucune date littérale comparée au jour réel — tout est recalculé à l'exécution
  const today = () => todayISO();
  const tomorrow = () => addDaysISO(todayISO(), 1);

  it('la phrase réelle avec auto-correction : « euh bah non justement c’est plutôt aujourd’hui réunion à 14h » -> événement aujourd’hui 14h00, titre « Réunion »', async () => {
    const reply = await handleVoiceCommand("euh bah non justement c'est plutôt aujourd'hui réunion à 14h");
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ title: 'Réunion', date: today(), start: '14:00', end: '15:00' });
    expect(s.tasks).toHaveLength(0);
    expect(reply).toContain("Ajouté : Réunion, aujourd'hui à 14h00");
  });

  it('branche « ajoute » avec hésitations -> même titre propre, même confirmation', async () => {
    const reply = await handleVoiceCommand("ajoute euh bah non justement c'est plutôt aujourd'hui réunion à 14h");
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Réunion', date: today(), start: '14:00', end: '15:00' });
    expect(reply).toContain("Ajouté : Réunion, aujourd'hui à 14h00");
  });

  it('régression M-19 interdite : « écris-moi que demain à 18:00 j’ai un stream sur Red Dead 2 » -> « Stream sur Red Dead 2 » demain 18h00', async () => {
    const reply = await handleVoiceCommand("écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2");
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Stream sur Red Dead 2', date: tomorrow(), start: '18:00', end: '19:00' });
    expect(reply).toContain('Ajouté : Stream sur Red Dead 2, demain à 18h00');
  });

  it.each<[string, string, string]>([
    ['euh, hum, dîner avec les parents demain à 20h', 'Dîner avec les parents', '20:00'],
    ['bah en fait voilà appel du dentiste demain à 9h', 'Appel du dentiste', '09:00'],
    ['euh bah je veux dire que stream Red Dead 2 demain 21h', 'Stream Red Dead 2', '21:00'],
  ])('hésitations naturelles « %s » -> titre propre « %s » demain à %s', async (phrase, titre, heure) => {
    const reply = await handleVoiceCommand(phrase);
    expect(useStore.getState().events[0]).toMatchObject({ title: titre, date: tomorrow(), start: heure });
    expect(reply).toContain(`Ajouté : ${titre}, demain à ${heure.replace(':', 'h')}`);
  });

  it('le « quoi » final et le bavardage ne polluent pas le titre (« quoi de prévu demain » reste une requête de programme)', async () => {
    const reply = await handleVoiceCommand('réunion aujourd’hui à 14h quoi');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Réunion', date: today(), start: '14:00' });
    expect(reply).toContain("Ajouté : Réunion, aujourd'hui à 14h00");
  });

  it('titre vide après nettoyage -> repli clair « Nouvelle tâche », jamais un mur vide', async () => {
    const reply = await handleVoiceCommand("euh bah non en fait voilà aujourd'hui à 14h");
    const s = useStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ title: 'Nouvelle tâche', date: today(), start: '14:00', end: '15:00' });
    expect(reply).toContain("Ajouté : Nouvelle tâche, aujourd'hui à 14h00");
  });

  it('les commandes existantes continuent de répondre à l’identique (ajoute, c’est fait, programme, agenda, quoi de prévu, « ! »)', async () => {
    expect(await handleVoiceCommand('mon programme')).toContain('libre');
    expect(await handleVoiceCommand('agenda')).toContain('libre');
    expect(await handleVoiceCommand('quoi de prévu demain ?')).toContain('demain');
    await handleVoiceCommand('ajoute sport demain 14h');
    expect(useStore.getState().events[0]).toMatchObject({ title: 'Sport', date: tomorrow(), start: '14:00' });
    await handleVoiceCommand("c'est fait sport");
    await handleVoiceCommand('! demain je dois finir le rapport');
    expect(useStore.getState().tasks[0]).toMatchObject({ title: 'Je dois finir le rapport', date: tomorrow(), priority: 'haute' });
  });
});
