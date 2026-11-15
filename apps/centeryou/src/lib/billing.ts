'use client';

/**
 * Appels client vers les routes serveur de paiement Stripe.
 * Aucune clé Stripe ici : le navigateur ne parle qu'aux routes /api (serveur).
 */

import { useStore } from './store';
import { useUiStore } from './ui-store';
import type { SubscriptionState } from './subscription';
import { uid } from './utils';

/** identifiant d'appareil persistant (créé au premier besoin) */
export function getDeviceId(): string {
  const s = useStore.getState();
  if (s.deviceId) return s.deviceId;
  const id = `dev-${uid()}`;
  useStore.setState({ deviceId: id });
  return id;
}

/** redirige vers Stripe Checkout (hébergé, en français) pour passer Premium */
export async function startCheckout(): Promise<boolean> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      useUiStore.getState().pushToast({
        message: data.error ?? 'Le paiement est momentanément indisponible. Réessaie dans un instant.',
        duration: 6000,
      });
      return false;
    }
    window.location.href = data.url;
    return true;
  } catch {
    useUiStore.getState().pushToast({
      message: 'Le paiement est momentanément indisponible. Réessaie dans un instant.',
      duration: 6000,
    });
    return false;
  }
}

/** ouvre le portail client Stripe (gérer / annuler l'abonnement) */
export async function openCustomerPortal(): Promise<boolean> {
  const customerId = useStore.getState().subscription.customerId;
  if (!customerId) return false;
  try {
    const res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      useUiStore.getState().pushToast({
        message: data.error ?? 'Le portail de gestion est momentanément indisponible.',
        duration: 6000,
      });
      return false;
    }
    window.location.href = data.url;
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronise le statut d'abonnement depuis le serveur (qui lit Stripe).
 * Appelé au retour de Checkout (sessionId) et à l'ouverture de Réglages.
 * Ne lève jamais d'erreur : en cas d'échec, le statut local est conservé.
 */
export async function syncSubscription(opts: { sessionId?: string } = {}): Promise<SubscriptionState | null> {
  const state = useStore.getState();
  const customerId = state.subscription.customerId ?? undefined;
  if (!customerId && !opts.sessionId) return state.subscription;
  try {
    const res = await fetch('/api/subscription/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, sessionId: opts.sessionId }),
    });
    if (!res.ok) return state.subscription;
    const data = (await res.json().catch(() => ({}))) as { snapshot?: SubscriptionState | null };
    if (!data.snapshot) return state.subscription;
    useStore.getState().setSubscription(data.snapshot);
    return data.snapshot;
  } catch {
    return state.subscription;
  }
}
