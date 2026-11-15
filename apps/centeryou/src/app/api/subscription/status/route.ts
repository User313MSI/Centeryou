import { NextResponse } from 'next/server';
import {
  isStripeConfigured,
  listCustomerSubscriptions,
  readCachedSubscription,
  retrieveCheckoutSession,
  retrieveSubscription,
  snapshotFromSubscription,
  type SubscriptionSnapshot,
} from '../../../../lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { customerId?: string; sessionId?: string };
    const customerId = body.customerId?.trim() || null;
    const sessionId = body.sessionId?.trim() || null;
    if (!customerId && !sessionId) {
      return NextResponse.json({ error: 'customerId ou sessionId requis' }, { status: 400 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ snapshot: null, configured: false });
    }
    try {
      const snapshot =
        sessionId && !customerId
          ? await snapshotFromSession(sessionId)
          : customerId
            ? await snapshotFromCustomer(customerId)
            : sessionId
              ? await snapshotFromSession(sessionId)
              : null;
      return NextResponse.json({ snapshot, configured: true });
    } catch {
      const fallback = customerId ? readCachedSubscription(customerId) : null;
      return NextResponse.json({ snapshot: fallback, configured: true, fromCache: true });
    }
  } catch (err) {
    // Détail interne uniquement dans les logs serveur — jamais dans la réponse client.
    console.error('[api/subscription/status]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
