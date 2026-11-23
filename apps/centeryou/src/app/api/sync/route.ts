import { NextResponse } from 'next/server';

import { getSnapshot, putSnapshot, type SyncSnapshot } from '../../../lib/server/sync-store';

import { checkRateLimit } from '../../../lib/server/rate-limit';

import { supabaseServerConfig, verifySessionUser, type SessionUser } from '../../../lib/server/auth';

import { isStripeConfigured, retrieveCustomer } from '../../../lib/server/stripe';

import { isValidCustomerId, json, unknownFields } from '../../../lib/server/http';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/sync?customerId=... → dernier snapshot connu (ou null)
 * POST /api/sync { customerId, state, updatedAt } → enregistre le snapshot
 * Synchronisation multi-appareils de l'offre Premium (dernier écrivain gagne,
 * horodatage updatedAt). Sans customerId → 400. Aucune donnée de carte ici.
 *
 * Sécurité (M-08, audit Sentinelle n°1 + M-13 Verrou) :
 * - limiteur de débit par IP, comme /api/voix (20 appels/heure, 429 + Retry-After) ;
 * - authentification avant toute lecture ou écriture : si Supabase est configuré,
 *   une session Supabase valide (Bearer) correspondant au compte est exigée —
 *   quand Stripe est configuré, l'e-mail de la session doit correspondre à celui
 *   du client Stripe `customerId` ; si Stripe est configuré sans Supabase, la
 *   propriété ne peut pas être prouvée → refus propre (503). Le point d'entrée
 *   n'est jamais laissé ouvert là où des données de compte peuvent exister.
 *   Sans aucun backend configuré (dev local), le repli mémoire est inchangé.
 * - M-32 (attaque R2 de Bastion) : quand Supabase est configuré SANS Stripe, le
 *   snapshot est indexé par l'identité de la session (`user:<id>`), jamais par un
 *   `customerId` libre fourni par le client → la fenêtre IDOR est fermée.
 * - validation d'entrées (M-13) : corps ≤ 1 Mo (413), JSON invalide → 400,
 *   champs inattendus rejetés (400), customerId au format Stripe `cus_…`,
 *   updatedAt nombre fini borné, state objet JSON obligatoire.
 */
const MAX_CUSTOMER_ID_LENGTH = 100;

const MAX_BODY_CHARS = 1_000_000;

const RATE_LIMIT_PER_HOUR = 20;

/** Borne supérieure d'un horodatage milliseconde crédible (≈ année 33658). */
const MAX_UPDATED_AT = 1e15;

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

function badRequest(message: string): NextResponse {
  return json({ error: message }, 400);
}

function validCustomerId(raw: string | undefined): string | null {
  const id = raw?.trim() ?? '';
  if (!id || id.length > MAX_CUSTOMER_ID_LENGTH || !isValidCustomerId(id)) return null;
  return id;
}

type AuthzResult =
  | { ok: true; user: SessionUser | null; /** clé de stockage réelle du snapshot */ storageKey: string }
  | { ok: false; response: NextResponse };

/**
 * Authentifie l'appelant et DERIVE la clé de stockage du snapshot (M-32, attaque
 * R2 de Bastion) :
 * - Stripe configuré : la propriété du `customerId` est prouvée par l'e-mail de la
 *   session (comme avant) et la clé reste le `customerId` ;
 * - Supabase configuré SANS Stripe : aucun `cus_…` fourni par le client ne peut être
 *   prouvé, donc la sauvegarde est liée à l'IDENTITÉ DE LA SESSION (`user:<id>`),
 *   jamais à un identifiant de client libre — la fenêtre IDOR est fermée ;
 * - aucun backend configuré (dev local) : repli mémoire inchangé, clé = customerId.
 */
async function authorize(req: Request, customerId: string): Promise<AuthzResult> {
  if (!supabaseServerConfig()) {
    // Aucun compte n'est possible sur ce déploiement : une synchro ne peut contenir
    // de vraies données que si Stripe est configuré (les customerId viennent de Stripe).
    if (isStripeConfigured()) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Vérification d’identité indisponible sur ce déploiement : synchronisation refusée.' },
          { status: 503, headers: NO_STORE },
        ),
      };
    }
    return { ok: true, user: null, storageKey: customerId }; // dev local sans aucun backend : repli mémoire, inchangé
  }
  const user = await verifySessionUser(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Session invalide ou absente : synchronisation refusée.' },
        { status: 401, headers: NO_STORE },
      ),
    };
  }
  if (isStripeConfigured()) {
    // Le compte (customerId Stripe) doit correspondre à la session : même e-mail.
    try {
      const customer = await retrieveCustomer(customerId);
      const customerEmail = (customer.email ?? '').trim().toLowerCase();
      if (!customerEmail || customerEmail !== user.email.trim().toLowerCase()) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Ce compte ne correspond pas à ta session : accès refusé.' },
            { status: 403, headers: NO_STORE },
          ),
        };
      }
      return { ok: true, user, storageKey: customerId };
    } catch (err) {
      cleanError(err);
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Impossible de vérifier le propriétaire du compte pour le moment.' },
          { status: 502, headers: NO_STORE },
        ),
      };
    }
  }
  // M-32 (R2) : sans Stripe, le snapshot est indexé par l'identité de session,
  // JAMAIS par le `customerId` libre fourni dans la requête.
  return { ok: true, user, storageKey: `user:${user.id}` };
}

export async function GET(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const customerId = validCustomerId(new URL(req.url).searchParams.get('customerId') ?? undefined);
  if (!customerId) {
    return badRequest('customerId requis');
  }
  const auth = await authorize(req, customerId);
  if (!auth.ok) return auth.response;
  try {
    const snap = await getSnapshot(auth.storageKey);
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
    if (unknownFields(body as Record<string, unknown>, ['customerId', 'updatedAt', 'state']).length > 0) {
      return badRequest('Champ inattendu dans la requête');
    }
    const customerId = validCustomerId(typeof body.customerId === 'string' ? body.customerId : undefined);
    const updatedAt = body.updatedAt;
    const state = body.state;
    if (
      !customerId ||
      typeof updatedAt !== 'number' ||
      !Number.isFinite(updatedAt) ||
      Math.abs(updatedAt) > MAX_UPDATED_AT ||
      !state ||
      typeof state !== 'object' ||
      Array.isArray(state)
    ) {
      return badRequest('customerId, updatedAt et state requis');
    }
    const auth = await authorize(req, customerId);
    if (!auth.ok) return auth.response;
    const snap: SyncSnapshot = { customerId: auth.storageKey, updatedAt, state };
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
