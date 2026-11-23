'use client';

import { useId } from 'react';

import { cx } from '../../lib/utils';

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  // Nuage (M-23) : id de dégradé unique par instance (useId) — plusieurs logos coexistent
  // sur une page et url(#id) se résout sinon vers la première définition du document
  const gradId = `centeryou-logo-grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className={cx('shrink-0', className)}>
      <defs>
        {/* Nuage (M-23) : rond en dégradé violet doux, dérivé des tokens (primary → primarydark) */}
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--c-primary))' }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--c-primarydark))' }} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${gradId})`} />
      <path
        d="M10.5 20c2.2-4.4 4.4-4.4 6.6 0s4.4 4.4 6.6 0 4.4-4.4 6.3 0"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-voice"
      />
    </svg>
  );
}

export function LogoWithName({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <span className="text-lg font-extrabold tracking-tight text-ink">Centeryou</span>
    </span>
  );
}
