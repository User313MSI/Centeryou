import type { Config } from 'tailwindcss';
import { categoryColors, colorVarNames, colors, motion, radius, typography } from './design/tokens';

/** couleur adossée à une variable CSS (thème clair/sombre injecté dans layout.tsx depuis design/tokens.ts) */
const varColor = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './design/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries((Object.keys(colors) as (keyof typeof colors)[]).map((k) => [colorVarNames[k], varColor(colorVarNames[k])])),
        cat: Object.fromEntries(Object.keys(categoryColors).map((k) => [k, varColor(`cat-${k}`)])),
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
        card: 'var(--shadow-rest)',
        hover: 'var(--shadow-hover)',
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
