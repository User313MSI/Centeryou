'use client';

import { useMemo } from 'react';
import { categoryColor } from '../../lib/categories';
import { WEEKDAY_NAMES, formatDayLong, formatDayNumber, formatEndFr, formatTimeFr, isSameMonth, isToday, monthMatrix } from '../../lib/dates';
import { calendarMonthOnDate } from '../../lib/events';
import type { EventItem, TaskItem } from '../../types';
import { cx } from '../../lib/utils';

export function MonthView({
  cursor,
  events,
  tasks,
  onDayClick,
  onEventClick,
  onTaskToggle,
}: {
  cursor: string;
  events: EventItem[];
  tasks: TaskItem[];
  onDayClick: (date: string) => void;
  onEventClick: (ev: EventItem) => void;
  onTaskToggle: (task: TaskItem) => void;
}) {
  const weeks = useMemo(() => monthMatrix(cursor), [cursor]);
  // instances mémoïsées par cellule (évite calendarMonthOnDate × 42 à chaque rendu)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calendarMonthOnDate>>();
    for (const iso of weeks.flat()) map.set(iso, calendarMonthOnDate(events, tasks, iso));
    return map;
  }, [weeks, events, tasks]);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="grid grid-cols-7 border-b border-line bg-bg/60">
          {WEEKDAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-bold uppercase text-muted">
              {d.slice(0, 3)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((iso) => {
            const dayEvents = eventsByDay.get(iso) ?? [];
            const outOfMonth = !isSameMonth(iso, cursor);
            return (
              <div
                key={iso}
                className={cx('min-h-[88px] border-b border-r border-line/60 p-1.5 md:min-h-[104px]', outOfMonth && 'bg-bg/70')}
              >
                <button
                  onClick={() => onDayClick(iso)}
                  aria-label={`Voir le ${formatDayLong(iso)}`}
                  className={cx(
                    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-fast hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-7 md:w-7',
                    isToday(iso) ? 'bg-primary text-surface' : outOfMonth ? 'text-muted' : 'text-ink',
                  )}
                >
                  {formatDayNumber(iso)}
                </button>
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((inst) => (
                    <button
                      key={`${inst.kind}-${inst.id}`}
                      onClick={() => (inst.kind === 'event' && inst.event ? onEventClick(inst.event) : inst.task && onTaskToggle(inst.task))}
                      title={inst.kind === 'event' ? `${inst.title} — de ${formatTimeFr(inst.start)} à ${formatEndFr(inst.end)}` : `Tâche : ${inst.title}${inst.start ? ` à ${formatTimeFr(inst.start)}` : ''}${inst.done ? ' (faite)' : ''}`}
                      className="flex max-w-full items-center gap-1 rounded-card px-1 py-0.5 text-left text-xs font-medium text-ink transition-colors duration-fast hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {inst.kind === 'task' ? (
                        <span
                          aria-hidden
                          className={cx('h-2 w-2 shrink-0 rounded-full border', inst.done ? 'border-voice bg-voice' : 'border-muted bg-surface')}
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: categoryColor(inst.category) }}
                        />
                      )}
                      <span className={cx('truncate', inst.done && 'line-through text-muted')}>{inst.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="px-1 text-xs font-semibold text-muted">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
