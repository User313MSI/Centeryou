'use client';

import { layout } from '../../../design/tokens';
import { DAY_END, isToday, nowMinutes, pad2 } from '../../lib/dates';
import { eventsOnDate } from '../../lib/events';
import type { EventItem } from '../../types';
import { EventBlock } from './event-block';

export function DayView({
  date,
  events,
  dayStart,
  onSlotClick,
  onEventClick,
  onDropAt,
}: {
  date: string;
  events: EventItem[];
  dayStart: number;
  onSlotClick: (date: string, minutes: number) => void;
  onEventClick: (ev: EventItem) => void;
  onDropAt: (eventId: string, x: number, y: number) => void;
}) {
  const pxPerMin = layout.hourHeightDay / 60;
  const dayStartMin = dayStart * 60;
  const hours: number[] = [];
  for (let h = dayStart; h < DAY_END; h += 1) hours.push(h);
  const instances = eventsOnDate(events, date);
  const showNow = isToday(date);
  const nowTop = (nowMinutes() - dayStartMin) * pxPerMin;
  const gridHeight = (DAY_END * 60 - dayStartMin) * pxPerMin;

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
              onClick={() => onSlotClick(date, h * 60)}
              className="cursor-pointer border-b border-line/60 transition-colors duration-fast ease-out hover:bg-primary/5"
              style={{ height: layout.hourHeightDay }}
              aria-label={`Créer un événement le ${date} à ${pad2(h)}h00`}
            />
          ))}
          {instances.map((inst) => (
            <EventBlock
              key={inst.event.id}
              instance={inst}
              pxPerMin={pxPerMin}
              dayStartMin={dayStartMin}
              onEventClick={onEventClick}
              onDropAt={onDropAt}
            />
          ))}
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
