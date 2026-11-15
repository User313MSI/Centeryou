'use client';

import { useRef, type KeyboardEvent } from 'react';
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // navigation clavier WAI-ARIA : flèches gauche/droite (boucle), Home/Fin — activation automatique
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = options.findIndex((o) => o.id === value);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (current + 1) % options.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next === null || current === next) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    onChange(options[next].id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx('inline-flex rounded-pill border border-line bg-surface p-1 shadow-card', className)}
    >
      {options.map((opt, i) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={`tab-${opt.id}`}
            aria-selected={active}
            aria-controls={`tab-panel-${opt.id}`}
            tabIndex={active ? 0 : -1}
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
