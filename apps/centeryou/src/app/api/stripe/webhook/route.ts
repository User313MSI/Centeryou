import { NextResponse } from 'next/server';
import {
  cacheSubscription,
  retrieveSubscription,
  snapshotFromSubscription,
  verifyWebhookSignature,
  type StripeSubscription,
} from '../../../../lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 * Réception des événements Stripe signés (signature HMAC vérifiée avec
 * STRIPE_WEBHOOK_SECRET). Met à jour le cache serveur de statut ; le client
 * resynchronise de toute façon directement depuis Stripe, donc un webhook
 * manqué ou en échec ne casse jamais l'app.
 *
 * - signature invalide → 400 (Stripe réessaiera)
 * - erreur de traitement → 500 (Stripe réessaiera)
 * - tout le reste → 200
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      type: string;
      data?: { object?: Record<string, unknown> };
    };
    const object = event.data?.object ?? {};

    if (event.type === 'checkout.session.completed') {
      const subId = object.subscription;
      const customerId = typeof object.customer === 'string' ? object.customer : null;
      if (typeof subId === 'string') {
        cacheSubscription(snapshotFromSubscription(await retrieveSubscription(subId)));
      } else if (customerId) {
        cacheSubscription({
          status: 'active',
          plan: 'premium',
          customerId,
          subscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          updatedAt: Date.now(),
        });
      }
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = object as unknown as StripeSubscription;
      if (sub && typeof sub.id === 'string') {
        cacheSubscription(snapshotFromSubscription(sub));
      }
    } else if (event.type === 'invoice.payment_failed') {
      const subId = object.subscription;
      if (typeof subId === 'string') {
        const sub = await retrieveSubscription(subId);
        cacheSubscription(snapshotFromSubscription(sub));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // 500 = Stripe réessaie ; le détail de l'erreur reste côté logs serveur uniquement.
    console.error('[api/stripe/webhook]', err);
    return NextResponse.json({ error: 'Erreur de traitement' }, { status: 500 });
  }
}
