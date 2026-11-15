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
  /** teal assombri pour le TEXTE (contraste WCAG) ; `voice` #2DD4BF reste pour les éléments graphiques */
  voiceText: '#0F9B8E',
  warning: '#FFB020',
  danger: '#FF6B6B',
  bg: '#FAFAFC',
  surface: '#FFFFFF',
  ink: '#1A1B2E',
  textSecondary: '#6E7191',
  border: '#E7E7F0',
  /** voile des fenêtres modales (identique à l'encre en clair, quasi noir en sombre) */
  veil: '#1A1B2E',
  /** encre posée sur les aplats vifs (voice, danger) : sombre dans les deux thèmes */
  onbright: '#1A1B2E',
} as const;

export type AppColor = keyof typeof colors;

/**
 * Thème sombre dérivé : fond #14141F, encre #F0F0F5, contrastes préservés.
 * Les couleurs de marque vives (#7C5CFF, #2DD4BF, #FFB020, #FF6B6B) sont
 * conservées ; primaryDark est éclairci pour rester lisible en texte sur fond sombre.
 */
export const darkColors: Record<AppColor, string> = {
  primary: '#7C5CFF',
  primaryDark: '#A794FF',
  voice: '#2DD4BF',
  voiceText: '#0F9B8E',
  warning: '#FFB020',
  danger: '#FF6B6B',
  bg: '#14141F',
  surface: '#1E1F2E',
  ink: '#F0F0F5',
  textSecondary: '#A5A8C6',
  border: '#2D2F47',
  veil: '#07070D',
  onbright: '#0D0D17',
};

/** nom de la variable CSS associée à chaque couleur (classe Tailwind) */
export const colorVarNames: Record<AppColor, string> = {
  primary: 'primary',
  primaryDark: 'primarydark',
  voice: 'voice',
  voiceText: 'voicetext',
  warning: 'warning',
  danger: 'danger',
  bg: 'bg',
  surface: 'surface',
  ink: 'ink',
  textSecondary: 'muted',
  border: 'line',
  veil: 'veil',
  onbright: 'onbright',
};

/** '#7C5CFF' -> '124 92 255' (pour rgb(var(--c-...) / <alpha-value>)) */
export function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** bloc de variables CSS pour un thème (couleurs + ombres) */
export function themeCssVars(c: Record<AppColor, string>, sh: { rest: string; hover: string }): string {
  const colorVars = (Object.keys(c) as AppColor[]).map((k) => `--c-${colorVarNames[k]}: ${hexToRgbTriplet(c[k])};`);
  return [...colorVars, `--shadow-rest: ${sh.rest};`, `--shadow-hover: ${sh.hover};`].join(' ');
}

/**
 * Palette sombre alternative (offre Premium — mode sombre). Mêmes clés que `colors`.
 * Le thème actif est porté par `darkColors` ci-dessus (injecté dans layout.tsx) ;
 * cette palette est conservée comme référence.
 */
export const colorsDark = {
  primary: '#7C5CFF',
  primaryDark: '#9D86FF',
  voice: '#2DD4BF',
  voiceText: '#0F9B8E',
  warning: '#FFB020',
  danger: '#FF6B6B',
  bg: '#0F0F16',
  surface: '#191926',
  ink: '#ECECF4',
  textSecondary: '#9B9DB8',
  border: '#2A2B3D',
} as const;

/** catégories en thème sombre (légèrement éclaircies pour le contraste) */
export const categoryColorsDark = {
  travail: '#9D86FF',
  perso: '#5CE8D8',
  sante: '#FF8585',
  focus: '#FFC24D',
  autre: '#9B9DB8',
} as const;

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

/** ombres du thème sombre (le violet .25 reste pour le hover, le reste passe au noir) */
export const darkShadows = {
  rest: '0 4px 16px rgba(0,0,0,.45)',
  hover: '0 8px 30px rgba(0,0,0,.55)',
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
