import { NextResponse } from 'next/server';
import { createCheckoutSession, isStripeConfigured } from '../../../lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function appUrl(req: Request): string {
  return process.env.APP_URL ?? new URL(req.url).origin;
}

/**
 * POST /api/checkout { deviceId }
 * Crée une session Stripe Checkout (mode subscription, en français) et renvoie
 * l'URL hébergée par Stripe — aucune clé Stripe côté client.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { deviceId?: string };
    const deviceId = body.deviceId?.trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId manquant' }, { status: 400 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Paiement non configuré (STRIPE_SECRET_KEY manquante côté serveur)' },
        { status: 503 },
      );
    }
    const base = appUrl(req);
    const session = await createCheckoutSession({
      deviceId,
      successUrl: `${base}/reglages?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/reglages?checkout=cancel`,
    });
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    // Détail (ex. message d'erreur Stripe) uniquement dans les logs serveur.
    console.error('[api/checkout]', err);
    return NextResponse.json({ error: 'Erreur interne lors de la création du paiement' }, { status: 500 });
  }
}
