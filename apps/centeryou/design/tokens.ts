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
  /** Nuage (M-23) : assombri de #6E7191 (4,54:1) à #5F6284 (5,64:1) — le texte secondaire
   *  reste ≥ 4,5:1 même posé sur les voiles pastel du fond (voir globals.css, bloc M-23) */
  textSecondary: '#5F6284',
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

export const radius = { card: 16, pill: 999, tile: 20 } as const;

export const shadows = {
  rest: '0 6px 24px rgba(26,27,46,.06)',
  hover: '0 8px 30px rgba(124,92,255,.25)',
} as const;

/** ombres du thème sombre (le violet .25 reste pour le hover, le reste passe au noir) */
export const darkShadows = {
  rest: '0 6px 24px rgba(0,0,0,.38)',
  hover: '0 8px 30px rgba(0,0,0,.55)',
} as const;

/**
 * Nuage (M-23) — ligne directrice « douce et aérienne », dérivée des tokens existants :
 * voiles pastel très doux en fond de page (globals.css, `body::before`, opacités
 * faibles sur --c-primary / --c-voice / --c-primarydark), dégradés discrets sur les
 * éléments clés (boutons primaires `.bg-cta`, slogan en dégradé, logo en dégradé
 * violet), cartes plus légères (ombre adoucie ci-dessus + plus d'air en padding),
 * motif d'ondes toujours réservé à la voix. Aucun token de la palette figée
 * (#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E) n'est changé.
 */

/** animations sobres 200–300 ms ease-out */
export const motion = { fast: 200, normal: 300, easing: 'ease-out' } as const;

/** hauteurs de grille des vues jour/semaine (px) — la largeur max du contenu est en dur dans app-shell */
export const layout = {
  hourHeightDay: 60,
  hourHeightWeek: 48,
} as const;
