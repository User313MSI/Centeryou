import { describe, expect, it } from 'vitest';
import { LEXIQUE_BAVARDAGE, TITRE_MAX, cleanTitle, dateWarningMessage, parseInput, parseInputDetailed, type ParsedInput } from '../src/lib/parser';
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

describe('M-22 — usine à titres propres (cleanTitle, partagée clavier + voix)', () => {
  it.each<[string, Partial<ParsedInput>]>([
    // la phrase réelle du 2e test utilisateur (auto-correction à l'oral)
    ["euh bah non justement c'est plutôt aujourd'hui réunion à 14h", { title: 'Réunion', date: TODAY, time: '14:00' }],
    ["ah non, justement, plutôt aujourd'hui, réunion à 14h", { title: 'Réunion', date: TODAY, time: '14:00' }],
    // régression M-19 interdite : ce cas marchait déjà, il doit marcher encore
    ["écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2", { title: 'Stream sur Red Dead 2', date: '2025-01-07', time: '18:00' }],
    // trois phrases avec hésitations naturelles
    ['euh, hum, dîner avec les parents demain à 20h', { title: 'Dîner avec les parents', date: '2025-01-07', time: '20:00' }],
    ['bah en fait voilà appel du dentiste demain à 9h', { title: 'Appel du dentiste', date: '2025-01-07', time: '09:00' }],
    ['euh bah je veux dire que stream Red Dead 2 demain 21h', { title: 'Stream Red Dead 2', date: '2025-01-07', time: '21:00' }],
    // autres bavardages / ventilations / corrections
    ['du coup sport demain 14h', { title: 'Sport', date: '2025-01-07', time: '14:00' }],
    ['réunion avec Paul demain 15h quoi', { title: 'Réunion avec Paul', date: '2025-01-07', time: '15:00' }],
    ["en vrai c'est-à-dire que j'ai un rdv dentiste vendredi 10h30", { title: 'Rdv dentiste', date: '2025-01-10', time: '10:30' }],
    ['disons que je sors avec Léa jeudi 20h30', { title: 'Je sors avec Léa', date: '2025-01-09', time: '20:30' }],
    ["c'est-à-dire appel paul à 15h aujourd'hui", { title: 'Appel paul', date: TODAY, time: '15:00' }],
    ['hein ben euh ménage demain', { title: 'Ménage', date: '2025-01-07', time: null }],
  ])('« %s »', (input, expected) => {
    expect(p(input)).toEqual({ category: 'autre', priority: 'moyenne', time: null, ...expected });
  });

  it('jamais de date ni d’heure dans le titre', () => {
    const titres = [
      "euh bah non justement c'est plutôt aujourd'hui réunion à 14h",
      'stream sur Red Dead 2 demain à 18h',
      'rendez-vous mardi 10h30',
      'sport dans 3 jours à 9h',
      'dîner ce soir',
    ].map((x) => p(x).title);
    for (const t of titres) {
      expect(t).not.toMatch(/\d{1,2}h\d{0,2}/);
      expect(t).not.toMatch(/\d{1,2}:\d{2}/);
      expect(t.toLowerCase()).not.toMatch(/aujourdhui|demain|apres-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|ce soir|ce matin|dans \d/);
    }
  });

  it('pas de mot de liaison orphelin en début, fin ou milieu de titre', () => {
    expect(p('la réunion de').title).toBe('Réunion');
    expect(p('à que pour le la de').title).toBe('Nouvelle tâche');
    expect(p('je veux dire que appel 15h').title).toBe('Appel');
    // au milieu d'une activité, ils restent (M-19 verrouillé : « laver la voiture », « acheter du pain »)
    expect(p('mets laver la voiture samedi').title).toBe('Laver la voiture');
    expect(p('acheter du pain perso').title).toBe('Acheter du pain');
    expect(p("dis-moi que lundi 10h il y a le dentiste").title).toBe('Il y a le dentiste');
  });

  it('titre de repli clair si le nettoyage a tout vidé (jamais un mur vide)', () => {
    expect(p('euh bah non en fait voilà du coup').title).toBe('Nouvelle tâche');
    expect(p('quoi').title).toBe('Nouvelle tâche');
    expect(p('   ').title).toBe('Nouvelle tâche');
    const d = parseInputDetailed('euh bah non', TODAY);
    expect(d.hasDate).toBe(false);
    expect(d.hasTime).toBe(false);
    expect(d.title).toBe('Nouvelle tâche');
  });

  it('troncature propre à ~40 caractères, au dernier mot complet, sans « … »', () => {
    const t1 = p("réunion avec toute l'équipe projet Phoenix demain à 14h").title;
    expect(t1).toBe("Réunion avec toute l'équipe projet");
    expect(t1.length).toBeLessThanOrEqual(TITRE_MAX);
    const t2 = p('stream sur Red Dead Redemption 2 avec les copains demain à 21h').title;
    expect(t2.length).toBeLessThanOrEqual(TITRE_MAX);
    expect(t2).not.toContain('…');
    expect(t2.endsWith(' ')).toBe(false);
    // un seul mot immense : coupe sèche à TITRE_MAX, pas de « … »
    const t3 = p(`${'x'.repeat(60)} demain`).title;
    expect(t3.length).toBe(TITRE_MAX);
    expect(t3).not.toContain('…');
  });

  it('majuscule initiale systématique', () => {
    expect(p('euh stream demain').title).toBe('Stream');
    expect(cleanTitle('réunion équipe')).toBe('Réunion équipe');
  });

  it('cleanTitle : usine unique, idempotente, repli clair', () => {
    expect(cleanTitle('')).toBe('Nouvelle tâche');
    expect(cleanTitle('   ')).toBe('Nouvelle tâche');
    expect(cleanTitle('euh bah non justement en fait plutôt voilà')).toBe('Nouvelle tâche');
    expect(cleanTitle('réunion')).toBe('Réunion');
    const t = cleanTitle("euh bah non justement c'est plutôt réunion");
    expect(t).toBe('Réunion');
    expect(cleanTitle(t)).toBe(t); // idempotente : la voix peut la réappliquer sans risque
  });

  it('chaque motif du lexique de bavardage disparaît du titre', () => {
    for (const motif of LEXIQUE_BAVARDAGE) {
      expect(cleanTitle(`${motif.join(' ')} réunion`)).toBe('Réunion');
    }
    expect(cleanTitle('réunion quoi')).toBe('Réunion'); // « quoi » de fin de phrase
  });
});

