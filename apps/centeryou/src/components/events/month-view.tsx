'use client';

import { categoryColor } from '../../lib/categories';
import { WEEKDAY_NAMES, formatDayLong, formatDayNumber, isSameMonth, isToday, monthMatrix } from '../../lib/dates';
import { eventsOnDate } from '../../lib/events';
import type { EventItem } from '../../types';
import { cx } from '../../lib/utils';

export function MonthView({
  cursor,
  events,
  onDayClick,
  onEventClick,
}: {
  cursor: string;
  events: EventItem[];
  onDayClick: (date: string) => void;
  onEventClick: (ev: EventItem) => void;
}) {
  const weeks = monthMatrix(cursor);
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
            const dayEvents = eventsOnDate(events, iso);
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
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-fast hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isToday(iso) ? 'bg-primary text-surface' : outOfMonth ? 'text-muted' : 'text-ink',
                  )}
                >
                  {formatDayNumber(iso)}
                </button>
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((inst) => (
                    <button
                      key={inst.event.id}
                      onClick={() => onEventClick(inst.event)}
                      title={`${inst.event.title} — ${inst.start} à ${inst.end}`}
                      className="flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs font-medium text-ink transition-colors duration-fast hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColor(inst.event.category) }}
                      />
                      <span className="truncate">{inst.event.title}</span>
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
