import type { WelcomeSequenceMode } from '../types';

/**
 * Décide si la séquence d'accueil doit s'afficher à l'ouverture.
 * - 'off' : jamais ;
 * - 'daily' (défaut) : une fois par jour (si déjà vue aujourd'hui, non) ;
 * - 'always' : à chaque ouverture.
 */
export function shouldShowWelcome(
  mode: WelcomeSequenceMode | undefined,
  welcomeShownDate: string,
  today: string,
): boolean {
  const m = mode ?? 'daily';
  if (m === 'off') return false;
  if (m === 'daily' && welcomeShownDate === today) return false;
  return true;
}
