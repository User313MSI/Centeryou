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
export async function GET(req: Request) {
  const customerId = new URL(req.url).searchParams.get('customerId')?.trim();
  if (!customerId) return NextResponse.json({ error: 'customerId requis' }, { status: 400 });
  try {
    const snap = await getSnapshot(customerId);
    return NextResponse.json({ snapshot: snap });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<SyncSnapshot>;
    const customerId = body.customerId?.trim();
    if (!customerId || typeof body.updatedAt !== 'number' || body.state === undefined) {
      return NextResponse.json({ error: 'customerId, updatedAt et state requis' }, { status: 400 });
    }
    const snap: SyncSnapshot = { customerId, updatedAt: body.updatedAt, state: body.state };
    await putSnapshot(snap);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 },
    );
  }
}
