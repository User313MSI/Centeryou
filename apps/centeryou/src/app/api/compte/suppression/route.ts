import { NextResponse } from 'next/server';

import { supabaseServerConfig, verifySessionUser } from '../../../../lib/server/auth';

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
 */
export async function POST(req: Request) {
  let email: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.email === 'string') email = body.email;
  } catch {
    email = undefined;
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
