/**
 * Centeryou — design tokens (source de vérité unique).
 * Aucune valeur de couleur / ombre / rayon ne doit exister hors de ce fichier
 * (les assets générés public/icons + manifest sont produits par scripts/make-icons.mjs
 * à partir de ces tokens).
 */

export const colors = {
  primary: '#7C5CFF',
  primaryDark: '#5B3FE8',
  voice: '#2DD4BF',
  warning: '#FFB020',
  danger: '#FF6B6B',
  bg: '#FAFAFC',
  surface: '#FFFFFF',
  ink: '#1A1B2E',
  textSecondary: '#6E7191',
  border: '#E7E7F0',
} as const;

export type AppColor = keyof typeof colors;

/** Catégories d'événements / tâches */
export const categoryColors = {
  travail: '#7C5CFF',
  perso: '#2DD4BF',
  sante: '#FF6B6B',
  focus: '#FFB020',
  autre: '#6E7191',
} as const;

export type CategoryColor = keyof typeof categoryColors;

export const typography = {
  family: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  weights: { regular: 400, semibold: 600, bold: 700, extrabold: 800 } as const,
  /** échelle 12/14/16/18/24/32/48 px, interligne 1.5 */
  scale: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32, '4xl': 48 } as const,
  lineHeight: 1.5,
} as const;

/** espacement base 4 px : 4/8/16/24/40/64 */
export const spacing = { base: 4, s: 8, m: 16, l: 24, xl: 40, xxl: 64 } as const;

export const radius = { card: 16, pill: 999, tile: 20 } as const;

export const shadows = {
  rest: '0 4px 16px rgba(26,27,46,.08)',
  hover: '0 8px 30px rgba(124,92,255,.25)',
} as const;

/** animations sobres 200–300 ms ease-out */
export const motion = { fast: 200, normal: 300, easing: 'ease-out' } as const;

export const layout = {
  sidebarW: 248,
  topbarH: 64,
  shellMaxW: 1200,
  dayStartDefault: 8,
  dayEnd: 22,
  hourHeightDay: 60,
  hourHeightWeek: 48,
} as const;
