'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Check, CreditCard, Crown } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { BadgeTone } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardBody, CardHeader } from '../ui/card';
import { openCustomerPortal, startCheckout, syncSubscription } from '../../lib/billing';
import { FREE_PREMIUM_VOICE_LIMIT_PER_MONTH, PLANS, formatPriceMonthly } from '../../lib/plans';
import { useStore } from '../../lib/store';
import { pullSync } from '../../lib/sync';
import {
  currentMonth,
  formatPeriodEnd,
  isPremiumActive,
  premiumVoiceRemaining,
  type AppSubscriptionStatus,
} from '../../lib/subscription';
import { useUiStore } from '../../lib/ui-store';

const STATUS_LABEL: Record<AppSubscriptionStatus, string> = {
  active: 'Actif',
  past_due: 'Paiement impayé',
  canceled: 'Annulé',
  none: 'Gratuit',
};

const STATUS_TONE: Record<AppSubscriptionStatus, BadgeTone> = {
  active: 'voice',
  past_due: 'danger',
  canceled: 'haute',
  none: 'neutre',
};

/**
 * Carte « Abonnement » (Réglages) : offre actuelle, statut Stripe synchronisé,
 * date de renouvellement, bouton Passer Premium (Stripe Checkout) ou
 * Gérer l'abonnement (portail client Stripe), et retour de paiement
 * (?checkout=success|cancel|return).
 */
export function SubscriptionCard() {
  const subscription = useStore((s) => s.subscription);
  const voiceQuota = useStore((s) => s.voiceQuota);
  const pushToast = useUiStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);

  const premium = isPremiumActive(subscription);
  const plan = premium ? PLANS.premium : PLANS.decouverte;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id') ?? undefined;
    const cleanUrl = () => window.history.replaceState(null, '', '/reglages');
    if (checkout === 'success' && sessionId) {
      void syncSubscription({ sessionId }).then((snap) => {
        if (snap && isPremiumActive(snap)) {
          pushToast({ message: 'Bienvenue dans Centeryou Premium — ton abonnement est actif.' });
          void pullSync();
        }
        cleanUrl();
      });
    } else if (checkout === 'cancel') {
      pushToast({ message: 'Paiement annulé — aucun prélèvement n’a été effectué.' });
      cleanUrl();
    } else if (checkout === 'return') {
      void syncSubscription().then((snap) => {
        if (snap) pushToast({ message: 'Abonnement mis à jour.' });
        void pullSync();
      });
      cleanUrl();
    } else {
      // rafraîchit le statut à chaque ouverture (ex. fin de période après annulation)
      void syncSubscription().then((snap) => {
        if (snap && isPremiumActive(snap)) void pullSync();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpgrade = async () => {
    setBusy(true);
    await startCheckout();
    setBusy(false);
  };

  const onManage = async () => {
    setBusy(true);
    await openCustomerPortal();
    setBusy(false);
  };

  return (
    <Card id="abonnement">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Crown size={18} aria-hidden className="text-primary" /> Abonnement
        </h2>
        <Badge tone={STATUS_TONE[subscription.status]}>{STATUS_LABEL[subscription.status]}</Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div>
          <p className="text-lg font-extrabold text-ink">
            {plan.name} — {plan.priceMonthlyEur === 0 ? 'Gratuit' : formatPriceMonthly(plan.priceMonthlyEur)}
          </p>
          <p className="mt-0.5 text-sm text-muted">{plan.tagline}</p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-ink">
              <Check size={15} aria-hidden className="shrink-0 text-voice" />
              {f}
            </li>
          ))}
        </ul>

        {premium && subscription.currentPeriodEnd && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <CalendarClock size={15} aria-hidden className="shrink-0" />
            {subscription.cancelAtPeriodEnd || subscription.status === 'canceled'
              ? `Actif jusqu’au ${formatPeriodEnd(subscription.currentPeriodEnd)} — puis retour à Découverte, tes données sont conservées`
              : `Renouvellement le ${formatPeriodEnd(subscription.currentPeriodEnd)}`}
          </p>
        )}

        {subscription.status === 'past_due' && (
          <p className="rounded-card bg-danger/15 px-4 py-3 text-sm text-ink" role="status">
            Paiement impayé : Premium reste actif pour l’instant — mets à jour ton moyen de paiement via « Gérer
            l’abonnement » pour éviter l’interruption.
          </p>
        )}

        {!premium && (
          <p className="text-xs text-muted">
            Voix premium : {premiumVoiceRemaining(voiceQuota, currentMonth())} essai(s) gratuit(s) restant(s) ce
            mois-ci (limite {FREE_PREMIUM_VOICE_LIMIT_PER_MONTH}).
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {premium ? (
            <Button onClick={onManage} disabled={busy}>
              <CreditCard size={16} aria-hidden /> Gérer l’abonnement
            </Button>
          ) : (
            <Button onClick={onUpgrade} disabled={busy}>
              <Crown size={16} aria-hidden /> {PLANS.premium.ctaLabel} —{' '}
              {formatPriceMonthly(PLANS.premium.priceMonthlyEur)}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted">
          Paiement sécurisé par Stripe (Checkout + portail client, en français). Aucune donnée de carte n’est
          jamais stockée par Centeryou. Annulation en un clic dans le portail : l’accès Premium est conservé
          jusqu’à la fin de la période payée.
        </p>
      </CardBody>
    </Card>
  );
}
