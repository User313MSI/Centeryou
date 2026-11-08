'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardBody } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Tabs, type TabOption } from '../../components/ui/tabs';
import { DayView } from '../../components/events/day-view';
import { MonthView } from '../../components/events/month-view';
import { WeekView } from '../../components/events/week-view';
import { useEventActions } from '../../components/events/use-event-actions';
import { DAY_END, DAY_START, addDaysISO, addMonthsISO, formatDayLong, formatMonthYear, startOfWeekISO, timeOf, todayISO } from '../../lib/dates';
import { clamp } from '../../lib/utils';
import { useUiStore, type PlanningView } from '../../lib/ui-store';

const VIEW_OPTIONS: TabOption[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

function nextSlot(): string {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  return timeOf(clamp(Math.ceil((m + 1) / 60) * 60, DAY_START * 60, DAY_END * 60 - 60));
}

export default function PlanningPage() {
  const [cursor, setCursor] = useState(todayISO());
  const view = useUiStore((s) => s.planningView);
  const setView = useUiStore((s) => s.setPlanningView);
  const openEventDialog = useUiStore((s) => s.openEventDialog);
  const { events, dayStart, onSlotClick, onEventClick, onDropAt } = useEventActions();

  const goPrev = () =>
    setCursor((c) => (view === 'jour' ? addDaysISO(c, -1) : view === 'semaine' ? addDaysISO(c, -7) : addMonthsISO(c, -1)));
  const goNext = () =>
    setCursor((c) => (view === 'jour' ? addDaysISO(c, 1) : view === 'semaine' ? addDaysISO(c, 7) : addMonthsISO(c, 1)));

  const title =
    view === 'jour'
      ? formatDayLong(cursor)
      : view === 'semaine'
        ? `Semaine du ${formatDayLong(startOfWeekISO(cursor))}`
        : formatMonthYear(cursor);

  const onDayClick = (iso: string) => {
    setCursor(iso);
    setView('jour');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold capitalize text-ink">{title}</h1>
        <Button onClick={() => openEventDialog({ date: cursor, start: nextSlot() })}>
          <Plus size={18} aria-hidden /> Nouvel événement
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs options={VIEW_OPTIONS} value={view} onChange={(v) => setView(v as PlanningView)} ariaLabel="Vue du planning" />
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" onClick={goPrev} aria-label="Période précédente">
            <ChevronLeft size={18} aria-hidden />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCursor(todayISO())}>
            Aujourd'hui
          </Button>
          <Button variant="secondary" size="icon" onClick={goNext} aria-label="Période suivante">
            <ChevronRight size={18} aria-hidden />
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Aucun événement pour l'instant"
          description="Clique sur un créneau horaire, ou appuie sur « Nouvel événement », pour planifier ta première activité."
          action={{ label: 'Créer un événement', onClick: () => openEventDialog({ date: cursor, start: nextSlot() }) }}
        />
      ) : (
        <Card>
          <CardBody className="p-2 md:p-4">
            {view === 'jour' && (
              <DayView date={cursor} events={events} dayStart={dayStart} onSlotClick={onSlotClick} onEventClick={onEventClick} onDropAt={onDropAt} />
            )}
            {view === 'semaine' && (
              <WeekView cursor={cursor} events={events} dayStart={dayStart} onSlotClick={onSlotClick} onEventClick={onEventClick} onDropAt={onDropAt} onDayClick={onDayClick} />
            )}
            {view === 'mois' && <MonthView cursor={cursor} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
