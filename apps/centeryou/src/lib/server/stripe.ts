/**
 * Client Stripe minimal côté serveur, SANS dépendance npm :
 * appels REST directs (fetch) + vérification de signature des webhooks (node:crypto).
 *
 * Toutes les clés (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) ne vivent que ici,
 * dans des routes serveur — jamais dans le bundle navigateur.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { PLANS, STRIPE_PRICE_ID_ENV } from '../plans';
import {
  isPremiumActive,
  type AppSubscriptionStatus,
  type PlanId,
  type SubscriptionState,
} from '../subscription';

export { isPremiumActive };
export type { AppSubscriptionStatus, PlanId, SubscriptionState };

const STRIPE_API = 'https://api.stripe.com/v1';

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key;
}

export function isStripeConfigured(): boolean {
  return secretKey().length > 0;
}

interface StripeErrorBody {
  error?: { message?: string; type?: string };
}

async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error('STRIPE_SECRET_KEY manquante');
  const url = `${STRIPE_API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'POST' ? new URLSearchParams(params ?? {}).toString() : undefined,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & StripeErrorBody;
  if (!res.ok) {
    throw new Error(`Stripe ${res.status} ${path}: ${data.error?.message ?? 'erreur inconnue'}`);
  }
  return data;
}

/** aplatit un objet imbriqué en params form-encodés Stripe (line_items[0][price_data][...]) */
function flatten(prefix: string, value: unknown, out: Record<string, string>): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(`${prefix}[${i}]`, v, out));
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(`${prefix}[${k}]`, v, out);
    }
  } else {
    out[prefix] = String(value);
  }
}

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
}

export async function createCheckoutSession(opts: {
  deviceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSessionResult> {
  const premium = PLANS.premium;
  const priceId = process.env[STRIPE_PRICE_ID_ENV] ?? '';
  const lineItem: Record<string, unknown> = priceId
    ? { price: priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(premium.priceMonthlyEur * 100),
          recurring: { interval: 'month' },
          product_data: { name: `Centeryou ${premium.name}` },
        },
      };
  const params: Record<string, string> = {};
  flatten('line_items[0]', lineItem, params);
  Object.assign(params, {
    mode: 'subscription',
    locale: 'fr',
    client_reference_id: opts.deviceId,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    'metadata[deviceId]': opts.deviceId,
    'subscription_data[metadata][deviceId]': opts.deviceId,
    'payment_method_types[0]': 'card',
  });
  const session = await stripeRequest<CheckoutSessionResult>('POST', '/checkout/sessions', params);
  if (!session.url) throw new Error('Session Stripe sans URL de Checkout');
  return session;
}

export async function createPortalSession(opts: { customerId: string; returnUrl: string }): Promise<{ url: string | null }> {
  return stripeRequest<{ url: string | null }>('POST', '/billing_portal/sessions', {
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
}

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  created: number;
}

export interface StripeCheckoutSession {
  id: string;
  customer: string | null;
  subscription: string | StripeSubscription | null;
}

export async function retrieveCheckoutSession(sessionId: string): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(
    'GET',
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
  );
}

export async function retrieveSubscription(subscriptionId: string): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>('GET', `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function listCustomerSubscriptions(customerId: string): Promise<StripeSubscription[]> {
  const res = await stripeRequest<{ data: StripeSubscription[] }>(
    'GET',
    `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`,
  );
  return res.data ?? [];
}

/* ------------------------------------------------------------------ */
/* Statut d'abonnement dérivé (source de vérité : Stripe)             */
/* ------------------------------------------------------------------ */

export type SubscriptionSnapshot = SubscriptionState;

function isoOf(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

export function snapshotFromSubscription(sub: StripeSubscription): SubscriptionSnapshot {
  let status: AppSubscriptionStatus = 'none';
  if (sub.status === 'active' || sub.status === 'trialing') status = 'active';
  else if (sub.status === 'past_due' || sub.status === 'unpaid') status = 'past_due';
  else if (sub.status === 'canceled') status = 'canceled';
  return {
    status,
    plan: (status === 'none' ? 'decouverte' : 'premium') as PlanId,
    customerId: typeof sub.customer === 'string' ? sub.customer : null,
    subscriptionId: sub.id,
    currentPeriodEnd: isoOf(sub.current_period_end),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Cache serveur alimenté par les webhooks (repli si l'API Stripe     */
/* est indisponible ; Stripe reste la source de vérité).              */
/* ------------------------------------------------------------------ */

const webhookCache = new Map<string, SubscriptionSnapshot>();

export function cacheSubscription(snap: SubscriptionSnapshot): void {
  if (!snap.customerId) return;
  webhookCache.set(snap.customerId, snap);
}

export function readCachedSubscription(customerId: string): SubscriptionSnapshot | null {
  return webhookCache.get(customerId) ?? null;
}

/* ------------------------------------------------------------------ */
/* Vérification de signature des webhooks Stripe (HMAC-SHA256)        */
/* ------------------------------------------------------------------ */

/** Tolérance d'horodatage des webhooks (recommandation Stripe : 5 min) — anti-rejeu. */
const WEBHOOK_TOLERANCE_SECONDS = 300;

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = v ?? '';
    if (k === 'v1' && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}
