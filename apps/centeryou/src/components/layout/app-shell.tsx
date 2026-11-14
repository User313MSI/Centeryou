'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useHydrated } from '../../lib/useHydrated';
import { useUiStore } from '../../lib/ui-store';
import { DAY_END, DAY_START, nowMinutes, timeOf, todayISO } from '../../lib/dates';
import { clamp } from '../../lib/utils';
import { Logo } from '../brand/logo';
import { EventDialog } from '../events/event-dialog';
import { HelpDialog } from '../help-dialog';
import { Toasts } from '../ui/toast';
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
  const openEventDialog = useUiStore((s) => s.openEventDialog);
  const setPlanningView = useUiStore((s) => s.setPlanningView);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);
  const toggleListening = useUiStore((s) => s.toggleListening);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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
        if (pathname !== '/') router.push('/');
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

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="animate-fade-in flex flex-col items-center gap-3">
          <Logo size={56} />
          <p className="text-sm font-semibold text-muted">Centeryou</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopNav />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pb-12">
        {children}
      </main>
      <BottomNav />
      <Toasts />
      <EventDialog />
      <HelpDialog />
      <TaskActionsMenu />
      <VoiceFab />
      <InstallPrompt />
      <PwaRegister />
    </div>
  );
}
