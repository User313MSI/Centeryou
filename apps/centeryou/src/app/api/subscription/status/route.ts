import { NextResponse } from 'next/server';

import {
  isStripeConfigured,
  listCustomerSubscriptions,
  readCachedSubscription,
  retrieveCheckoutSession,
  retrieveCustomer,
  retrieveSubscription,
  snapshotFromSubscription,
  type SubscriptionSnapshot,
} from '../../../../lib/server/stripe';

import { supabaseServerConfig, verifySessionUser } from '../../../../lib/server/auth';

import {
  isValidCheckoutSessionId,
  isValidCustomerId,
  json,
  rateLimitOrNull,
  readJsonBody,
  unknownFields,
} from '../../../../lib/server/http';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/** M-13 Verrou : plafond par IP (chaque appel lit Stripe) — modèle /api/voix. */
const RATE_LIMIT_PER_HOUR = 30;

const MAX_BODY_BYTES = 8 * 1024;

async function snapshotFromSession(sessionId: string): Promise<SubscriptionSnapshot | null> {
  const session = await retrieveCheckoutSession(sessionId);
  const customerId = session.customer ?? null;
  const sub = session.subscription;
  if (sub && typeof sub === 'object' && 'status' in sub) {
    return snapshotFromSubscription(sub);
  }
  if (sub && typeof sub === 'string') {
    return snapshotFromSubscription(await retrieveSubscription(sub));
  }
  if (customerId) {
    const subs = await listCustomerSubscriptions(customerId);
    if (subs.length > 0) return snapshotFromSubscription(subs[0]);
  }
  return null;
}

async function snapshotFromCustomer(customerId: string): Promise<SubscriptionSnapshot | null> {
  const subs = await listCustomerSubscriptions(customerId);
  if (subs.length === 0) return readCachedSubscription(customerId);
  const latest = subs.reduce((a, b) => (a.created >= b.created ? a : b));
  return snapshotFromSubscription(latest);
}

/**
 * POST /api/subscription/status { customerId? , sessionId? }
 * Renvoie le statut d'abonnement lu directement chez Stripe (source de vérité),
 * avec repli sur le cache alimenté par les webhooks si l'API Stripe répond mal.
 * En cas d'échec total : statut "none" — rien ne casse côté client.
 *
 * Sécurité (M-13) : rate-limit par IP (429 + Retry-After, FR) ; corps plafonné ;
 * champs inattendus rejetés ; customerId / sessionId validés (formats Stripe).
 *
 * Sécurité (M-32, attaque O3 de Bastion) : dès que Stripe est configuré (des
 * statuts réels peuvent exister), une session Supabase valide est EXIGÉE — la
 * route n'est plus un oracle sans auth — et si un `customerId` est demandé, son
 * e-mail Stripe doit correspondre à celui de la session (comme /api/sync et
 * /api/portal). Sans Supabase pour vérifier l'identité → refus propre (503).
 * Sans Stripe configuré (usage local pur) : réponse `configured: false` inchangée.
 */
export async function POST(req: Request) {
  const limited = rateLimitOrNull(req, 'subscription-status', RATE_LIMIT_PER_HOUR);
  if (limited) return limited;

  try {
    const parsed = await readJsonBody(req, MAX_BODY_BYTES);
    if (!parsed.ok) return parsed.response;
    if (unknownFields(parsed.body, ['customerId', 'sessionId']).length > 0) {
      return json({ error: 'Champ inattendu dans la requête' }, 400);
    }
    const customerId = typeof parsed.body.customerId === 'string' ? parsed.body.customerId.trim() : '';
    const sessionId = typeof parsed.body.sessionId === 'string' ? parsed.body.sessionId.trim() : '';
    if (customerId && !isValidCustomerId(customerId)) {
      return json({ error: 'customerId invalide' }, 400);
    }
    if (sessionId && !isValidCheckoutSessionId(sessionId)) {
      return json({ error: 'sessionId invalide' }, 400);
    }
    const customerIdOrNull = customerId || null;
    const sessionIdOrNull = sessionId || null;
    if (!customerIdOrNull && !sessionIdOrNull) {
      return json({ error: 'customerId ou sessionId requis' }, 400);
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ snapshot: null, configured: false });
    }
    // M-32 (O3) : plus d'oracle sans auth — session Supabase exigée dès que des
    // statuts d'abonnement réels peuvent exister côté serveur.
    if (!supabaseServerConfig()) {
      return json({ error: 'Vérification d’identité indisponible sur ce déploiement : statut refusé.' }, 503);
    }
    const user = await verifySessionUser(req);
    if (!user) {
      return json({ error: 'Session invalide ou absente : statut d’abonnement refusé.' }, 401);
    }
    if (customerIdOrNull) {
      // comme /api/sync et /api/portal : le compte doit appartenir à la session
      try {
        const customer = await retrieveCustomer(customerIdOrNull);
        const customerEmail = (customer.email ?? '').trim().toLowerCase();
        if (!customerEmail || customerEmail !== user.email.trim().toLowerCase()) {
          return json({ error: 'Ce compte ne correspond pas à ta session : accès refusé.' }, 403);
        }
      } catch {
        return json({ error: 'Impossible de vérifier le propriétaire du compte pour le moment.' }, 502);
      }
    }
    try {
      const snapshot =
        sessionIdOrNull && !customerIdOrNull
          ? await snapshotFromSession(sessionIdOrNull)
          : customerIdOrNull
            ? await snapshotFromCustomer(customerIdOrNull)
            : sessionIdOrNull
              ? await snapshotFromSession(sessionIdOrNull)
              : null;
      return NextResponse.json({ snapshot, configured: true });
    } catch {
      const fallback = customerIdOrNull ? readCachedSubscription(customerIdOrNull) : null;
      return NextResponse.json({ snapshot: fallback, configured: true, fromCache: true });
    }
  } catch (err) {
    // Détail interne uniquement dans les logs serveur — jamais dans la réponse client.
    console.error('[api/subscription/status]', err);
    return json({ error: 'Erreur interne' }, 500);
  }
}
