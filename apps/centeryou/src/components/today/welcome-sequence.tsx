'use client';

import { LaunchFilm } from './launch-film';

/**
 * Séquence d'accueil (page Aujourd'hui) — SUBLIMÉE en film de lancement cinématique
 * (M-06, Réalisateur) : le composant `LaunchFilm` prend le relais, en 5 scènes plein
 * écran avec voix du brief du matin, réglages « Film de lancement » et marquage
 * « vu » à la première ouverture du jour conservés (voir `src/lib/launch-film.ts`).
 *
 * Le nom d'export `WelcomeSequence` est conservé : montage (`aujourdhui-view.tsx`)
 * et tests existants (`tests/welcome-sequence.test.tsx`) continuent de fonctionner.
 */
export function WelcomeSequence() {
  return <LaunchFilm />;
}
