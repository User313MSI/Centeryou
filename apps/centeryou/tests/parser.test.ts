import { describe, expect, it } from 'vitest';
import { parseInput, type ParsedInput } from '../src/lib/parser';

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
