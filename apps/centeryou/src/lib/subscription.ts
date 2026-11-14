/**
 * Logique d'abonnement partagée client + serveur (aucune dépendance DOM/node) :
 * types, statut dérivé et « protection douce » (un Premium annulé reste actif
 * jusqu'à la fin de la période payée, puis revient à Découverte sans perdre
 * ses données).
 */

import { FREE_PREMIUM_VOICE_LIMIT_PER_MONTH } from './plans';

export type AppSubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'none';
export type PlanId = 'decouverte' | 'premium';

export interface SubscriptionState {
  status: AppSubscriptionStatus;
  plan: PlanId;
  customerId: string | null;
  subscriptionId: string | null;
  /** fin de la période en cours (ISO) — conservée même après annulation */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: number;
}

export interface VoiceQuota {
  /** mois courant au format YYYY-MM (heure locale) */
  month: string;
  used: number;
}

export const defaultSubscription: SubscriptionState = {
  status: 'none',
  plan: 'decouverte',
  customerId: null,
  subscriptionId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  updatedAt: 0,
};

export const defaultVoiceQuota: VoiceQuota = { month: '', used: 0 };

/** true si l'abonnement donne encore accès à Premium à l'instant `now` */
export function isPremiumActive(
  s: Pick<SubscriptionState, 'status' | 'currentPeriodEnd'>,
  now = Date.now(),
): boolean {
  if (s.status === 'active' || s.status === 'past_due') return true;
  if (s.status === 'canceled' && s.currentPeriodEnd) {
    return new Date(s.currentPeriodEnd).getTime() > now;
  }
  return false;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** essais de voix premium restants ce mois-ci pour un utilisateur gratuit */
export function premiumVoiceRemaining(quota: VoiceQuota, month: string = currentMonth()): number {
  const used = quota.month === month ? quota.used : 0;
  return Math.max(0, FREE_PREMIUM_VOICE_LIMIT_PER_MONTH - used);
}

export function formatPeriodEnd(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
