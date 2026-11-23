/**
 * Centeryou — configuration UNIQUE des offres (noms, montants, libellés).
 * Tout ce qui définit une offre est ici : modifier un prix ou un nom se fait
 * dans ce seul fichier (plus, côté Stripe, la variable STRIPE_PRICE_ID_PREMIUM
 * optionnelle pour utiliser un Price créé dans le dashboard Stripe).
 *
 * Partagé client + serveur (aucun 'use client', aucune dépendance).
 */

export type PlanId = 'decouverte' | 'premium';

export interface PlanOffer {
  id: PlanId;
  name: string;
  /** prix mensuel en euros (0 = gratuit) */
  priceMonthlyEur: number;
  /** libellé court affiché dans la carte Abonnement */
  tagline: string;
  features: string[];
  ctaLabel: string;
}

export const PLANS: Record<PlanId, PlanOffer> = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    priceMonthlyEur: 0,
    tagline: 'L’essentiel, gratuit pour toujours.',
    features: [
      'Planning et tâches illimités',
      'Voix du navigateur (gratuite)',
      'Assistant vocal (commandes)',
      'Mode sombre inclus',
      'Données 100 % locales (1 appareil)',
    ],
    ctaLabel: 'Offre actuelle',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthlyEur: 4.99,
    tagline: 'Tout Centeryou, sans limite.',
    features: [
      // Nuage (M-23) : « quota serveur » = jargon ingénieur, retiré (libellé seul, aucun comportement)
      'Voix premium illimitée',
      'Sauvegarde en ligne avec un compte',
      'Synchronisation multi-appareils',
      'Toutes les fonctionnalités Découverte',
    ],
    ctaLabel: 'Passer Premium',
  },
};

/** Nombre d'utilisations de la voix premium offertes chaque mois en Découverte */
export const FREE_PREMIUM_VOICE_LIMIT_PER_MONTH = 3;

/** Nom de la variable d'environnement contenant le Price Stripe du Premium (optionnel) */
export const STRIPE_PRICE_ID_ENV = 'STRIPE_PRICE_ID_PREMIUM';

export function formatPriceEur(eur: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(eur);
}

export function formatPriceMonthly(eur: number): string {
  return `${formatPriceEur(eur)}/mois`;
}
