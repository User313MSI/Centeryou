'use client';

import { useMemo, type KeyboardEvent } from 'react';

import { layout } from '../../../design/tokens';

import { DAY_END, formatDayLong, isToday, nowMinutes, pad2 } from '../../lib/dates';

import { calendarOnDate } from '../../lib/events';

import { layoutOverlaps } from '../../lib/overlap';

import type { EventItem, TaskItem } from '../../types';

import { EventBlock } from './event-block';

export function DayView({
  date,
  events,
  tasks,
  dayStart,
  onSlotClick,
  onEventClick,
  onTaskToggle,
  onDropAt,
  readOnly = false,
}: {
  date: string;
  events: EventItem[];
  tasks: TaskItem[];
  dayStart: number;
  onSlotClick: (date: string, minutes: number) => void;
  onEventClick: (ev: EventItem) => void;
  onTaskToggle: (task: TaskItem) => void;
  onDropAt: (eventId: string, x: number, y: number) => void;
  /** démo (lecture seule) : créneaux non cliquables */
  readOnly?: boolean;
}) {
  const pxPerMin = layout.hourHeightDay / 60;
  const dayStartMin = dayStart * 60;
  const hours: number[] = [];
  for (let h = dayStart; h < DAY_END; h += 1) hours.push(h);
  const instances = useMemo(() => calendarOnDate(events, tasks, date), [events, tasks, date]);
  // colonnes pour les éléments qui se chevauchent (lisibilité des journées denses)
  const slots = useMemo(() => layoutOverlaps(instances), [instances]);
  const showNow = isToday(date);
  const nowTop = (nowMinutes() - dayStartMin) * pxPerMin;
  const gridHeight = (DAY_END * 60 - dayStartMin) * pxPerMin;

  const onSlotKey = (e: KeyboardEvent<HTMLDivElement>, h: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSlotClick(date, h * 60);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[300px]">
        <div className="w-12 shrink-0" aria-hidden>
          <div className="h-9" />
          {hours.map((h) => (
            <div
              key={h}
              className="pr-2 text-right text-xs leading-none text-muted"
              style={{ height: layout.hourHeightDay }}
            >
              {pad2(h)}h
            </div>
          ))}
        </div>
        <div className="relative flex-1 border-l border-line">
          {hours.map((h) => (
            <div
              key={h}
              data-drop
              data-date={date}
              data-minutes={h * 60}
              onClick={readOnly ? undefined : () => onSlotClick(date, h * 60)}
              onKeyDown={readOnly ? undefined : (e) => onSlotKey(e, h)}
              role={readOnly ? undefined : 'button'}
              tabIndex={readOnly ? undefined : 0}
              className={
                readOnly
                  ? 'border-b border-line/60'
                  : 'cursor-pointer border-b border-line/60 transition-colors duration-fast ease-out hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
              }
              style={{ height: layout.hourHeightDay }}
              aria-label={
                readOnly
                  ? `${formatDayLong(date)} à ${pad2(h)}h00`
                  : `Créer un événement le ${formatDayLong(date)} à ${pad2(h)}h00`
              }
            />
          ))}
          {instances.map((inst) => {
            const slot = slots.get(inst.id);
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
            <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }} aria-hidden>
              <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="h-0.5 flex-1 bg-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
