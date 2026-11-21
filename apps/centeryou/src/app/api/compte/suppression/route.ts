import { NextResponse } from 'next/server';

import { supabaseServerConfig, verifySessionUser } from '../../../../lib/server/auth';

import {
  isValidEmail,
  json,
  rateLimitOrNull,
  readJsonBody,
  unknownFields,
} from '../../../../lib/server/http';

/** M-13 Verrou : action rare et sensible — plafond par IP, modèle /api/voix. */
const RATE_LIMIT_PER_HOUR = 10;

const MAX_BODY_BYTES = 4 * 1024;

/**
 * POST /api/compte/suppression
 *
 * Suppression du compte serveur (table `comptes` Supabase) : UNIQUEMENT pour
 * la session authentifiée correspondante (M-08, audit Sentinelle n°2). Le
 * navigateur envoie « Authorization: Bearer <access_token> » de sa session
 * Supabase ; l'e-mail supprimé est celui de la session — jamais une adresse
 * fournie dans le corps de la requête. Sans session valide → 401, aucun
 * DELETE n'est exécuté. Si aucun compte serveur n'est configuré → accusé de
 * réception sans effet de bord (comportement inchangé).
 *
 * Sécurité (M-13) : rate-limit par IP (429 + Retry-After, FR) ; corps plafonné
 * (4 Ko), champs inattendus rejetés, e-mail du corps validé s'il est présent.
 */
export async function POST(req: Request) {
  const limited = rateLimitOrNull(req, 'suppression', RATE_LIMIT_PER_HOUR);
  if (limited) return limited;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  if (unknownFields(parsed.body, ['email']).length > 0) {
    return json({ ok: false, serverDeleted: false, error: 'champ_inattendu' }, 400);
  }
  let email: string | undefined;
  if (parsed.body.email !== undefined) {
    if (!isValidEmail(parsed.body.email)) {
      return json({ ok: false, serverDeleted: false, error: 'email_invalide' }, 400);
    }
    email = parsed.body.email;
  }

  const cfg = supabaseServerConfig();

  if (cfg) {
    const user = await verifySessionUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, serverDeleted: false, error: 'session_requise' },
        { status: 401 },
      );
    }
    // l'e-mail supprimé est celui de la session authentifiée
    const target = user.email;
    if (email && email.trim().toLowerCase() !== target.trim().toLowerCase()) {
      return NextResponse.json(
        { ok: false, serverDeleted: false, error: 'compte_different_de_la_session' },
        { status: 403 },
      );
    }
    const query = `?select=id&email=eq.${encodeURIComponent(target)}`;
    try {
      const res = await fetch(`${cfg.url}/rest/v1/comptes${query}`, {
        method: 'DELETE',
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          Prefer: 'return=representation',
        },
      });
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, serverDeleted: false, error: `supabase_http_${res.status}` },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, serverDeleted: true });
    } catch {
      return NextResponse.json(
        { ok: false, serverDeleted: false, error: 'supabase_unreachable' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    serverDeleted: false,
    reason: 'aucun compte serveur configure a ce jour',
  });
}
