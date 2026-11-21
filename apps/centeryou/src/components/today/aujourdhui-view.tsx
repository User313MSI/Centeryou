'use client';

import { useMemo } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, CalendarHeart, ChartLine, ChartPie, ListChecks } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { DayView } from '../events/day-view';
import { useEventActions } from '../events/use-event-actions';
import { QuickAdd } from '../tasks/quick-add';
import { TaskItemRow } from '../tasks/task-item';
import { BriefCard } from './brief-card';
import { ProgressBar } from './progress-bar';
// film de lancement chargé avec la page Aujourd'hui, en lazy (chunk séparé, zéro régression de First Load JS)
const WelcomeSequence = dynamic(() => import('./welcome-sequence').then((m) => m.WelcomeSequence), { ssr: false });
import { formatDayLong, greetingFor, todayISO } from '../../lib/dates';
import { calendarOnDate } from '../../lib/events';
import { formatHoursFr, statsWeeks } from '../../lib/stats';
import { useStore } from '../../lib/store';

const SUGGESTIONS = ['sport demain 14h', 'médecin mardi 10h30 santé', '!lundi réunion', 'rapport vendredi'];

export function AujourdhuiView() {
  const today = todayISO();
  const settings = useStore((s) => s.settings);
  const { events, tasks, dayStart, onSlotClick, onEventClick, onTaskToggle, onDropAt } = useEventActions();

  const prenom = settings.prenom.trim();
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  // copie avant tri : ne mute jamais le tableau mémoïsé
  const sortedTodayTasks = useMemo(
    () => [...todayTasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99')),
    [todayTasks],
  );
  const doneCount = todayTasks.filter((t) => t.done).length;
  const todayItems = useMemo(() => calendarOnDate(events, tasks, today), [events, tasks, today]);
  // heures planifiées cette semaine (pour la carte d'entrée « Tes stats »)
  const weekMinutes = useMemo(() => {
    const weeks = statsWeeks(events, today);
    return weeks[weeks.length - 1]?.totalMinutes ?? 0;
  }, [events, today]);

  return (
    <div className="flex flex-col gap-5">
      <WelcomeSequence />
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink md:text-4xl">
          {greetingFor()}
          {prenom ? ` ${prenom}` : ''}
        </h1>
        <p className="mt-1 text-sm font-semibold capitalize text-muted">{formatDayLong(today)}</p>
      </header>

      <section aria-label="Commande rapide" className="mx-auto w-full max-w-2xl">
        <QuickAdd large suggestions={SUGGESTIONS} />
      </section>

      <BriefCard />

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <CalendarHeart size={18} aria-hidden className="text-primarydark" /> Programme du jour
          </h2>
        </CardHeader>
        <CardBody>
          {todayItems.length === 0 && (
            <p className="mb-3 text-sm text-muted">
              Journée libre côté agenda — clique sur un créneau ci-dessous pour ajouter un événement.
            </p>
          )}
          <DayView date={today} events={events} tasks={tasks} dayStart={dayStart} onSlotClick={onSlotClick} onEventClick={onEventClick} onTaskToggle={onTaskToggle} onDropAt={onDropAt} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ChartLine size={18} aria-hidden className="text-primarydark" /> Ma progression
          </h2>
        </CardHeader>
        <CardBody>
          <ProgressBar done={doneCount} total={todayTasks.length} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Link
            href="/stats"
            aria-label="Voir mes statistiques — ton temps, en clair"
            className="group flex min-h-11 items-center justify-between gap-3 rounded-card px-2 transition-colors duration-fast ease-out hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex items-center gap-2.5">
              <ChartPie size={18} aria-hidden className="text-primarydark" />
              <span>
                <span className="block text-sm font-bold text-ink">Tes statistiques</span>
                <span className="block text-xs text-muted">Ton temps, en clair</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted">
              {weekMinutes > 0 && <span className="font-bold text-primarydark">{formatHoursFr(weekMinutes)} cette semaine</span>}
              <ArrowRight size={16} aria-hidden className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
            </span>
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ListChecks size={18} aria-hidden className="text-primarydark" /> Tâches du jour
          </h2>
          <span className="text-sm font-semibold text-muted">
            {doneCount}/{todayTasks.length}
          </span>
        </CardHeader>
        <CardBody>
          {todayTasks.length === 0 ? (
            <EmptyState
              title="Aucune tâche pour aujourd’hui"
              description="Ajoute une tâche avec la grande barre ci-dessus, par exemple « sport demain 14h » ou « !lundi réunion »."
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {sortedTodayTasks.map((t) => (
                <TaskItemRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
