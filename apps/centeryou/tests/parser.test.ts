import { describe, expect, it } from 'vitest';
import { parseInput, parseInputDetailed, type ParsedInput } from '../src/lib/parser';
import { addDaysISO, parseISO } from '../src/lib/dates';

// lundi 6 janvier 2025 (référence fixe pour des tests déterministes)
const TODAY = '2025-01-06';

function p(input: string): ParsedInput {
  return parseInput(input, TODAY);
}

describe('parseur de saisie naturelle (français)', () => {
  it.each<[string, Partial<ParsedInput>]>([
    ['sport demain 14h', { title: 'Sport', date: '2025-01-07', time: '14:00', category: 'autre', priority: 'moyenne' }],
    ['!lundi réunion', { title: 'Réunion', date: '2025-01-06', time: null, category: 'autre', priority: 'haute' }],
    ['dentist mardi 10h30 santé', { title: 'Dentist', date: '2025-01-07', time: '10:30', category: 'sante', priority: 'moyenne' }],
    ['rapport vendredi', { title: 'Rapport', date: '2025-01-10', time: null, category: 'autre', priority: 'moyenne' }],
    ['courses', { title: 'Courses', date: TODAY, time: null, category: 'autre', priority: 'moyenne' }],
    ["sport aujourd'hui 18h30", { title: 'Sport', date: TODAY, time: '18:30', category: 'autre', priority: 'moyenne' }],
    ['réunion travail jeudi 9h', { title: 'Réunion', date: '2025-01-09', time: '09:00', category: 'travail', priority: 'moyenne' }],
    ['ménage après-demain', { title: 'Ménage', date: '2025-01-08', time: null, category: 'autre', priority: 'moyenne' }],
    ['ménage après demain', { title: 'Ménage', date: '2025-01-08', time: null, category: 'autre', priority: 'moyenne' }],
    ['appel dans 3 jours', { title: 'Appel', date: '2025-01-09', time: null, category: 'autre', priority: 'moyenne' }],
    ['appel dans 1 jour', { title: 'Appel', date: '2025-01-07', time: null, category: 'autre', priority: 'moyenne' }],
    ['récap dans 2 semaines', { title: 'Récap', date: '2025-01-20', time: null, category: 'autre', priority: 'moyenne' }],
    ['visio dans 3 sem', { title: 'Visio', date: '2025-01-27', time: null, category: 'autre', priority: 'moyenne' }],
    ['deep work focus à 15h', { title: 'Deep work', date: TODAY, time: '15:00', category: 'focus', priority: 'moyenne' }],
    ['déjeuner midi', { title: 'Déjeuner', date: TODAY, time: '12:00', category: 'autre', priority: 'moyenne' }],
    ['réveil minuit', { title: 'Réveil', date: TODAY, time: '00:00', category: 'autre', priority: 'moyenne' }],
    ['dodo à 23h59', { title: 'Dodo', date: TODAY, time: '23:59', category: 'autre', priority: 'moyenne' }],
    ['dentist mardi 10:30', { title: 'Dentist', date: '2025-01-07', time: '10:30', category: 'autre', priority: 'moyenne' }],
    ['sport 14h30', { title: 'Sport', date: TODAY, time: '14:30', category: 'autre', priority: 'moyenne' }],
    ['!vendredi deadline travail', { title: 'Deadline', date: '2025-01-10', time: null, category: 'travail', priority: 'haute' }],
    ['yoga samedi matin perso', { title: 'Yoga matin', date: '2025-01-11', time: null, category: 'perso', priority: 'moyenne' }],
    ['dîner ce soir', { title: 'Dîner', date: TODAY, time: '19:00', category: 'autre', priority: 'moyenne' }],
    ['médecin mercredi 8h45 santé', { title: 'Médecin', date: '2025-01-08', time: '08:45', category: 'sante', priority: 'moyenne' }],
    ['resto à 20h', { title: 'Resto', date: TODAY, time: '20:00', category: 'autre', priority: 'moyenne' }],
    ['! sport demain 14h', { title: 'Sport', date: '2025-01-07', time: '14:00', category: 'autre', priority: 'haute' }],
    ['rapport ! vendredi', { title: 'Rapport', date: '2025-01-10', time: null, category: 'autre', priority: 'haute' }],
    ['RÉSUMÉ JEUDI', { title: 'RÉSUMÉ', date: '2025-01-09', time: null, category: 'autre', priority: 'moyenne' }],
    ['réunion équipe travail', { title: 'Réunion équipe', date: TODAY, time: null, category: 'travail', priority: 'moyenne' }],
    ['acheter du pain perso', { title: 'Acheter du pain', date: TODAY, time: null, category: 'perso', priority: 'moyenne' }],
    ['sport demain 14h30 perso', { title: 'Sport', date: '2025-01-07', time: '14:30', category: 'perso', priority: 'moyenne' }],
    ['!mardi !réunion', { title: '!réunion', date: '2025-01-07', time: null, category: 'autre', priority: 'haute' }],
    ['lundi', { title: 'Nouvelle tâche', date: '2025-01-06', time: null, category: 'autre', priority: 'moyenne' }],
    ['demain 9h', { title: 'Nouvelle tâche', date: '2025-01-07', time: '09:00', category: 'autre', priority: 'moyenne' }],
    ['14h', { title: 'Nouvelle tâche', date: TODAY, time: '14:00', category: 'autre', priority: 'moyenne' }],
    ['dimanche 11h', { title: 'Nouvelle tâche', date: '2025-01-12', time: '11:00', category: 'autre', priority: 'moyenne' }],
  ])('« %s »', (input, expected) => {
    expect(p(input)).toEqual({ category: 'autre', priority: 'moyenne', time: null, ...expected });
  });

  it('entrée vide ou espaces -> tâche du jour par défaut', () => {
    expect(p('   ')).toEqual({ title: 'Nouvelle tâche', date: TODAY, time: null, category: 'autre', priority: 'moyenne' });
    expect(p('')).toEqual({ title: 'Nouvelle tâche', date: TODAY, time: null, category: 'autre', priority: 'moyenne' });
  });

  it('heures invalides -> restent dans le titre, pas d’erreur', () => {
    expect(p('sport 25h').time).toBeNull();
    expect(p('sport 25h').title).toBe('Sport 25h');
    expect(p('sport 10h70').time).toBeNull();
    expect(p('sport 10h70').title).toBe('Sport 10h70');
  });

  it('« 9h05 » -> 09:05, « 0h00 » -> 00:00', () => {
    expect(p('cours 9h05').time).toBe('09:05');
    expect(p('cours 0h00').time).toBe('00:00');
  });

  it('les mots de catégorie ne restent pas dans le titre', () => {
    expect(p('ménage perso').title).toBe('Ménage');
    expect(p('deep work focus').title).toBe('Deep work');
  });
});

