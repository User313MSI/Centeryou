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
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // navigation clavier du tablist : flèches ←/→ (circulaire), Home, End — activation au focus
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ids = options.map((o) => o.id);
    const current = ids.indexOf(value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1) % ids.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    if (next < 0 || next === current) return;
    e.preventDefault();
    const id = ids[next];
    onChange(id);
    tabRefs.current[id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx('inline-flex rounded-pill border border-line bg-surface p-1 shadow-card', className)}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              tabRefs.current[opt.id] = el;
            }}
            id={`tab-${opt.id}`}
            role="tab"
            aria-selected={active}
            aria-controls={`tabpanel-${opt.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className={cx(
              'min-h-11 rounded-pill px-4 text-sm font-semibold transition-all duration-fast ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'bg-primarydark bg-cta text-surface shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
