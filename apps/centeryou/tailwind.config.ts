import type { Config } from 'tailwindcss';
import { categoryColors, colors, motion, radius, shadows, typography } from './design/tokens';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './design/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        primarydark: colors.primaryDark,
        voice: colors.voice,
        warning: colors.warning,
        danger: colors.danger,
        bg: colors.bg,
        surface: colors.surface,
        ink: colors.ink,
        muted: colors.textSecondary,
        line: colors.border,
        cat: { ...categoryColors },
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...typography.family.split(', ').slice(1)],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['24px', { lineHeight: '1.5' }],
        '2xl': ['32px', { lineHeight: '1.5' }],
        '4xl': ['48px', { lineHeight: '1.5' }],
      },
      fontWeight: {
        normal: String(typography.weights.regular),
        semibold: String(typography.weights.semibold),
        bold: String(typography.weights.bold),
        extrabold: String(typography.weights.extrabold),
      },
      borderRadius: {
        card: `${radius.card}px`,
        pill: `${radius.pill}px`,
        tile: `${radius.tile}px`,
      },
      boxShadow: {
        card: shadows.rest,
        hover: shadows.hover,
      },
      transitionDuration: {
        fast: `${motion.fast}ms`,
        normal: `${motion.normal}ms`,
      },
      transitionTimingFunction: {
        out: motion.easing,
      },
      zIndex: {
        fab: '40',
        nav: '40',
        dialog: '50',
        toast: '60',
      },
    },
  },
  plugins: [],
};

export default config;