describe('parseur — quantités relatives plafonnées (M-08 : plus jamais de date NaN)', () => {
  it('« dans 999999999 jours » ne crashe plus : date valide (aujourd’hui) et texte conservé dans le titre', () => {
    const r = p('dans 999999999 jours');
    expect(r.date).toBe(TODAY);
    expect(r.title).toBe('Dans 999999999 jours');
    expect(/^\d{4}-\d{2}-\d{2}$/.test(r.date)).toBe(true);
    expect(Number.isNaN(parseISO(r.date).getTime())).toBe(false);
  });

  it('quantité au-delà du plafond (501) → reste dans le titre, date toujours valide', () => {
    const r = p('sport dans 501 jours');
    expect(r.date).toBe(TODAY);
    expect(r.title).toBe('Sport dans 501 jours');
    expect(Number.isNaN(parseISO(r.date).getTime())).toBe(false);
  });

  it('quantité au plafond (500 jours) → date calculée normalement, valide', () => {
    const r = p('sport dans 500 jours');
    expect(r.date).toBe(addDaysISO(TODAY, 500));
    expect(r.title).toBe('Sport');
    expect(Number.isNaN(parseISO(r.date).getTime())).toBe(false);
  });

  it('nombre colossal (non fini en JS) → reste dans le titre, date valide', () => {
    const r = p(`dans ${'9'.repeat(400)} jours`);
    expect(r.date).toBe(TODAY);
    expect(Number.isNaN(parseISO(r.date).getTime())).toBe(false);
  });

  it('« dans 2 semaines » continue de fonctionner exactement pareil', () => {
    const r = p('récap dans 2 semaines');
    expect(r).toEqual({ title: 'Récap', date: '2025-01-20', time: null, category: 'autre', priority: 'moyenne' });
  });

  it('« dans 3 jours » et « dans 3 sem » inchangés', () => {
    expect(p('appel dans 3 jours').date).toBe('2025-01-09');
    expect(p('visio dans 3 sem').date).toBe('2025-01-27');
  });

  it('unité non supportée (« dans 2 mois ») → reste dans le titre, comme avant', () => {
    const r = p('dans 2 mois');
    expect(r.date).toBe(TODAY);
    expect(r.title).toBe('Dans 2 mois');
  });
});

