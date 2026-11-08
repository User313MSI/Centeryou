'use client';

import { useMemo } from 'react';
import { CalendarHeart, ListChecks } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { DayView } from '../components/events/day-view';
import { useEventActions } from '../components/events/use-event-actions';
import { QuickAdd } from '../components/tasks/quick-add';
import { TaskItemRow } from '../components/tasks/task-item';
import { BriefCard } from '../components/today/brief-card';
import { ProgressBar } from '../components/today/progress-bar';
import { capitalize, formatDayLong, greetingFor, todayISO } from '../lib/dates';
import { eventsOnDate } from '../lib/events';
import { useStore } from '../lib/store';

export default function AujourdhuiPage() {
  const today = todayISO();
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const { events, dayStart, onSlotClick, onEventClick, onDropAt } = useEventActions();

  const prenom = settings.prenom.trim();
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  const doneCount = todayTasks.filter((t) => t.done).length;
  const todayEvents = useMemo(() => eventsOnDate(events, today), [events, today]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink md:text-4xl">
          {greetingFor()}
          {prenom ? ` ${prenom}` : ''}
        </h1>
        <p className="mt-1 text-sm font-semibold capitalize text-muted">{formatDayLong(today)}</p>
      </header>

      <BriefCard />

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ListChecks size={18} aria-hidden className="text-primary" /> Ma progression
          </h2>
        </CardHeader>
        <CardBody>
          <ProgressBar done={doneCount} total={todayTasks.length} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4">
          <QuickAdd />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <CalendarHeart size={18} aria-hidden className="text-primary" /> Programme du jour
          </h2>
        </CardHeader>
        <CardBody>
          {todayEvents.length === 0 ? (
            <EmptyState
              title="Journée libre côté agenda"
              description="Aucun événement aujourd’hui : profite-en, ou clique sur un créneau ci-dessous pour en ajouter un."
            />
          ) : (
            <DayView date={today} events={events} dayStart={dayStart} onSlotClick={onSlotClick} onEventClick={onEventClick} onDropAt={onDropAt} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Tâches du jour</h2>
          <span className="text-sm font-semibold text-muted">
            {doneCount}/{todayTasks.length}
          </span>
        </CardHeader>
        <CardBody>
          {todayTasks.length === 0 ? (
            <EmptyState
              title="Aucune tâche pour aujourd’hui"
              description="Ajoute une tâche avec le champ rapide ci-dessus, par exemple « sport demain 14h » ou « !lundi réunion »."
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {todayTasks
                .sort((a, b) => Number(a.done) - Number(b.done) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
                .map((t) => (
                  <TaskItemRow key={t.id} task={t} />
                ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
