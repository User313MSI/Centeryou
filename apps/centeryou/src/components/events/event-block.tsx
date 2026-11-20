'use client';

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type MouseEvent } from 'react';
import type { EventItem, TaskItem } from '../../types';
import type { CalendarInstance } from '../../lib/events';
import { categoryColor } from '../../lib/categories';
import { DAY_END, endMinutesOf, formatEndFr, formatTimeFr, minutesOf } from '../../lib/dates';
import { useUiStore } from '../../lib/ui-store';

import { cx } from '../../lib/utils';

export function EventBlock({
  instance,
  pxPerMin,
  dayStartMin,
  onEventClick,
  onTaskToggle,
  onDropAt,
  leftPct = 0,
  widthPct = 100,
  readOnly = false,
}: {
  instance: CalendarInstance;
  pxPerMin: number;
  dayStartMin: number;
  onEventClick: (ev: EventItem) => void;
  onTaskToggle: (task: TaskItem) => void;
  onDropAt: (eventId: string, x: number, y: number) => void;
  /** mise en colonnes des chevauchements (voir lib/overlap.ts) */
  leftPct?: number;
  widthPct?: number;
  /** démo (lecture seule) : aucun comportement interactif, aucun rôle de bouton */
  readOnly?: boolean;
}) {
  const isTask = instance.kind === 'task';
  const startMin = minutesOf(instance.start);
  const endMin = endMinutesOf(instance.end); // fin à 00:00 = minuit (24h00)
  // bornage à la grille affichée [dayStart, DAY_END] : un élément qui déborde est
  // rogné sur le bord de la grille, et un élément entièrement hors grille n'est pas
  // dessiné ici (il reste visible en vue Mois) — jamais de rendu hors de la carte
  const gridHeight = (DAY_END * 60 - dayStartMin) * pxPerMin;
  const visStart = Math.max(startMin, dayStartMin);
  const visEnd = Math.min(endMin, DAY_END * 60);
  const top = (visStart - dayStartMin) * pxPerMin;
  let height = Math.max(22, (visEnd - visStart) * pxPerMin);
  if (top + height > gridHeight) height = gridHeight - top;

  const drag = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const dragging = offset !== null;
  const blockRef = useRef<HTMLDivElement>(null);

  // apparition élastique + halo + onde violette : un événement créé à l'instant (montage initial du bloc)
  const [fresh] = useState(
    () => instance.kind === 'event' && !!instance.event && Date.now() - instance.event.createdAt < 2500,
  );

  // onde violette depuis le point de création (centre du bloc apparu) — no-op si animations désactivées.
  // import dynamique : le chunk des célébrations n'est téléchargé que si un effet se déclenche,
  // la vitrine / n'en paie pas le poids au premier chargement.
  useEffect(() => {
    if (fresh) void import('../../lib/celebrate').then((m) => m.spawnRippleAt(blockRef.current));
    // une seule fois au montage du bloc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // coche d'une tâche dans le planning : micro-confettis au niveau du bloc + vibration courte (mobile)
  const prevDone = useRef(instance.done);
  useEffect(() => {
    if (!prevDone.current && instance.done && instance.kind === 'task') {
      void import('../../lib/celebrate').then((m) => {
        m.spawnConfetti(blockRef.current);
        m.vibrateShort();
      });
    }
    prevDone.current = instance.done;
  }, [instance.done, instance.kind]);

  // sortie douce avant suppression réelle de l'événement
  const exiting = useUiStore((s) => s.exitingIds.includes(`event:${instance.id}`));
  // rebond de confirmation après un dépôt (drag & drop)
  const lastDrop = useUiStore((s) => s.lastDrop);
  const [bouncing, setBouncing] = useState(false);
  const bounceTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!lastDrop || lastDrop.id !== instance.id) return;
    setBouncing(true);
    if (bounceTimer.current) window.clearTimeout(bounceTimer.current);
    bounceTimer.current = window.setTimeout(() => setBouncing(false), 420);
    return () => {
      if (bounceTimer.current) window.clearTimeout(bounceTimer.current);
    };
  }, [lastDrop, instance.id]);

  // mise en vedette après un clic sur une notification de rappel (M-04) : halo pulsant
  // (statique si prefers-reduced-motion / animations désactivées, voir globals.css)
  const highlightEventId = useUiStore((s) => s.highlightEventId);
  const highlightAt = useUiStore((s) => s.highlightAt);
  const highlighted = instance.kind === 'event' && highlightEventId === instance.id && Date.now() - highlightAt < 9000;
  useEffect(() => {
    if (highlighted && blockRef.current) blockRef.current.scrollIntoView({ block: 'center' });
    // une seule fois par mise en vedette
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted]);

  // Retours précoces APRÈS tous les hooks (règles des hooks React, correctif M-08) :
  // un bloc qui passe de visible à masqué (ou l'inverse) ne doit jamais exécuter
  // moins de hooks au rendu suivant — sinon React lève « fewer hooks ».
  if (visEnd <= visStart) return null;
  if (height <= 0) return null;

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
    ? `Tâche ${instance.title}, de ${formatTimeFr(instance.start)} à ${formatEndFr(instance.end)}${instance.done ? ', faite' : ''}${readOnly ? '' : `. Cliquer pour ${instance.done ? 'reprendre' : 'cocher'}.`}`
    : `${instance.title}, de ${formatTimeFr(instance.start)} à ${formatEndFr(instance.end)}${readOnly ? '' : '. Activer pour modifier, glisser pour déplacer.'}`;

  return (
    <>
      {fresh && (
        <div
          aria-hidden
          className="celebrate-halo animate-halo"
          style={{
            top: top - 6,
            height: height + 12,
            left: `calc(${leftPct}% + 4px - 6px)`,
            width: `calc(${widthPct}% - 8px + 12px)`,
          }}
        />
      )}
      <div
        ref={blockRef}
        role={readOnly ? undefined : 'button'}
        tabIndex={readOnly ? undefined : 0}
        aria-label={label}
        aria-pressed={readOnly ? undefined : isTask ? instance.done : undefined}
        onPointerDown={readOnly ? undefined : onPointerDown}
        onPointerMove={readOnly ? undefined : onPointerMove}
        onPointerUp={readOnly ? undefined : onPointerUp}
        onKeyDown={readOnly ? undefined : onKeyDown}
        onClick={readOnly ? undefined : onClick}
        className={cx(
          'absolute z-10 select-none overflow-hidden rounded-card border-l-4 bg-surface p-1.5 shadow-card transition-shadow duration-fast ease-out',
          !readOnly && (isTask ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'),
          dragging && 'z-50 opacity-95 shadow-hover',
          instance.done && 'opacity-70',
          fresh && 'animate-event-celebrate',
          bouncing && 'animate-drop-settle',
          exiting && 'animate-exit',
          highlighted && 'rappel-halo',
        )}
        style={{
          top,
          height,
          left: `calc(${leftPct}% + 4px)`,
          width: `calc(${widthPct}% - 8px)`,
          borderLeftColor: categoryColor(instance.category),
          transform: dragging ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
          touchAction: isTask || readOnly ? undefined : 'none',
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
          {formatTimeFr(instance.start)} – {formatEndFr(instance.end)}
        </p>
      )}
      </div>
    </>
  );
}
