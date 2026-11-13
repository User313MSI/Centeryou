import { cx } from '../../lib/utils';

export type BadgeTone =
  | 'travail'
  | 'perso'
  | 'sante'
  | 'focus'
  | 'autre'
  | 'basse'
  | 'moyenne'
  | 'haute'
  | 'danger'
  | 'voice'
  | 'neutre';

const toneClasses: Record<BadgeTone, string> = {
  travail: 'bg-cat-travail/15 text-ink',
  perso: 'bg-cat-perso/15 text-ink',
  sante: 'bg-cat-sante/15 text-ink',
  focus: 'bg-cat-focus/15 text-ink',
  autre: 'bg-cat-autre/15 text-ink',
  basse: 'bg-muted/15 text-ink',
  moyenne: 'bg-primary/15 text-ink',
  haute: 'bg-warning/15 text-ink',
  danger: 'bg-danger/15 text-ink',
  voice: 'bg-voice/15 text-ink',
  neutre: 'bg-line/60 text-muted',
};

const dotClasses: Record<BadgeTone, string> = {
  travail: 'bg-cat-travail',
  perso: 'bg-cat-perso',
  sante: 'bg-cat-sante',
  focus: 'bg-cat-focus',
  autre: 'bg-cat-autre',
  basse: 'bg-muted',
  moyenne: 'bg-primary',
  haute: 'bg-warning',
  danger: 'bg-danger',
  voice: 'bg-voice',
  neutre: 'bg-muted',
};

export function Badge({
  tone,
  withDot = false,
  className,
  children,
}: {
  tone: BadgeTone;
  withDot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {withDot && <span aria-hidden className={cx('h-2 w-2 rounded-full', dotClasses[tone])} />}
      {children}
    </span>
  );
}
