'use client';

import { useMemo, type KeyboardEvent } from 'react';

import { layout } from '../../../design/tokens';

import { DAY_END, formatDayLong, formatDayNumber, formatWeekdayShort, isToday, nowMinutes, pad2, startOfWeekISO, addDaysISO } from '../../lib/dates';

import { calendarOnDate } from '../../lib/events';

import { layoutOverlaps } from '../../lib/overlap';

import type { EventItem, TaskItem } from '../../types';

import { cx } from '../../lib/utils';

import { EventBlock } from './event-block';

export function WeekView({
  cursor,
  events,
  tasks,
  dayStart,
  onSlotClick,
  onEventClick,
  onTaskToggle,
  onDropAt,
  onDayClick,
  readOnly = false,
}: {
  cursor: string;
  events: EventItem[];
  tasks: TaskItem[];
  dayStart: number;
  onSlotClick: (date: string, minutes: number) => void;
  onEventClick: (ev: EventItem) => void;
  onTaskToggle: (task: TaskItem) => void;
  onDropAt: (eventId: string, x: number, y: number) => void;
  onDayClick: (date: string) => void;
  /** démo (lecture seule) : créneaux et jours non cliquables */
  readOnly?: boolean;
}) {
  const pxPerMin = layout.hourHeightWeek / 60;
  const dayStartMin = dayStart * 60;
  const weekStart = startOfWeekISO(cursor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart]);
  // instances mémoïsées par jour (évite un recalcul de calendarOnDate à chaque rendu × 7 jours)
  const instancesByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calendarOnDate>>();
    for (const iso of days) map.set(iso, calendarOnDate(events, tasks, iso));

    return map;
  }, [days, events, tasks]);
  // colonnes de chevauchement par jour (lisibilité des journées denses)
  const slotsByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof layoutOverlaps>>();
    for (const iso of days) map.set(iso, layoutOverlaps(instancesByDay.get(iso) ?? []));

    return map;
  }, [days, instancesByDay]);
  const hours = useMemo(() => {
    const hs: number[] = [];
    for (let h = dayStart; h < DAY_END; h += 1) hs.push(h);

    return hs;
  }, [dayStart]);
  const gridHeight = (DAY_END * 60 - dayStartMin) * pxPerMin;

  const onSlotKey = (e: KeyboardEvent<HTMLDivElement>, iso: string, h: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSlotClick(iso, h * 60);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="flex border-b border-line">
          <div className="w-10 shrink-0" aria-hidden />
          {days.map((iso) => {
            const head = (
              <>
                <span className="text-xs font-semibold uppercase text-muted">{formatWeekdayShort(iso)}</span>
                <span
                  className={cx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    isToday(iso) ? 'bg-primary text-surface' : 'text-ink hover:bg-bg',
                  )}
                >
                  {formatDayNumber(iso)}
                </span>
              </>
            );
            if (readOnly) {
              return (
                <div key={iso} className="flex flex-1 flex-col items-center gap-0.5 py-2" aria-label={formatDayLong(iso)}>
                  {head}
                </div>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onDayClick(iso)}
                aria-label={`Voir la journée du ${formatDayLong(iso)}`}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                {head}
              </button>
            );
          })}
        </div>
        <div className="flex">
          <div className="w-10 shrink-0" aria-hidden>
            {hours.map((h) => (
              <div
                key={h}
                className="pr-1 text-right text-xs leading-none text-muted md:text-[10px]"
                style={{ height: layout.hourHeightWeek }}
              >
                {pad2(h)}h
              </div>
            ))}
          </div>
          {days.map((iso) => {
            const instances = instancesByDay.get(iso) ?? [];
            const slots = slotsByDay.get(iso);
            const showNow = isToday(iso);
            const nowTop = (nowMinutes() - dayStartMin) * pxPerMin;
            return (
              <div key={iso} className="relative min-w-0 flex-1 border-l border-line/70">
                {hours.map((h) => (
                  <div
                    key={h}
                    data-drop
                    data-date={iso}
                    data-minutes={h * 60}
                    onClick={readOnly ? undefined : () => onSlotClick(iso, h * 60)}
                    onKeyDown={readOnly ? undefined : (e) => onSlotKey(e, iso, h)}
                    role={readOnly ? undefined : 'button'}
                    tabIndex={readOnly ? undefined : 0}
                    className={
                      readOnly
                        ? 'border-b border-line/50'
                        : 'cursor-pointer border-b border-line/50 transition-colors duration-fast ease-out hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
                    }
                    style={{ height: layout.hourHeightWeek }}
                    aria-label={
                      readOnly
                        ? `${formatDayLong(iso)} à ${pad2(h)}h00`
                        : `Créer un événement le ${formatDayLong(iso)} à ${pad2(h)}h00`
                    }
                  />
                ))}
                {instances.map((inst) => {
                  const slot = slots?.get(inst.id);
                  return (
                    <EventBlock
                      key={`${inst.kind}-${inst.id}`}
                      instance={inst}
                      pxPerMin={pxPerMin}
                      dayStartMin={dayStartMin}
                      onEventClick={onEventClick}
                      onTaskToggle={onTaskToggle}
                      onDropAt={onDropAt}
                      leftPct={slot?.leftPct ?? 0}
                      widthPct={slot?.widthPct ?? 100}
                      readOnly={readOnly}
                    />
                  );
                })}
                {showNow && nowTop >= 0 && nowTop <= gridHeight && (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }} aria-hidden>
                    <span className="block h-0.5 w-full bg-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
