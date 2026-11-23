import { NextResponse } from 'next/server';

import { createPortalSession, isStripeConfigured, retrieveCustomer } from '../../../lib/server/stripe';

import { supabaseServerConfig, verifySessionUser } from '../../../lib/server/auth';

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
 *
 * Sécurité (M-32, attaque R3 de Bastion) : dès que Stripe est configuré, une
 * session Supabase valide est EXIGÉE et l'e-mail de la session doit être celui
 * du client Stripe `customerId` (même garantie que /api/sync) — connaître un
 * `cus_…` ne suffit plus à ouvrir le portail de facturation de quelqu'un d'autre.
 * Sans Supabase pour vérifier l'identité → refus propre (503, fail-closed).
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

  // M-32 (R3) : preuve de propriété, comme la synchronisation — la session est
  // exigée et son e-mail doit correspondre à celui du client Stripe.
  if (!supabaseServerConfig()) {
    return json({ error: 'Vérification d’identité indisponible sur ce déploiement : portail refusé.' }, 503);
  }
  const user = await verifySessionUser(req);
  if (!user) {
    return json({ error: 'Session invalide ou absente : portail refusé.' }, 401);
  }
  try {
    const customer = await retrieveCustomer(customerId);
    const customerEmail = (customer.email ?? '').trim().toLowerCase();
    if (!customerEmail || customerEmail !== user.email.trim().toLowerCase()) {
      return json({ error: 'Ce compte ne correspond pas à ta session : accès refusé.' }, 403);
    }
  } catch (err) {
    console.error('[api/portal]', err);
    return json({ error: 'Impossible de vérifier le propriétaire du compte pour le moment.' }, 502);
  }

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
