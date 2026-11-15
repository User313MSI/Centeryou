import Link from 'next/link';
import { LEGAL } from '../../lib/legal';

const LINKS = [
  { href: '/cgu', label: 'CGU' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/contact', label: 'Contact' },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted sm:flex-row md:px-6">
        <p>© {LEGAL.copyrightYear} {LEGAL.appName}</p>
        <nav aria-label="Liens légaux" className="flex items-center gap-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors duration-fast ease-out hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-pill"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
