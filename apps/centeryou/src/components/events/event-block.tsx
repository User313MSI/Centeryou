'use client';

import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import type { EventItem } from '../../types';
import type { EventInstance } from '../../lib/events';
import { categoryColor } from '../../lib/categories';
import { formatTimeFr, minutesOf } from '../../lib/dates';
import { cx } from '../../lib/utils';

export function EventBlock({
  instance,
  pxPerMin,
  dayStartMin,
  onEventClick,
  onDropAt,
}: {
  instance: EventInstance;
  pxPerMin: number;
  dayStartMin: number;
  onEventClick: (ev: EventItem) => void;
  onDropAt: (eventId: string, x: number, y: number) => void;
}) {
  const { event } = instance;
  const startMin = minutesOf(instance.start);
  const endMin = minutesOf(instance.end);
  const top = Math.max(0, (startMin - dayStartMin) * pxPerMin);
  const height = Math.max(22, (endMin - startMin) * pxPerMin);

  const drag = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const dragging = offset !== null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { sx: e.clientX, sy: e.clientY, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 8) d.moved = true;
    if (d.moved) setOffset({ x: dx, y: dy });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      setOffset(null);
      onDropAt(event.id, e.clientX, e.clientY);
    } else {
      onEventClick(event);
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEventClick(event);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${event.title}, de ${formatTimeFr(instance.start)} à ${formatTimeFr(instance.end)}. Activer pour modifier, glisser pour déplacer.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      className={cx(
        'absolute left-1 right-1 z-10 cursor-grab select-none overflow-hidden rounded-lg border-l-4 bg-surface p-1.5 shadow-card transition-shadow duration-fast ease-out active:cursor-grabbing',
        dragging && 'z-50 opacity-95 shadow-hover',
      )}
      style={{
        top,
        height,
        borderLeftColor: categoryColor(event.category),
        transform: dragging ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
        touchAction: 'none',
        pointerEvents: dragging ? 'none' : undefined,
      }}
    >
      <p className="truncate text-[13px] font-semibold leading-tight text-ink">{event.title}</p>
      {height >= 36 && (
        <p className="truncate text-xs leading-tight text-muted">
          {formatTimeFr(instance.start)} – {formatTimeFr(instance.end)}
        </p>
      )}
    </div>
  );
}
