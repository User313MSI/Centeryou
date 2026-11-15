'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { LogoWithName } from '../brand/logo';
import { SyncIndicator } from '../account/sync-indicator';
import { NAV_ITEMS, isActive } from './nav-items';
import { capitalize, formatDayLong, todayISO } from '../../lib/dates';
import { cx } from '../../lib/utils';

const CENTER_ITEMS = NAV_ITEMS.filter((item) => item.href !== '/reglages');
const SETTINGS_ITEM = NAV_ITEMS.find((item) => item.href === '/reglages')!;

/**
 * Barre de navigation horizontale (haut de page), comme un site web :
 * logo à gauche, rubriques au centre, réglages (icône) à droite.
 * Réservée à l'ordinateur (`md:`) : sur mobile, la navigation se fait par la barre
 * d'onglets en bas (BottomNav) — ici il ne reste que logo + réglages.
 * Le padding haut suit la zone sûre (encoche / barre d'état iOS en plein écran).
 */
export function TopNav() {
  const pathname = usePathname();
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(formatDayLong(todayISO()));
  }, []);

  const settingsActive = isActive(pathname, SETTINGS_ITEM.href);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      {/* Ligne principale */}
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link href="/aujourdhui" aria-label="Centeryou — aujourd’hui" className="flex shrink-0 items-center rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <LogoWithName size={30} />
        </Link>

        {/* Rubriques centrales (desktop) */}
        <nav aria-label="Navigation principale" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {CENTER_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors duration-fast ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active ? 'bg-primary/10 text-primarydark' : 'text-muted hover:bg-bg hover:text-ink',
                )}
              >
                <Icon size={17} aria-hidden className={active ? 'text-primary' : ''} />
                {item.label}
                {/* marqueur violet #7C5CFF sous la rubrique active */}
                <span
                  aria-hidden
                  className={cx('absolute inset-x-4 bottom-0.5 h-0.5 rounded-full bg-primary transition-opacity duration-fast', active ? 'opacity-100' : 'opacity-0')}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <SyncIndicator />
          {today && (
            <p className="hidden text-sm font-semibold capitalize text-muted lg:block" aria-live="polite">
              {capitalize(today)}
            </p>
          )}
          <Link
            href={SETTINGS_ITEM.href}
            aria-label="Réglages"
            aria-current={settingsActive ? 'page' : undefined}
            className={cx(
              'flex min-h-11 w-11 items-center justify-center rounded-pill transition-colors duration-fast ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              settingsActive ? 'bg-primary/10 text-primarydark' : 'text-muted hover:bg-bg hover:text-ink',
            )}
          >
            <Settings size={20} aria-hidden className={settingsActive ? 'text-primary' : ''} />
          </Link>
        </div>
      </div>
    </header>
  );
}
