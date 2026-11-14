import type { Config } from 'tailwindcss';
import { categoryColors, motion, radius, shadows, typography } from './design/tokens';

/**
 * Les couleurs passent par des variables CSS (--c-*) définies dans globals.css
 * (:root = thème clair = design validé, html.dark = mode sombre Premium), ce qui
 * permet le <alpha-value> (ex. bg-surface/90) et le switch de thème sans toucher
 * aux classes existantes.
 */
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const cssVar = (name: string): string => `rgb(var(${name}) / <alpha-value>)`;
const colorVars = (map: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, cssVar(`--c-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`)]));

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './design/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: cssVar('--c-primary'),
        primarydark: cssVar('--c-primary-dark'),
        voice: cssVar('--c-voice'),
        warning: cssVar('--c-warning'),
        danger: cssVar('--c-danger'),
        bg: cssVar('--c-bg'),
        surface: cssVar('--c-surface'),
        ink: cssVar('--c-ink'),
        muted: cssVar('--c-text-secondary'),
        line: cssVar('--c-border'),
        cat: colorVars(categoryColors as unknown as Record<string, string>),
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
