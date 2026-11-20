import type { Settings } from '../types';

/**
 * Motion Centeryou (Paillette) — aides pures, sans DOM, testables en node.
 *
 * Règle d'or : les animations ne vivent que si le réglage « Animations &
 * célébrations » est activé ET si le système ne demande pas prefers-reduced-motion.
 * Sinon : tout est statique instantanément.
 */

/** demande système « réduire les animations » — false si matchMedia est indisponible (SSR, vieux navigateur) */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** animations actuellement actives : réglage utilisateur && !prefers-reduced-motion */
export function animationsActiveFrom(settings: Pick<Settings, 'animations'>): boolean {
  return settings.animations === true && !prefersReducedMotion();
}

/**
 * Palette des célébrations, adossée aux tokens de marque via les variables CSS
 * du thème (injectées dans :root / .dark) : violet #7C5CFF, violet profond #5B3FE8,
 * teal #2DD4BF, ambre #FFB020.
 */
export const CELEBRATE_PALETTE = [
  'rgb(var(--c-primary))',
  'rgb(var(--c-primarydark))',
  'rgb(var(--c-voice))',
  'rgb(var(--c-warning))',
] as const;

/** un record est battu quand la valeur dépasse strictement le record précédent (et vaut au moins 1) */
export function isNewRecord(previous: number, next: number): boolean {
  return Number.isFinite(next) && next > 0 && next > previous;
}

/** stockage minimal attendu pour lire/écrire un record (localStorage ou bouchon de test) */
export interface RecordStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** lit un record numérique persisté ; 0 si absent, illisible ou invalide */
export function readRecord(storage: RecordStorage | undefined, key: string): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** persiste un record numérique (best-effort : un stockage plein ne doit jamais planter l'app) */
export function writeRecord(storage: RecordStorage | undefined, key: string, value: number): void {
  if (!storage || !Number.isFinite(value) || value <= 0) return;
  try {
    storage.setItem(key, String(Math.floor(value)));
  } catch {
    // quota dépassé / stockage indisponible : aucun impact
  }
}
