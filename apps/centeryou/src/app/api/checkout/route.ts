import { NextResponse } from 'next/server';

import { createCheckoutSession, isStripeConfigured } from '../../../lib/server/stripe';

import {
  isSafeText,
  json,
  rateLimitOrNull,
  readJsonBody,
  trustedBaseUrl,
  unknownFields,
} from '../../../lib/server/http';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/** M-13 Verrou : plafond par IP (créer une session Stripe a un coût) — modèle /api/voix. */
const RATE_LIMIT_PER_HOUR = 10;

/** Corps minuscule attendu (un deviceId) : 8 Ko max, 413 au-delà. */
const MAX_BODY_BYTES = 8 * 1024;

const MAX_DEVICE_ID_LENGTH = 100;

/**
 * POST /api/checkout { deviceId }
 * Crée une session Stripe Checkout (mode subscription, en français) et renvoie
 * l'URL hébergée par Stripe — aucune clé Stripe côté client.
 *
 * Sécurité (M-13) : rate-limit par IP (429 + Retry-After, FR) ; corps plafonné,
 * champs inattendus rejetés, deviceId validé (imprimable, ≤ 100 car) ; l'URL de
 * succès n'est dérivée QUE d'une origine de confiance (APP_URL ou Host validé
 * contre les domaines connus — jamais d'un Host forgé).
 */
export async function POST(req: Request) {
  const limited = rateLimitOrNull(req, 'checkout', RATE_LIMIT_PER_HOUR);
  if (limited) return limited;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  if (unknownFields(parsed.body, ['deviceId']).length > 0) {
    return json({ error: 'Champ inattendu dans la requête' }, 400);
  }
  const deviceId = typeof parsed.body.deviceId === 'string' ? parsed.body.deviceId.trim() : '';
  if (!deviceId) {
    return json({ error: 'deviceId manquant' }, 400);
  }
  if (!isSafeText(deviceId, MAX_DEVICE_ID_LENGTH)) {
    return json({ error: 'deviceId invalide' }, 400);
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Paiement non configuré (STRIPE_SECRET_KEY manquante côté serveur)' },
      { status: 503 },
    );
  }

  const base = trustedBaseUrl(req);
  if (!base.ok) return base.response;

  try {
    const session = await createCheckoutSession({
      deviceId,
      successUrl: `${base.base}/reglages?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base.base}/reglages?checkout=cancel`,
    });
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    // Détail (ex. message d'erreur Stripe) uniquement dans les logs serveur.
    console.error('[api/checkout]', err);
    return json({ error: 'Erreur interne lors de la création du paiement' }, 500);
  }
}
