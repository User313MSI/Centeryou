'use client';

import { RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Logo } from '../brand/logo';

export interface ErrorScreenProps {
  title?: string;
  message?: string;
  onReload: () => void;
  onRetry?: () => void;
}

/**
 * Écran d'erreur apaisé, 100 % français : affiché si une vue plante,
 * pour ne jamais laisser une page blanche.
 */
export function ErrorScreen({
  title = 'Oups… une petite panne',
  message = 'Rien de grave : tes données restent en sécurité dans ce navigateur. Recharge la page pour repartir.',
  onReload,
  onRetry,
}: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4" role="alert">
      <div className="animate-fade-in flex w-full max-w-md flex-col items-center gap-4 rounded-tile bg-surface p-8 text-center shadow-hover">
        <Logo size={56} />
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        <p className="text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
          <Button size="lg" onClick={onReload}>
            <RefreshCw size={16} aria-hidden /> Recharger
          </Button>
          {onRetry && (
            <Button variant="secondary" size="lg" onClick={onRetry}>
              <RotateCcw size={16} aria-hidden /> Réessayer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
