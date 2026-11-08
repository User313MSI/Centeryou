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
import { resolveDropZone } from '../../components/events/drop';
import {
  DAY_END,
  DAY_START,
  addDaysISO,
  addMonthsISO,
  formatDayLong,
  formatDayShort,
  formatMonthYear,
  formatTimeFr,
  minutesOf,
  startOfWeekISO,
  timeOf,
  todayISO,
} from '../../lib/dates';
import { useStore } from '../../lib/store';
import { clamp } from '../../lib/utils';
import { useUiStore, type PlanningView } from '../../lib/ui-store';
import type { EventItem } from '../../types';

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
  const pushToast = useUiStore((s) => s.pushToast);
  const events = useStore((s) => s.events);
  const moveEvent = useStore((s) => s.moveEvent);
  const dayStart = useStore((s) => s.settings.dayStart);

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

  const onSlotClick = (date: string, minutes: number) => {
    openEventDialog({ date, start: timeOf(minutes) });
  };
  const onEventClick = (ev: EventItem) => {
    openEventDialog({ eventId: ev.id });
  };
  const onDropAt = (eventId: string, x: number, y: number) => {
    const zone = resolveDropZone(x, y);
    if (!zone) return;
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const duration = Math.max(15, minutesOf(ev.end) - minutesOf(ev.start));
    const startMin = clamp(Math.round(zone.minutes / 30) * 30, dayStart * 60, DAY_END * 60 - duration);
    const start = timeOf(startMin);
    if (zone.date === ev.date && start === ev.start) return;
    moveEvent(eventId, zone.date, start);
    pushToast({
      message: `« ${ev.title} » déplacé au ${formatDayShort(zone.date)} à ${formatTimeFr(start)}`,
    });
  };
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