describe('M-31 — Almanach : dates absolues en français reconnues par le parseur', () => {
  // dimanche 22 novembre 2026 : la « journée réelle » de la session Cactus (M-28)
  const CACTUS = '2026-11-22';
  const q = (input: string, today: string = TODAY) => parseInputDetailed(input, today);

  it.each<[string, string, Partial<ParsedInput>]>([
    // les phrases réelles mesurées par Cactus (§3), avec aujourd’hui = 22/11/2026
    ['dentiste 14/12/2026 10h', CACTUS, { title: 'Dentiste', date: '2026-12-14', time: '10:00' }],
    ['réunion le 3 janvier 9h', CACTUS, { title: 'Réunion', date: '2027-01-03', time: '09:00' }],
    ['anniversaires maman 14 décembre', CACTUS, { title: 'Anniversaires maman', date: '2026-12-14', time: null }],
    ['noël 25 décembre', CACTUS, { title: 'Noël', date: '2026-12-25', time: null }],
    ['14 décembre 10h', CACTUS, { title: 'Nouvelle tâche', date: '2026-12-14', time: '10:00' }],
    // formats demandés
    ['1er mai', TODAY, { title: 'Nouvelle tâche', date: '2025-05-01', time: null }],
    ['1 mai 2026', TODAY, { date: '2026-05-01' }],
    ['25/12', TODAY, { date: '2025-12-25' }],
    ['14/12', TODAY, { date: '2025-12-14' }],
    ['14/12/2026', TODAY, { date: '2026-12-14' }],
    ['25/12/2026 8h', TODAY, { date: '2026-12-25', time: '08:00' }],
    ['le 25/12/2026', TODAY, { date: '2026-12-25' }],
    ['dentiste 14/12/2026 à 10h', CACTUS, { title: 'Dentiste', date: '2026-12-14', time: '10:00' }],
    ['! dentiste 14/12/2026 10h', CACTUS, { title: 'Dentiste', date: '2026-12-14', time: '10:00', priority: 'haute' }],
    // abréviations courantes
    ['10 janv.', TODAY, { date: '2025-01-10' }],
    ['3 janv.', TODAY, { date: '2026-01-03' }], // passée cette année -> année prochaine
    ['14 févr. 9h', TODAY, { date: '2025-02-14', time: '09:00' }],
    ['5 sept. 2026', TODAY, { date: '2026-09-05' }],
    ['1er oct. 2027', TODAY, { date: '2027-10-01' }],
    ['noël 25 déc.', TODAY, { title: 'Noël', date: '2025-12-25' }],
    ['14 décembre 2026', TODAY, { date: '2026-12-14' }],
    ['14 dec 2026 10h30', TODAY, { date: '2026-12-14', time: '10:30' }],
    ['le 3 janvier', CACTUS, { date: '2027-01-03' }],
    ['14 janvier', CACTUS, { date: '2027-01-14' }], // en novembre, « 14 janvier » = janvier 2027
    ['14 décembre', '2027-01-05', { date: '2027-12-14' }], // en janvier, « 14 décembre » = décembre 2027
    ['14 décembre', '2026-01-05', { date: '2026-12-14' }], // même année si encore à venir
    ['14 décembre', '2026-12-14', { date: '2026-12-14' }], // aujourd’hui inclus
    // années bissextiles respectées
    ['29/02/2028', TODAY, { date: '2028-02-29' }],
    ['29 février 2028', TODAY, { date: '2028-02-29' }],
    ['29 février', CACTUS, { date: '2028-02-29' }], // prochaine occurrence valide du 29 février
    // année explicite passée : règle simple et cohérente = telle quelle, jamais modifiée
    ['dentiste 14/12/2025 10h', CACTUS, { title: 'Dentiste', date: '2025-12-14', time: '10:00' }],
  ])('« %s » (aujourd’hui = %s)', (input, today, expected) => {
    expect(parseInput(input, today)).toMatchObject({ category: 'autre', priority: 'moyenne', time: null, ...expected });
  });

  it('la date consommée ne reste JAMAIS dans le titre (usine cleanTitle de Plume intacte)', () => {
    expect(q('dentiste 14/12/2026 10h', CACTUS).title).toBe('Dentiste');
    expect(q('anniversaires maman 14 décembre', CACTUS).title).toBe('Anniversaires maman');
    expect(q('réunion le 3 janvier 9h', CACTUS).title).toBe('Réunion');
    const titres = [
      'dentiste 14/12/2026 10h',
      'réunion le 3 janvier 9h',
      'noël 25 décembre',
      'anniversaires maman 14 décembre',
      '1er mai 2027 à 14h',
      '25/12/2026 18h',
    ].map((x) => q(x, CACTUS).title);
    for (const t of titres) {
      expect(t).not.toMatch(/\d/);
      expect(t.toLowerCase()).not.toMatch(/janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre|janv|fevr|avr|juil|sept|oct|nov|dec/);
    }
  });

  it('hasDate/hasTime sont levés pour les dates absolues (la voix crée bien l’élément)', () => {
    expect(q('dentiste 14/12/2026 10h', CACTUS)).toMatchObject({ hasDate: true, hasTime: true, date: '2026-12-14', time: '10:00', dateWarning: null });
    expect(q('noël 25 décembre', CACTUS)).toMatchObject({ hasDate: true, hasTime: false, date: '2026-12-25', dateWarning: null });
    expect(q('14/12/2026', CACTUS)).toMatchObject({ hasDate: true, hasTime: false, dateWarning: null });
  });

  it('parseInput garde exactement sa forme historique à 5 champs, même avec une date absolue', () => {
    const r = parseInput('dentiste 14/12/2026 10h', CACTUS);
    expect(Object.keys(r).sort()).toEqual(['category', 'date', 'priority', 'time', 'title']);
    expect(r).toEqual({ title: 'Dentiste', date: '2026-12-14', time: '10:00', category: 'autre', priority: 'moyenne' });
  });

  it.each<[string, string, string]>([
    // fragment ressemblant à une date mais NON reconnu -> garde-fou, jamais de mauvais jour silencieux
    ['dentiste 32/13/2026 10h', CACTUS, '32/13/2026'],
    ['dentiste 29/02/2026 10h', CACTUS, '29/02/2026'], // 2026 n’est pas bissextile
    ['réunion le 30 février 9h', CACTUS, 'le 30 février'],
    ['sport le 31 avril 2026', CACTUS, 'le 31 avril 2026'],
    ['rdv 00/12/2026', CACTUS, '00/12/2026'],
  ])('garde-fou « %s » : dateWarning = %s, date = aujourd’hui, le fragment reste visible dans le titre', (input, today, warning) => {
    const r = q(input, today);
    expect(r.dateWarning).toBe(warning);
    expect(r.date).toBe(today); // aucune date valide reconnue -> aujourd’hui, jamais un autre jour silencieux
    expect(r.title.toLowerCase()).toContain(warning.replace(/^le /, '').toLowerCase());
    expect(r.title).not.toBe('Nouvelle tâche');
  });

  it('pas de fausse alerte : heure invalide, année seule ou nombre sans « / » ne sont pas des dates', () => {
    expect(q('sport 25h', TODAY).dateWarning).toBeNull();
    expect(q('sport 10h70', TODAY).dateWarning).toBeNull();
    expect(q('en 2026', TODAY).dateWarning).toBeNull();
    expect(q('en 2026', TODAY).title).toBe('En 2026');
    expect(q('code 2512', TODAY).dateWarning).toBeNull();
    expect(q('code 2512', TODAY).title).toBe('Code 2512');
    expect(q('dans 2 mois', TODAY).dateWarning).toBeNull();
    expect(q('dans 500 jours', TODAY).dateWarning).toBeNull();
  });

  it('dateWarningMessage : avertissement clair, « mise à aujourd’hui » seulement si aucune date reconnue', () => {
    expect(dateWarningMessage(null, false)).toBeNull();
    const m1 = dateWarningMessage('32/13/2026', false);
    expect(m1).toContain('Date non comprise');
    expect(m1).toContain('32/13/2026');
    expect(m1).toContain('mise à aujourd’hui');
    expect(m1).toContain('corrige-la si besoin');
    const m2 = dateWarningMessage('32/13', true);
    expect(m2).toContain('ressemble à une date');
    expect(m2).toContain('corrige-la si besoin');
    expect(m2).not.toContain('mise à aujourd’hui');
  });

  it('régressions : tout ce qui marchait continue (dates relatives, « ! », catégories, bavardage)', () => {
    expect(p('sport demain 14h')).toEqual({ title: 'Sport', date: '2025-01-07', time: '14:00', category: 'autre', priority: 'moyenne' });
    expect(p('jeudi 18h').date).toBe('2025-01-09');
    expect(p('récap dans 2 semaines').date).toBe('2025-01-20');
    expect(p('!lundi réunion').priority).toBe('haute');
    expect(p("écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2")).toEqual({ title: 'Stream sur Red Dead 2', date: '2025-01-07', time: '18:00', category: 'autre', priority: 'moyenne' });
    expect(p("euh bah non justement c'est plutôt aujourd'hui réunion à 14h").title).toBe('Réunion');
    // une date absolue ne mange pas le reste de la phrase (« vendredi » est consommé comme date relative, comme avant)
    expect(p('rapport vendredi 14 décembre 9h').date).toBe('2025-12-14');
    expect(p('rapport vendredi 14 décembre 9h').title).toBe('Rapport');
    expect(p('acheter du pain 3 mai').title).toBe('Acheter du pain');
  });
});
