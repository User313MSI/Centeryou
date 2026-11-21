import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { Button } from './button';
import { cx } from '../../lib/utils';

/**
 * État vide chaleureux : icône lucide dans une tuile douce (les ondes
 * concentriques restent réservées aux éléments vocaux), une action claire
 * et un exemple concret — jamais un simple « rien ».
 */
export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  example,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  /** exemple concret affiché en pastille, ex. « sport demain 14h » */
  example?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface/60 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-tile bg-primary/10 text-primarydark">
        <Icon size={26} aria-hidden />
      </span>
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {example && (
        <code className="rounded-pill border border-line/70 bg-bg px-3.5 py-1.5 text-sm font-semibold text-primarydark">
          « {example} »
        </code>
      )}
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
