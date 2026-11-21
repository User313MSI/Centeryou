'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isActive } from './nav-items';
import { cx } from '../../lib/utils';

const TAB_ITEMS = NAV_ITEMS.filter((item) => item.href !== '/reglages');

/**
 * Barre d'onglets en bas (mobile uniquement, `md:hidden`) :
 * Aujourd'hui / Planning / Tâches / Voix — chaque onglet fait au moins 44 px de haut.
 * Le réglage reste accessible via l'icône en haut à droite.
 * La navigation haute du haut de page reste réservée à l'ordinateur (voir TopNav).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-nav border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TAB_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-xs font-semibold transition-colors duration-fast ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  active ? 'border-primary bg-primary/5 text-primarydark' : 'border-transparent text-muted',
                )}
              >
                <Icon size={20} aria-hidden className={active ? 'text-primarydark' : ''} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
