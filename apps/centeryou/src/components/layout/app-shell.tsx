'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useHydrated } from '../../lib/useHydrated';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { initSync } from '../../lib/sync';
import { DAY_END, DAY_START, nowMinutes, timeOf, todayISO } from '../../lib/dates';
import { getStorageReport } from '../../lib/safe-storage';
import { clamp } from '../../lib/utils';
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

function nextSlot(): string {
  const m = nowMinutes();
  const next = Math.min(Math.ceil((m + 1) / 60) * 60, DAY_END * 60 - 60);
  return timeOf(clamp(next, DAY_START * 60, DAY_END * 60 - 60));
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useStore((s) => s.settings.theme);
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

  // thème sombre mémorisé : bascule la classe .dark sur <html> (variables CSS du thème)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'sombre');
  }, [theme]);

  // synchro multi-appareils Premium (Stripe) : pull initial + push différé sur chaque changement
  useEffect(() => {
    if (!hydrated) return;
    initSync();
  }, [hydrated]);

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
      // fenêtre modale ouverte (accueil, événement, aide…) : les raccourcis globaux restent inactifs
      if (document.querySelector('[aria-modal="true"]')) return;
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
      <div className="flex min-h-screen items-center justify-center bg-bg" aria-busy="true">
        <div className="animate-fade-in flex w-full max-w-sm flex-col items-center gap-3 px-6">
          <Logo size={56} />
          <p className="text-sm font-semibold text-muted">Centeryou</p>
          {/* squelette de chargement court (opacité seule), visible uniquement avant l'hydratation */}
          <div className="mt-3 flex w-full flex-col items-center gap-2" aria-hidden>
            <div className="h-4 w-3/4 animate-pulse rounded-pill bg-line" />
            <div className="h-4 w-1/2 animate-pulse rounded-pill bg-line" />
            <div className="h-24 w-full animate-pulse rounded-card bg-line/70" />
          </div>
          <span className="sr-only">Chargement…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {publicRoute ? <PublicNav /> : <TopNav />}
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pb-12">
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
