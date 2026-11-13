'use client';

import { useRef, useState, type PointerEvent, type KeyboardEvent, type MouseEvent } from 'react';
import type { EventItem, TaskItem } from '../../types';
import type { CalendarInstance } from '../../lib/events';
import { categoryColor } from '../../lib/categories';
import { formatTimeFr, minutesOf } from '../../lib/dates';
import { cx } from '../../lib/utils';

export function EventBlock({
  instance,
  pxPerMin,
  dayStartMin,
  onEventClick,
  onTaskToggle,
  onDropAt,
}: {
  instance: CalendarInstance;
  pxPerMin: number;
  dayStartMin: number;
  onEventClick: (ev: EventItem) => void;
  onTaskToggle: (task: TaskItem) => void;
  onDropAt: (eventId: string, x: number, y: number) => void;
}) {
  const isTask = instance.kind === 'task';
  const startMin = minutesOf(instance.start);
  const endMin = minutesOf(instance.end);
  const top = Math.max(0, (startMin - dayStartMin) * pxPerMin);
  const height = Math.max(22, (endMin - startMin) * pxPerMin);

  const drag = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const dragging = offset !== null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (isTask) return; // les tâches ne se déplacent pas dans le planning
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
      onDropAt(instance.id, e.clientX, e.clientY);
    } else if (instance.event) {
      onEventClick(instance.event);
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (instance.event) onEventClick(instance.event);
      else if (instance.task) onTaskToggle(instance.task);
    }
  };
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    // clic simple sur une tâche = cocher / décocher
    if (isTask && instance.task) {
      e.stopPropagation();
      onTaskToggle(instance.task);
    }
  };

  const label = isTask
    ? `Tâche ${instance.title}, ${formatTimeFr(instance.start)} à ${formatTimeFr(instance.end)}${instance.done ? ', faite' : ''}. Cliquer pour ${instance.done ? 'reprendre' : 'cocher'}.`
    : `${instance.title}, de ${formatTimeFr(instance.start)} à ${formatTimeFr(instance.end)}. Activer pour modifier, glisser pour déplacer.`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={isTask ? instance.done : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className={cx(
        'absolute left-1 right-1 z-10 select-none overflow-hidden rounded-lg border-l-4 bg-surface p-1.5 shadow-card transition-shadow duration-fast ease-out',
        isTask ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        dragging && 'z-50 opacity-95 shadow-hover',
        instance.done && 'opacity-70',
      )}
      style={{
        top,
        height,
        borderLeftColor: categoryColor(instance.category),
        transform: dragging ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
        touchAction: isTask ? undefined : 'none',
        pointerEvents: dragging ? 'none' : undefined,
      }}
    >
      <p className={cx('flex items-center gap-1 truncate text-[13px] font-semibold leading-tight text-ink', instance.done && 'line-through')}>
        {isTask && (
          <span
            aria-hidden
            className={cx(
              'inline-block h-3 w-3 shrink-0 rounded-full border-2',
              instance.done ? 'border-voice bg-voice' : 'border-muted bg-surface',
            )}
          />
        )}
        <span className="truncate">{instance.title}</span>
      </p>
      {height >= 36 && (
        <p className="truncate text-xs leading-tight text-muted">
          {formatTimeFr(instance.start)} – {formatTimeFr(instance.end)}
        </p>
      )}
    </div>
  );
}
