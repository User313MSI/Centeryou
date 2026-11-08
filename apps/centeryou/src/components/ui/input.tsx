'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        'w-full min-h-11 rounded-card border border-line bg-surface px-4 text-base text-ink',
        'placeholder:text-muted/70 transition-colors duration-fast ease-out',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink" {...(htmlFor ? { id: `${htmlFor}-label` } : {})}>
        {label}
      </span>
      {children}
    </label>
  );
}
