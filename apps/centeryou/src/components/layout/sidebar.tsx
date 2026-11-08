'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoWithName } from '../brand/logo';
import { NAV_ITEMS, isActive } from './nav-items';
import { cx } from '../../lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-nav hidden w-62 flex-col border-r border-line bg-surface md:flex" style={{ width: 248 }}>
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Centeryou — accueil">
          <LogoWithName />
        </Link>
      </div>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-h-11 items-center gap-3 rounded-pill px-4 text-sm font-semibold transition-colors duration-fast ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active ? 'bg-primary/10 text-primarydark' : 'text-muted hover:bg-bg hover:text-ink',
              )}
            >
              <Icon size={19} aria-hidden className={active ? 'text-primary' : ''} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 pb-5 text-xs text-muted">
        Raccourcis : <kbd className="font-semibold">N</kbd> événement · <kbd className="font-semibold">T</kbd> tâche ·{' '}
        <kbd className="font-semibold">V</kbd> voix · <kbd className="font-semibold">?</kbd> aide
      </p>
    </aside>
  );
}
