'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useUiStore } from '../../lib/ui-store';
import { cx } from '../../lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
 * Invite d'installation discrète (non bloquante, refermable pour la session) :
 * - Android / Chrome : bouton « Installer » via l'événement beforeinstallprompt ;
 * - iOS / Safari : astuce « Partager puis Sur l'écran d'accueil » (Safari ne déclenche pas beforeinstallprompt).
 * Masquée si l'app est déjà installée (display-mode: standalone).
 */
export function InstallPrompt() {
  const dismissed = useUiStore((s) => s.installDismissed);
  const dismissInstall = useUiStore((s) => s.dismissInstall);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

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

  if (dismissed || mode === null || isStandalone()) return null;

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
        'fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-toast animate-slide-up rounded-card border border-line bg-surface p-3 shadow-hover',
        'md:inset-x-auto md:bottom-8 md:right-8 md:w-80 md:max-w-[calc(100vw-4rem)]',
      )}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primarydark">
          {mode === 'ios' ? <Share size={18} /> : <Download size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Installer Centeryou</p>
          {mode === 'ios' ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Touche <Share size={12} aria-hidden className="inline" /> Partager, puis « Sur l’écran d’accueil ».
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">L’app se lance depuis ton écran d’accueil, même hors-ligne.</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {mode === 'android' && (
              <button
                type="button"
                onClick={install}
                className="min-h-11 rounded-pill bg-primarydark px-4 text-sm font-bold text-surface transition-colors duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Installer
              </button>
            )}
            <button
              type="button"
              onClick={dismissInstall}
              className="min-h-11 rounded-pill px-3 text-sm font-semibold text-muted transition-colors duration-fast hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {mode === 'ios' ? 'Compris' : 'Plus tard'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissInstall}
          aria-label="Fermer l’invite d’installation"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill text-muted transition-colors duration-fast hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
