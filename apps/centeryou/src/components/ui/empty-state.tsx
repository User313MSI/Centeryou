import type { ReactNode } from 'react';
import { Button } from './button';
import { cx } from '../../lib/utils';

/** Ondes concentriques de marque (réservées aux éléments vocaux selon le design system,
 *  utilisées ici en illustration douce d'état vide) */
export function WavesArt({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className="text-primary"
    >
      <circle cx="60" cy="60" r="14" stroke="currentColor" strokeWidth="3" className="text-voice" />
      <circle cx="60" cy="60" r="28" stroke="currentColor" strokeWidth="2.5" opacity="0.65" />
      <circle cx="60" cy="60" r="42" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <circle cx="60" cy="60" r="55" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
  art,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  art?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface/60 px-6 py-10 text-center',
        className,
      )}
    >
      {art ?? <WavesArt />}
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
