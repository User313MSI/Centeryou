import { NextResponse } from 'next/server';
import { getSnapshot, putSnapshot, type SyncSnapshot } from '../../../lib/server/sync-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/sync?customerId=... → dernier snapshot connu (ou null)
 * POST /api/sync { customerId, state, updatedAt } → enregistre le snapshot
 * Synchronisation multi-appareils de l'offre Premium (dernier écrivain gagne,
 * horodatage updatedAt). Sans customerId → 400. Aucune donnée de carte ici.
 */
const MAX_CUSTOMER_ID_LENGTH = 100;
const MAX_BODY_CHARS = 1_000_000;

function cleanError(err: unknown): void {
  // Détail complet uniquement dans les logs serveur — jamais dans la réponse client.
  console.error('[api/sync]', err);
}

export async function GET(req: Request) {
  const customerId = new URL(req.url).searchParams.get('customerId')?.trim();
  if (!customerId || customerId.length > MAX_CUSTOMER_ID_LENGTH) {
    return NextResponse.json({ error: 'customerId requis' }, { status: 400 });
  }
  try {
    const snap = await getSnapshot(customerId);
    return NextResponse.json({ snapshot: snap });
  } catch (err) {
    cleanError(err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'Corps de requête trop volumineux' }, { status: 413 });
    }
    const body = (JSON.parse(raw || '{}') as Partial<SyncSnapshot>) ?? {};
    const customerId = body.customerId?.trim();
    if (!customerId || customerId.length > MAX_CUSTOMER_ID_LENGTH || typeof body.updatedAt !== 'number' || body.state === undefined) {
      return NextResponse.json({ error: 'customerId, updatedAt et state requis' }, { status: 400 });
    }
    const snap: SyncSnapshot = { customerId, updatedAt: body.updatedAt, state: body.state };
    await putSnapshot(snap);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
    }
    cleanError(err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
