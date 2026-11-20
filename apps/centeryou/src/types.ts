import type { CategoryColor } from '../design/tokens';

export type Category = CategoryColor;
export type Priority = 'basse' | 'moyenne' | 'haute';
export type Repeat = 'jamais' | 'jour' | 'semaine' | 'mois';
/** Séquence d'accueil : à chaque ouverture, une fois par jour (défaut) ou désactivée */
export type WelcomeSequenceMode = 'always' | 'daily' | 'off';
/** Film de lancement : à chaque ouverture, une fois par jour (défaut) ou jamais */
export type LaunchFilmMode = 'always' | 'daily' | 'off';
/** Thème d'apparence : clair (défaut) ou sombre, mémorisé */
export type Theme = 'clair' | 'sombre';

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
  /** thème d'apparence (bascule dans Réglages, mémorisé) */
  theme: Theme;
  /** parcours d'accueil des nouveaux arrivants terminé ? */
  onboarded: boolean;
  /** dernière date (YYYY-MM-DD) où le brief du matin a été proposé/écouté */
  briefShownDate: string;
  /** fréquence d'affichage de la séquence d'accueil animée */
  welcomeSequence: WelcomeSequenceMode;
  /** dernière date (YYYY-MM-DD) où la séquence d'accueil a été affichée */
  welcomeShownDate: string;
  /** fréquence du film de lancement cinématique (page Aujourd'hui) */
  launchFilm: LaunchFilmMode;
  /** dernière date (YYYY-MM-DD) où le film de lancement a été joué */
  launchFilmShownDate: string;
  /** voix du film de lancement (bascule dédiée — voix du navigateur par défaut, premium si droit + quota) */
  launchFilmVoice: boolean;
  /** mode sombre (champ historique, le thème actif est piloté par `theme`) */
  darkMode: boolean;
  /** animations & célébrations (apparitions douces, micro-confettis, petits feux d'artifice) — activées par défaut */
  animations: boolean;
}
