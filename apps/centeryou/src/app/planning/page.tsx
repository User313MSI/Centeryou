'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardBody } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Tabs, type TabOption } from '../../components/ui/tabs';
import { DayView } from '../../components/events/day-view';
import { MonthView } from '../../components/events/month-view';
import { WeekView } from '../../components/events/week-view';
import { useEventActions } from '../../components/events/use-event-actions';
import { addDaysISO, addMonthsISO, capitalize, formatDayLong, formatMonthYear, isSameMonth, monthMatrix, nextSlot, startOfWeekISO, todayISO } from '../../lib/dates';
import { calendarMonthOnDate, calendarOnDate } from '../../lib/events';
import { useUiStore, type PlanningView } from '../../lib/ui-store';
import { useHorizontalSwipe } from '../../lib/use-swipe';

const VIEW_OPTIONS: TabOption[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

export default function PlanningPage() {
  const [cursor, setCursor] = useState(todayISO());
  const view = useUiStore((s) => s.planningView);
  const setView = useUiStore((s) => s.setPlanningView);
  const openEventDialog = useUiStore((s) => s.openEventDialog);
  const { events, tasks, dayStart, onSlotClick, onEventClick, onTaskToggle, onDropAt } = useEventActions();

  const goPrev = () =>
    setCursor((c) => (view === 'jour' ? addDaysISO(c, -1) : view === 'semaine' ? addDaysISO(c, -7) : addMonthsISO(c, -1)));
  const goNext = () =>
    setCursor((c) => (view === 'jour' ? addDaysISO(c, 1) : view === 'semaine' ? addDaysISO(c, 7) : addMonthsISO(c, 1)));

  // geste mobile : glisser horizontalement = jour / semaine / mois précédent(e) ou suivant(e)
  const swipeRef = useHorizontalSwipe<HTMLDivElement>({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // Nuage (M-23) — casse française : seule la 1re lettre en majuscule (capitalize JS),
  // jamais la classe CSS `capitalize` qui donnait « Semaine Du Lundi 16 Novembre »
  const title = capitalize(
    view === 'jour'
      ? formatDayLong(cursor)
      : view === 'semaine'
        ? `Semaine du ${formatDayLong(startOfWeekISO(cursor))}`
        : formatMonthYear(cursor),
  );

  const onDayClick = (iso: string) => {
    setCursor(iso);
    setView('jour');
  };

  // période affichée sans aucun élément (jour / semaine / mois déserte) :
  // on le dit doucement, la grille reste cliquable pour créer le premier élément
  const periodeVide = useMemo(() => {
    const jours =
      view === 'jour'
        ? [cursor]
        : view === 'semaine'
          ? Array.from({ length: 7 }, (_, i) => addDaysISO(startOfWeekISO(cursor), i))
          : monthMatrix(cursor).flat().filter((d) => isSameMonth(d, cursor));
    return jours.every((d) => (view === 'mois' ? calendarMonthOnDate(events, tasks, d) : calendarOnDate(events, tasks, d)).length === 0);
  }, [view, cursor, events, tasks]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 key={title} className="animate-fade-in text-2xl font-extrabold text-ink md:text-4xl">
          {title}
        </h1>
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

      {events.length === 0 && tasks.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Ton planning est encore vide"
          description="C’est ici que toute ta semaine prend forme. Commence par une seule activité — clique sur un créneau horaire ou appuie sur « Nouvel événement »."
          example="sport demain 14h"
          action={{ label: 'Créer un événement', onClick: () => openEventDialog({ date: cursor, start: nextSlot() }) }}
        />
      ) : (
        <Card>
          <CardBody className="p-2 md:p-4">
            {periodeVide && (
              <p role="status" className="mb-3 rounded-card border border-dashed border-line bg-surface/60 px-4 py-3 text-sm text-muted">
                {view === 'jour' && 'Journée libre — clique sur un créneau de la grille pour créer un événement.'}
                {view === 'semaine' && 'Semaine libre — clique sur un créneau pour créer un événement.'}
                {view === 'mois' && 'Rien de prévu ce mois-ci — clique sur un jour pour créer un événement.'}
              </p>
            )}
            <div
              key={`${view}-${cursor}`}
              ref={swipeRef}
              role="tabpanel"
              id={`tabpanel-${view}`}
              aria-labelledby={`tab-${view}`}
              className="animate-view-in touch-pan-y"
            >
              {view === 'jour' && (
                <DayView date={cursor} events={events} tasks={tasks} dayStart={dayStart} onSlotClick={onSlotClick} onEventClick={onEventClick} onTaskToggle={onTaskToggle} onDropAt={onDropAt} />
              )}
              {view === 'semaine' && (
                <WeekView cursor={cursor} events={events} tasks={tasks} dayStart={dayStart} onSlotClick={onSlotClick} onEventClick={onEventClick} onTaskToggle={onTaskToggle} onDropAt={onDropAt} onDayClick={onDayClick} />
              )}
              {view === 'mois' && <MonthView cursor={cursor} events={events} tasks={tasks} onDayClick={onDayClick} onEventClick={onEventClick} onTaskToggle={onTaskToggle} />}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
