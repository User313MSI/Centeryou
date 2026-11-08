"use strict";
/**
 * Centeryou — design tokens (source de vérité unique).
 * Aucune valeur de couleur / ombre / rayon ne doit exister hors de ce fichier
 * (les assets générés public/icons + manifest sont produits par scripts/make-icons.mjs
 * à partir de ces tokens).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.layout = exports.motion = exports.shadows = exports.radius = exports.spacing = exports.typography = exports.categoryColors = exports.colors = void 0;
exports.colors = {
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
};
/** Catégories d'événements / tâches */
exports.categoryColors = {
    travail: '#7C5CFF',
    perso: '#2DD4BF',
    sante: '#FF6B6B',
    focus: '#FFB020',
    autre: '#6E7191',
};
exports.typography = {
    family: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    weights: { regular: 400, semibold: 600, bold: 700, extrabold: 800 },
    /** échelle 12/14/16/18/24/32/48 px, interligne 1.5 */
    scale: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32, '4xl': 48 },
    lineHeight: 1.5,
};
/** espacement base 4 px : 4/8/16/24/40/64 */
exports.spacing = { base: 4, s: 8, m: 16, l: 24, xl: 40, xxl: 64 };
exports.radius = { card: 16, pill: 999, tile: 20 };
exports.shadows = {
    rest: '0 4px 16px rgba(26,27,46,.08)',
    hover: '0 8px 30px rgba(124,92,255,.25)',
};
/** animations sobres 200–300 ms ease-out */
exports.motion = { fast: 200, normal: 300, easing: 'ease-out' };
exports.layout = {
    sidebarW: 248,
    topbarH: 64,
    shellMaxW: 1200,
    dayStartDefault: 8,
    dayEnd: 22,
    hourHeightDay: 60,
    hourHeightWeek: 48,
};
