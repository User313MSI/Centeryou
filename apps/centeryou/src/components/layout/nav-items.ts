import { CalendarDays, CalendarRange, ListChecks, Mic, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: "Aujourd'hui", icon: CalendarDays },
  { href: '/planning', label: 'Planning', icon: CalendarRange },
  { href: '/taches', label: 'Tâches', icon: ListChecks },
  { href: '/voix', label: 'Voix', icon: Mic },
  { href: '/reglages', label: 'Réglages', icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
