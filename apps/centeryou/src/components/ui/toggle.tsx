'use client';

import { cx } from '../../lib/utils';

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative min-h-11 min-w-11 rounded-pill transition-colors duration-normal ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        checked ? 'bg-primarydark' : 'bg-line',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-surface shadow-card transition-all duration-normal ease-out',
          checked ? 'left-[26px]' : 'left-1',
        )}
      />
    </button>
  );
}
