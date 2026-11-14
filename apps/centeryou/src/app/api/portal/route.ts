import { NextResponse } from 'next/server';
import { createPortalSession, isStripeConfigured } from '../../../lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/portal { customerId }
 * Ouvre le portail client Stripe (gérer l'abonnement, changer d'offre,
 * annuler — l'annulation prend effet à la fin de la période, protection douce).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { customerId?: string };
    const customerId = body.customerId?.trim();
    if (!customerId) {
      return NextResponse.json({ error: 'customerId manquant' }, { status: 400 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY manquante côté serveur' }, { status: 503 });
    }
    const base = process.env.APP_URL ?? new URL(req.url).origin;
    const session = await createPortalSession({
      customerId,
      returnUrl: `${base}/reglages?checkout=return`,
    });
    if (!session.url) {
      return NextResponse.json({ error: 'Portail Stripe indisponible' }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur Stripe' },
      { status: 500 },
    );
  }
}
