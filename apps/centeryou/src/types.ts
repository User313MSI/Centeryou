import type { CategoryColor } from '../design/tokens';

export type Category = CategoryColor;
export type Priority = 'basse' | 'moyenne' | 'haute';
export type Repeat = 'jamais' | 'jour' | 'semaine' | 'mois';

export interface EventItem {
  id: string;
  title: string;
  /** date de référence au format ISO local YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  category: Category;
  repeat: Repeat;
  createdAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm ou null (tâche sans heure) */
  time: string | null;
  category: Category;
  priority: Priority;
  done: boolean;
  createdAt: number;
}

export interface Settings {
  prenom: string;
  /** heure de début de la grille (6–10) */
  dayStart: number;
  sounds: boolean;
  voice: boolean;
  /** dernière date (YYYY-MM-DD) où le brief du matin a été proposé/écouté */
  briefShownDate: string;
}
