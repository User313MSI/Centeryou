'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useHydrated } from '../../lib/useHydrated';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { initSync } from '../../lib/sync';
import { nextSlot, todayISO } from '../../lib/dates';
import { getStorageReport } from '../../lib/safe-storage';
import { isPublicRoute } from '../../lib/routes';
import { Logo } from '../brand/logo';
import { SyncProvider } from '../account/sync-provider';
import { ErrorBoundary } from '../error/error-boundary';
import { EventDialog } from '../events/event-dialog';
import { HelpDialog } from '../help-dialog';
import { Toasts } from '../ui/toast';
import { Footer } from './footer';
import { PublicNav } from './public-nav';
import { TopNav } from './top-nav';
import { BottomNav } from './bottom-nav';
import { VoiceFab } from './voice-fab';
import { InstallPrompt } from './install-prompt';
import { PwaRegister } from './pwa-register';
import { TaskActionsMenu } from '../tasks/task-actions-menu';

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useStore((s) => s.settings.theme);
  const animationsSetting = useStore((s) => s.settings.animations);
  const onboarded = useStore((s) => s.settings.onboarded);
  const publicRoute = isPublicRoute(pathname);
  const openEventDialog = useUiStore((s) => s.openEventDialog);
  const setPlanningView = useUiStore((s) => s.setPlanningView);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);
  const toggleListening = useUiStore((s) => s.toggleListening);
  const pushToast = useUiStore((s) => s.pushToast);

  // signale un stockage plein / corrompu (réparé) par un message clair, jamais bloquant
  useEffect(() => {
    if (!hydrated) return;
    const r = getStorageReport();
    if (r.status !== 'ok' && r.message) pushToast({ message: r.message, duration: 9000 });
  }, [hydrated, pushToast]);

  // thème sombre mémorisé + réglage « Animations & célébrations » :
  // bascule .dark / .animations-off sur <html> (variables CSS du thème ; classe qui rend
  // tout statique instantanément quand les animations sont désactivées — même patron
  // que le bloc prefers-reduced-motion global de globals.css)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'sombre');
    document.documentElement.classList.toggle('animations-off', !animationsSetting);
  }, [theme, animationsSetting]);

  // synchro multi-appareils Premium (Stripe) : pull initial + push différé sur chaque changement
  useEffect(() => {
    if (!hydrated) return;
    initSync();
  }, [hydrated]);

  // moteur de rappels (M-04) : notifications locales du navigateur, vérifiées toutes les 30 s.
  // Chargé en import dynamique : AUCUN poids ajouté au premier chargement (le chunk n'est
  // téléchargé qu'après l'hydratation, et uniquement sur les routes de l'app).
  useEffect(() => {
    if (!hydrated || publicRoute) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import('../../lib/rappels-service')
      .then((m) => {
        if (!cancelled) stop = m.startRappelService();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [hydrated, publicRoute]);

  // nouveaux arrivants : parcours d'accueil en 3 étapes avant toute navigation dans l'app
  // (les routes publiques — accueil, démo, presse, inscription — restent accessibles à tous)
  useEffect(() => {
    if (!hydrated || publicRoute) return;
    if (!onboarded && pathname !== '/bienvenue') router.replace('/bienvenue');
    else if (onboarded && pathname === '/bienvenue') router.replace('/aujourdhui');
  }, [hydrated, onboarded, pathname, publicRoute, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isPublicRoute(pathname)) return;
      // une fenêtre modale est ouverte (séquence d'accueil, dialogue…) : les raccourcis globaux restent inertes derrière
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'n') {
        e.preventDefault();
        openEventDialog({ date: todayISO(), start: nextSlot() });
      } else if (k === 't') {
        e.preventDefault();
        if (pathname !== '/aujourdhui') router.push('/aujourdhui');
        window.setTimeout(() => document.getElementById('quick-add-input')?.focus(), 400);
      } else if (k === 'v') {
        e.preventDefault();
        toggleListening();
      } else if (k === '1' || k === '2' || k === '3') {
        e.preventDefault();
        setPlanningView(k === '1' ? 'jour' : k === '2' ? 'semaine' : 'mois');
        router.push('/planning');
      } else if (k === '?') {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openEventDialog, setPlanningView, setHelpOpen, toggleListening, router, pathname]);

  if (!publicRoute && !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        {/* squelette de chargement court (opacité seule, donc aussi sous prefers-reduced-motion) */}
        <div className="animate-fade-in flex w-full max-w-xs flex-col items-center gap-4 px-6">
          <Logo size={56} />
          <div className="h-3.5 w-32 animate-pulse rounded-pill bg-line/80" aria-hidden />
          <div className="h-24 w-full animate-pulse rounded-card bg-line/50" aria-hidden />
          <p className="text-sm font-semibold text-muted">Centeryou</p>
        </div>
      </div>
    );
  }

  // Nuage (M-23) : fond transparent ici — les voiles pastel de body::before (globals.css) restent visibles
  return (
    <div className="min-h-screen">
      {publicRoute ? <PublicNav /> : <TopNav />}
      {/* key = route courante : transition douce entre les vues (fondu + translate sobre) */}
      <main
        key={pathname}
        className="animate-view-in mx-auto w-full max-w-[1100px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-8 md:px-6 md:pb-16"
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
      <Toasts />
      {!publicRoute && (
        <>
          <BottomNav />
          <EventDialog />
          <HelpDialog />
          <TaskActionsMenu />
          <VoiceFab />
          <InstallPrompt />
          <PwaRegister />
        </>
      )}
      <SyncProvider />
    </div>
  );
}
