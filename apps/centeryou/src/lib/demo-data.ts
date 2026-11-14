import type { Category, EventItem, Priority, Repeat, TaskItem } from '../types';
import { addDaysISO, startOfWeekISO } from './dates';

export const DEMO_PROFILE = { prenom: 'Sofia', role: 'graphiste indépendante' } as const;

export interface DemoData {
  prenom: string;
  role: string;
  events: EventItem[];
  tasks: TaskItem[];
}

/**
 * Semaine type de Sofia, graphiste indépendante — données fictives, ancrées
 * sur la semaine en cours pour que la démo paraisse toujours réaliste.
 * Aucune donnée réelle : la démo ne touche jamais au store.
 */
export function demoWeek(today: string): DemoData {
  const monday = startOfWeekISO(today);
  const day = (i: number) => addDaysISO(monday, i);
  let n = 0;
  const ev = (d: number, title: string, start: string, end: string, category: Category, repeat: Repeat = 'jamais'): EventItem => {
    n += 1;
    return { id: `demo-ev-${n}`, title, date: day(d), start, end, category, repeat, createdAt: 1_700_000_000_000 + n };
  };
  const tk = (d: number, title: string, time: string | null, category: Category, priority: Priority, done = false): TaskItem => {
    n += 1;
    return { id: `demo-tk-${n}`, title, date: day(d), time, category, priority, done, createdAt: 1_700_000_000_000 + n };
  };

  return {
    ...DEMO_PROFILE,
    events: [
      ev(0, 'Appel client — refonte de logo', '09:30', '11:00', 'travail'),
      ev(0, 'Maquettes page d’accueil', '14:00', '16:00', 'focus'),
      ev(1, 'Point équipe', '10:00', '11:00', 'travail'),
      ev(1, 'Entretiens utilisateurs', '15:00', '16:30', 'focus'),
      ev(2, 'Bloc création — illustrations', '09:00', '12:00', 'focus'),
      ev(2, 'Yoga', '18:30', '19:30', 'perso'),
      ev(3, 'Rendez-vous médecin', '10:30', '11:00', 'sante'),
      ev(3, 'Maquettes v2', '14:00', '16:00', 'focus'),
      ev(4, 'Revue des livrables', '09:30', '11:00', 'travail'),
      ev(4, 'Apéro réseau', '18:00', '19:30', 'perso'),
      ev(5, 'Atelier illustration perso', '10:00', '12:00', 'focus'),
    ],
    tasks: [
      tk(0, 'Envoyer les 3 pistes au client', '17:00', 'travail', 'haute', true),
      tk(1, 'Rédiger le compte-rendu des entretiens', null, 'focus', 'moyenne'),
      tk(2, 'Préparer la facture de mars', null, 'perso', 'basse'),
      tk(3, 'Appeler le comptable', '18:00', 'perso', 'moyenne'),
      tk(4, 'Publier la mise à jour du portfolio', '16:00', 'travail', 'haute'),
      tk(5, 'Courses', null, 'perso', 'basse'),
      tk(6, 'Préparer la semaine prochaine', null, 'focus', 'basse'),
    ],
  };
}
