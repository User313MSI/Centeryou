import { categoryColors, colors } from '../../design/tokens';
import type { Category, Priority } from '../types';

export const CATEGORY_LIST: { id: Category; label: string; color: string }[] = [
  { id: 'travail', label: 'Travail', color: categoryColors.travail },
  { id: 'perso', label: 'Perso', color: categoryColors.perso },
  { id: 'sante', label: 'Santé', color: categoryColors.sante },
  { id: 'focus', label: 'Focus', color: categoryColors.focus },
  { id: 'autre', label: 'Autre', color: categoryColors.autre },
];

export const PRIORITY_LIST: { id: Priority; label: string; color: string }[] = [
  { id: 'basse', label: 'Basse', color: colors.textSecondary },
  { id: 'moyenne', label: 'Moyenne', color: colors.primary },
  { id: 'haute', label: 'Haute', color: colors.warning },
];

export function categoryLabel(c: Category): string {
  return CATEGORY_LIST.find((x) => x.id === c)?.label ?? 'Autre';
}

export function categoryColor(c: Category): string {
  return categoryColors[c];
}

export function priorityLabel(p: Priority): string {
  return PRIORITY_LIST.find((x) => x.id === p)?.label ?? 'Moyenne';
}

