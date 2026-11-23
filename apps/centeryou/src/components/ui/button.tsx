'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  // Sourire (M-10) : hover:brightness-95 au lieu de hover:bg-primary — le blanc sur
  // #7C5CFF ne fait que 4,35:1 (3,87:1 en sombre) ; assombrir légèrement au survol
  // garde le texte ≥ 6:1. Bouton danger : texte blanc (text-surface) sur corail
  // assombri #C03A3A = 5,37:1 (text-onbright n'y ferait que 3,15:1).
  // Nuage (M-23) : bg-cta = voile blanc 12 % en haut à gauche (dégradé discret),
  // contraste conservé (blanc sur #5B3FE8 + voile ≈ 4,9:1 ; ≥ 6:1 sans le voile)
  primary: 'bg-primarydark bg-cta text-surface hover:brightness-95 shadow-card hover:shadow-hover',
  secondary: 'bg-surface text-ink border border-line hover:border-primary hover:text-primarydark',
  ghost: 'text-muted hover:text-ink hover:bg-surface',
  danger: 'bg-danger text-surface hover:brightness-95',
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