describe('parseur — phrases naturelles M-19 (mots de remplissage retirés du titre)', () => {
  it.each<[string, Partial<ParsedInput>]>([
    // la phrase exacte dictée par l’utilisateur en production
    ["écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2", { title: 'Stream sur Red Dead 2', date: '2025-01-07', time: '18:00' }],
    ['note que vendredi j’ai rdv dentiste 10h30', { title: 'Rdv dentiste', date: '2025-01-10', time: '10:30' }],
    ['stream sur Red Dead 2 demain à 18h', { title: 'Stream sur Red Dead 2', date: '2025-01-07', time: '18:00' }],
    ['stream Red Dead 2 demain soir 21h', { title: 'Stream Red Dead 2', date: '2025-01-07', time: '21:00' }],
    ["j'ai une réunion demain matin à 9h", { title: 'Réunion', date: '2025-01-07', time: '09:00' }],
    ["rappelle-moi d'acheter du pain demain", { title: "D'acheter du pain", date: '2025-01-07', time: null }],
    ['mets laver la voiture samedi', { title: 'Laver la voiture', date: '2025-01-11', time: null }],
    ['ajoute sport demain 14h', { title: 'Sport', date: '2025-01-07', time: '14:00' }],
    ['un appel à 15h', { title: 'Appel', date: TODAY, time: '15:00' }],
    ['réunion à 18:00', { title: 'Réunion', date: TODAY, time: '18:00' }],
    ['demain soir 21h', { title: 'Nouvelle tâche', date: '2025-01-07', time: '21:00' }],
    // aucune heure après « soir » : le mot reste dans le titre, aucune heure inventée
    ['dîner demain soir', { title: 'Dîner soir', date: '2025-01-07', time: null }],
    ['yoga samedi matin', { title: 'Yoga matin', date: '2025-01-11', time: null }],
    ["dans 3 jours j'ai un rendez-vous à 16h", { title: 'Rendez-vous', date: '2025-01-09', time: '16:00' }],
    ['réveil ce matin à 7h30', { title: 'Réveil', date: TODAY, time: '07:30' }],
    ['appel paul à 15h aujourd’hui', { title: 'Appel paul', date: TODAY, time: '15:00' }],
    ['dis-moi que lundi 10h il y a le dentiste', { title: 'Il y a le dentiste', date: '2025-01-06', time: '10:00' }],
    ['écris moi que jeudi 20h30 je sors avec Léa', { title: 'Je sors avec Léa', date: '2025-01-09', time: '20:30' }],
    ['note que je dois appeler le plombier mardi', { title: 'Je dois appeler le plombier', date: '2025-01-07', time: null }],
    ['mets un rappel téléphonique vendredi à 9h', { title: 'Rappel téléphonique', date: '2025-01-10', time: '09:00' }],
  ])('« %s »', (input, expected) => {
    expect(p(input)).toEqual({ category: 'autre', priority: 'moyenne', time: null, ...expected });
  });

  it('le « à » devant une heure ne reste jamais dans le titre', () => {
    expect(p('stream à 18h').title).toBe('Stream');
    expect(p('stream à 18:00').title).toBe('Stream');
    expect(p('à 18h').title).toBe('Nouvelle tâche');
  });

  it('« j’ai » disparaît aussi au milieu de la phrase', () => {
    expect(p('vendredi j’ai rdv dentiste').title).toBe('Rdv dentiste');
  });
});

describe('parseInputDetailed — drapeaux hasDate/hasTime (M-19)', () => {
  it('une date ou une heure reconnue est signalée ; la date par défaut ne compte pas', () => {
    expect(parseInputDetailed('blabla incompris', TODAY)).toMatchObject({ hasDate: false, hasTime: false, date: TODAY, time: null });
    expect(parseInputDetailed('demain', TODAY)).toMatchObject({ hasDate: true, hasTime: false, date: '2025-01-07' });
    expect(parseInputDetailed('à 18h', TODAY)).toMatchObject({ hasDate: false, hasTime: true, time: '18:00' });
    expect(parseInputDetailed('lundi 10h', TODAY)).toMatchObject({ hasDate: true, hasTime: true, date: '2025-01-06', time: '10:00' });
    expect(parseInputDetailed('ce soir', TODAY)).toMatchObject({ hasDate: true, hasTime: true, time: '19:00' });
    expect(parseInputDetailed('dans 2 jours 8h', TODAY)).toMatchObject({ hasDate: true, hasTime: true, date: '2025-01-08', time: '08:00' });
    expect(parseInputDetailed('sport', TODAY)).toMatchObject({ hasDate: false, hasTime: false });
  });

  it('parseInput garde exactement sa forme historique à 5 champs', () => {
    expect(Object.keys(parseInput('sport demain 14h', TODAY)).sort()).toEqual(['category', 'date', 'priority', 'time', 'title']);
  });
});
