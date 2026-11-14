'use client';

import { layout } from '../../../design/tokens';
import { DAY_END, formatDayNumber, formatWeekdayShort, isToday, nowMinutes, pad2, startOfWeekISO, addDaysISO } from '../../lib/dates';
import { calendarOnDate } from '../../lib/events';
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
}) {
  const pxPerMin = layout.hourHeightWeek / 60;
  const dayStartMin = dayStart * 60;
  const weekStart = startOfWeekISO(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const hours: number[] = [];
  for (let h = dayStart; h < DAY_END; h += 1) hours.push(h);
  const gridHeight = (DAY_END * 60 - dayStartMin) * pxPerMin;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="flex border-b border-line">
          <div className="w-10 shrink-0" aria-hidden />
          {days.map((iso) => (
            <button
              key={iso}
              onClick={() => onDayClick(iso)}
              aria-label={`Voir la journée du ${iso}`}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="text-xs font-semibold uppercase text-muted">{formatWeekdayShort(iso)}</span>
              <span
                className={cx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  isToday(iso) ? 'bg-primary text-surface' : 'text-ink hover:bg-bg',
                )}
              >
                {formatDayNumber(iso)}
              </span>
            </button>
          ))}
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
            const instances = calendarOnDate(events, tasks, iso);
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
                    onClick={() => onSlotClick(iso, h * 60)}
                    className="cursor-pointer border-b border-line/50 transition-colors duration-fast ease-out hover:bg-primary/5"
                    style={{ height: layout.hourHeightWeek }}
                    aria-label={`Créer un événement le ${iso} à ${pad2(h)}h00`}
                  />
                ))}
                {instances.map((inst) => (
                  <EventBlock
                    key={`${inst.kind}-${inst.id}`}
                    instance={inst}
                    pxPerMin={pxPerMin}
                    dayStartMin={dayStartMin}
                    onEventClick={onEventClick}
                    onTaskToggle={onTaskToggle}
                    onDropAt={onDropAt}
                  />
                ))}
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
