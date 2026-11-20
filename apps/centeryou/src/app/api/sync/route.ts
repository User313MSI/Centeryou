import { NextResponse } from 'next/server';

import { getSnapshot, putSnapshot, type SyncSnapshot } from '../../../lib/server/sync-store';

import { checkRateLimit } from '../../../lib/server/rate-limit';

import { supabaseServerConfig, verifySessionUser } from '../../../lib/server/auth';

import { isStripeConfigured, retrieveCustomer } from '../../../lib/server/stripe';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/sync?customerId=... → dernier snapshot connu (ou null)
 * POST /api/sync { customerId, state, updatedAt } → enregistre le snapshot
 * Synchronisation multi-appareils de l'offre Premium (dernier écrivain gagne,
 * horodatage updatedAt). Sans customerId → 400. Aucune donnée de carte ici.
 *
 * Sécurité (M-08, audit Sentinelle n°1) :
 * - limiteur de débit par IP, comme /api/voix (20 appels/heure, 429 + Retry-After) ;
 * - authentification avant toute lecture ou écriture : si Supabase est configuré,
 *   une session Supabase valide (Bearer) correspondant au compte est exigée —
 *   quand Stripe est configuré, l'e-mail de la session doit correspondre à celui
 *   du client Stripe `customerId` ; si Stripe est configuré sans Supabase, la
 *   propriété ne peut pas être prouvée → refus propre (503). Le point d'entrée
 *   n'est jamais laissé ouvert là où des données de compte peuvent exister.
 *   Sans aucun backend configuré (dev local), le repli mémoire est inchangé.
 */
const MAX_CUSTOMER_ID_LENGTH = 100;

const MAX_BODY_CHARS = 1_000_000;

const RATE_LIMIT_PER_HOUR = 20;

const NO_STORE: Record<string, string> = { 'Cache-Control': 'no-store' };

function cleanError(err: unknown): void {
  // Détail complet uniquement dans les logs serveur — jamais dans la réponse client.
  console.error('[api/sync]', err);
}

function rateLimited(req: Request): NextResponse | null {
  const hit = checkRateLimit(req, 'sync', RATE_LIMIT_PER_HOUR);
  if (hit.ok) return null;
  return NextResponse.json(
    {
      ok: false,
      reason: 'rate-limit',
      limit: RATE_LIMIT_PER_HOUR,
      remaining: 0,
      retryAfter: hit.retryAfter,
      message: `Trop de requêtes depuis cette adresse : plafond de ${RATE_LIMIT_PER_HOUR} appels par heure. Réessaie dans ${hit.retryAfter} seconde${hit.retryAfter > 1 ? 's' : ''}.`,
    },
    { status: 429, headers: { ...NO_STORE, 'Retry-After': String(hit.retryAfter) } },
  );
}

/**
 * Renvoie une réponse d'erreur si l'appelant ne peut pas être authentifié comme
 * le propriétaire du compte `customerId`, sinon null (accès autorisé).
 */
async function authorize(req: Request, customerId: string): Promise<NextResponse | null> {
  if (!supabaseServerConfig()) {
    // Aucun compte n'est possible sur ce déploiement : une synchro ne peut contenir
    // de vraies données que si Stripe est configuré (les customerId viennent de Stripe).
    if (isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Vérification d’identité indisponible sur ce déploiement : synchronisation refusée.' },
        { status: 503, headers: NO_STORE },
      );
    }
    return null; // dev local sans aucun backend : repli mémoire, inchangé
  }
  const user = await verifySessionUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Session invalide ou absente : synchronisation refusée.' },
      { status: 401, headers: NO_STORE },
    );
  }
  if (isStripeConfigured()) {
    // Le compte (customerId Stripe) doit correspondre à la session : même e-mail.
    try {
      const customer = await retrieveCustomer(customerId);
      const customerEmail = (customer.email ?? '').trim().toLowerCase();
      if (!customerEmail || customerEmail !== user.email.trim().toLowerCase()) {
        return NextResponse.json(
          { error: 'Ce compte ne correspond pas à ta session : accès refusé.' },
          { status: 403, headers: NO_STORE },
        );
      }
    } catch (err) {
      cleanError(err);
      return NextResponse.json(
        { error: 'Impossible de vérifier le propriétaire du compte pour le moment.' },
        { status: 502, headers: NO_STORE },
      );
    }
  }
  return null;
}

export async function GET(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const customerId = new URL(req.url).searchParams.get('customerId')?.trim();
  if (!customerId || customerId.length > MAX_CUSTOMER_ID_LENGTH) {
    return NextResponse.json({ error: 'customerId requis' }, { status: 400, headers: NO_STORE });
  }
  const denied = await authorize(req, customerId);
  if (denied) return denied;
  try {
    const snap = await getSnapshot(customerId);
    return NextResponse.json({ snapshot: snap }, { headers: NO_STORE });
  } catch (err) {
    cleanError(err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'Corps de requête trop volumineux' }, { status: 413, headers: NO_STORE });
    }
    const body = (JSON.parse(raw || '{}') as Partial<SyncSnapshot>) ?? {};
    const customerId = body.customerId?.trim();
    if (!customerId || customerId.length > MAX_CUSTOMER_ID_LENGTH || typeof body.updatedAt !== 'number' || body.state === undefined) {
      return NextResponse.json({ error: 'customerId, updatedAt et state requis' }, { status: 400, headers: NO_STORE });
    }
    const denied = await authorize(req, customerId);
    if (denied) return denied;
    const snap: SyncSnapshot = { customerId, updatedAt: body.updatedAt, state: body.state };
    await putSnapshot(snap);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400, headers: NO_STORE });
    }
    cleanError(err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500, headers: NO_STORE });
  }
}
