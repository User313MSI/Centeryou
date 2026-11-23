import { NextResponse } from 'next/server';

import { createPortalSession, isStripeConfigured } from '../../../lib/server/stripe';

import {
  isValidCustomerId,
  json,
  rateLimitOrNull,
  readJsonBody,
  trustedBaseUrl,
  unknownFields,
} from '../../../lib/server/http';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/** M-13 Verrou : plafond par IP — modèle /api/voix (429 + Retry-After, FR). */
const RATE_LIMIT_PER_HOUR = 10;

const MAX_BODY_BYTES = 8 * 1024;

/**
 * POST /api/portal { customerId }
 * Ouvre le portail client Stripe (gérer l'abonnement, changer d'offre,
 * annuler — l'annulation prend effet à la fin de la période, protection douce).
 *
 * Sécurité (M-13) : rate-limit par IP ; corps plafonné ; champs inattendus
 * rejetés ; customerId validé (format Stripe `cus_…`) ; URL de retour dérivée
 * d'une origine de confiance uniquement (jamais d'un Host forgé).
 */
export async function POST(req: Request) {
  const limited = rateLimitOrNull(req, 'portal', RATE_LIMIT_PER_HOUR);
  if (limited) return limited;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  if (unknownFields(parsed.body, ['customerId']).length > 0) {
    return json({ error: 'Champ inattendu dans la requête' }, 400);
  }
  const customerId = typeof parsed.body.customerId === 'string' ? parsed.body.customerId.trim() : '';
  if (!customerId) {
    return json({ error: 'customerId manquant' }, 400);
  }
  if (!isValidCustomerId(customerId)) {
    return json({ error: 'customerId invalide' }, 400);
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'La gestion de l’abonnement n’est pas encore disponible — réessaie plus tard.' }, { status: 503 });
  }

  const base = trustedBaseUrl(req);
  if (!base.ok) return base.response;

  try {
    const session = await createPortalSession({
      customerId,
      returnUrl: `${base.base}/reglages?checkout=return`,
    });
    if (!session.url) {
      return json({ error: 'Portail Stripe indisponible' }, 502);
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Détail (ex. message d'erreur Stripe) uniquement dans les logs serveur.
    console.error('[api/portal]', err);
    return json({ error: 'Erreur interne lors de l’ouverture du portail' }, 500);
  }
}
