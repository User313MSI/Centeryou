'use client';

import { useEffect, useRef, useState } from 'react';

import { Download, Share, X } from 'lucide-react';

import { useUiStore } from '../../lib/ui-store';

import { cx } from '../../lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Nuage (M-23) : clé localStorage — une fois fermée, l'invite ne revient PLUS (ni à la
 *  page suivante, ni à la prochaine visite), et non plus seulement pour la session. */
const DISMISS_KEY = 'centeryou-pwa-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isAppleUA = /iP(hone|ad|od)/.test(ua);
  const isIPadOS = /MacIntel/.test(navigator.platform) && navigator.maxTouchPoints > 0;
  return (isAppleUA || isIPadOS) && !isStandalone();
}

/**
 * Invite d'installation discrète et refermable POUR DE BON :
 * - Android / Chrome : bouton « Installer » via l'événement beforeinstallprompt ;
 * - iOS / Safari : astuce « Partager puis Sur l'écran d'accueil ».
 * Masquée si l'app est déjà installée (display-mode: standalone).
 * Nuage (M-23) : à l'écran étroit, c'est une pilule compacte d'une ligne (titre et
 * description masqués sous md) qui ne masque plus le contenu ; z-nav la place SOUS
 * le film de lancement (z-dialog) ; la croix écrit dans localStorage : l'invite ne
 * réapparaît plus à la page suivante.
 */
export function InstallPrompt() {
  const dismissed = useUiStore((s) => s.installDismissed);
  const dismissInstall = useUiStore((s) => s.dismissInstall);
  const [dismissedForever, setDismissedForever] = useState(false);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') setDismissedForever(true);
    } catch {
      // stockage indisponible : on retombe sur la dismissal de session (zustand)
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (isIOSBrowser()) {
      setMode('ios');
      return;
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setMode('android');
    };
    const onInstalled = () => {
      deferredPrompt.current = null;
      setMode(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || dismissedForever || mode === null || isStandalone()) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // idem : sans stockage, la fermeture de session suffit
    }
    dismissInstall();
  };

  const install = async () => {
    const evt = deferredPrompt.current;
    if (!evt) return;
    deferredPrompt.current = null;
    try {
      await evt.prompt();
      await evt.userChoice;
    } catch {
      // invite refusée ou indisponible : on ferme simplement
    }
    setMode(null);
  };

  return (
    <div
      role="region"
      aria-label="Installer Centeryou"
      className={cx(
        'fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-nav animate-slide-up rounded-pill border border-line bg-surface/95 p-2 pl-3 shadow-hover backdrop-blur sm:inset-x-4 md:inset-x-auto md:bottom-8 md:right-8 md:w-80 md:max-w-[calc(100vw-4rem)] md:rounded-card md:p-3',
      )}
    >
      <div className="flex items-center gap-2.5 md:items-start md:gap-3">
        <span
          aria-hidden
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primarydark sm:flex md:h-10 md:w-10"
        >
          {mode === 'ios' ? <Share size={18} /> : <Download size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="hidden truncate text-sm font-bold text-ink sm:block">Installer Centeryou</p>
          {mode === 'ios' ? (
            <p className="mt-0.5 hidden text-xs leading-relaxed text-muted md:block">
              Touche <Share size={12} aria-hidden className="inline" /> Partager, puis « Sur l’écran d’accueil ».
            </p>
          ) : (
            <p className="mt-0.5 hidden text-xs leading-relaxed text-muted md:block">
              L’app se lance depuis ton écran d’accueil, même hors-ligne.
            </p>
          )}
          <div className="mt-0 flex items-center gap-1.5 sm:mt-1 sm:gap-2 md:mt-2">
            {mode === 'android' && (
              <button
                type="button"
                onClick={install}
                className="min-h-11 shrink-0 whitespace-nowrap rounded-pill bg-primarydark bg-cta px-3.5 text-sm font-bold text-surface transition-colors duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-4"
              >
                Installer
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-pill px-2.5 text-sm font-semibold text-muted transition-colors duration-fast hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3"
            >
              {mode === 'ios' ? 'Compris' : 'Plus tard'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer l’invite d’installation"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill text-muted transition-colors duration-fast hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
