'use client';

import { cx } from '../../lib/utils';

export interface TabOption {
  id: string;
  label: string;
}

export function Tabs({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: TabOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx('inline-flex rounded-pill border border-line bg-surface p-1 shadow-card', className)}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cx(
              'min-h-11 rounded-pill px-4 text-sm font-semibold transition-all duration-fast ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'bg-primarydark text-surface shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
