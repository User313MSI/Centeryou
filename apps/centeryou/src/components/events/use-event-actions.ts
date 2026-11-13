'use client';

import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { DAY_END, formatDayShort, formatTimeFr, minutesOf, timeOf } from '../../lib/dates';
import { clamp } from '../../lib/utils';
import type { EventItem } from '../../types';
import { resolveDropZone } from './drop';

/** Actions communes aux vues planning (création, édition, drag & drop). */
export function useEventActions() {
  const events = useStore((s) => s.events);
  const moveEvent = useStore((s) => s.moveEvent);
  const dayStart = useStore((s) => s.settings.dayStart);
  const openEventDialog = useUiStore((s) => s.openEventDialog);
  const pushToast = useUiStore((s) => s.pushToast);

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
    pushToast({ message: `« ${ev.title} » déplacé au ${formatDayShort(zone.date)} à ${formatTimeFr(start)}` });
  };

  return { events, dayStart, onSlotClick, onEventClick, onDropAt };
}
