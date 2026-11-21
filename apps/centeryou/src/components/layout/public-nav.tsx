'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoWithName } from '../brand/logo';
import { useHydrated } from '../../lib/useHydrated';
import { useStore } from '../../lib/store';
import { cx } from '../../lib/utils';

const LINKS = [
  { href: '/demo', label: 'Démo' },
  { href: '/offres', label: 'Offres' },
  { href: '/presse', label: 'Presse' },
];

function active(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const prenom = useStore((s) => s.settings.prenom);
  const onboarded = useStore((s) => s.settings.onboarded);
  const hasEvents = useStore((s) => s.events.length > 0);
  const hasTasks = useStore((s) => s.tasks.length > 0);
  const connected = hydrated && (prenom.trim() !== '' || Boolean(onboarded) || hasEvents || hasTasks);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link
          href="/"
          aria-label="Centeryou — accueil"
          className="flex shrink-0 items-center rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LogoWithName size={30} />
        </Link>

        <nav aria-label="Navigation publique" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(pathname, item.href) ? 'page' : undefined}
              className={cx(
                'flex min-h-11 items-center rounded-pill px-4 text-sm font-semibold transition-colors duration-fast ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active(pathname, item.href) ? 'bg-primary/10 text-primarydark' : 'text-muted hover:bg-bg hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {connected ? (
            <Link
              href="/aujourdhui"
              className="inline-flex min-h-11 items-center rounded-pill bg-primarydark px-5 text-sm font-semibold text-surface shadow-card transition-all duration-normal ease-out hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]"
            >
              Mon planning
            </Link>
          ) : (
            <Link
              href="/inscription"
              className="inline-flex min-h-11 items-center rounded-pill bg-primarydark px-5 text-sm font-semibold text-surface shadow-card transition-all duration-normal ease-out hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]"
            >
              Créer mon compte
            </Link>
          )}
        </div>
      </div>

      <nav aria-label="Navigation publique mobile" className="border-t border-line/60 md:hidden">
        <ul className="grid grid-cols-3">
          {LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(pathname, item.href) ? 'page' : undefined}
                className={cx(
                  'flex min-h-11 items-center justify-center border-t-2 text-xs font-semibold transition-colors duration-fast ease-out',
                  active(pathname, item.href) ? 'border-primary bg-primary/5 text-primarydark' : 'border-transparent text-muted',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
