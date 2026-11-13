'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-primarydark text-surface hover:bg-primary shadow-card hover:shadow-hover',
  secondary: 'bg-surface text-ink border border-line hover:border-primary hover:text-primarydark',
  ghost: 'text-muted hover:text-ink hover:bg-surface',
  danger: 'bg-danger text-ink hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-4 text-sm gap-1.5',
  md: 'min-h-11 px-5 text-sm gap-2',
  lg: 'min-h-12 px-6 text-base gap-2',
  icon: 'min-h-11 w-11 p-0 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center rounded-pill font-semibold transition-all duration-normal ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
