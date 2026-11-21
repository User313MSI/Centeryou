'use client';

import { useEffect, useRef } from 'react';

import { CalendarDays, Check, Clock, Trash2 } from 'lucide-react';

import { Badge } from '../ui/badge';

import { categoryLabel, priorityLabel } from '../../lib/categories';

import { formatDayShort, formatTimeFr } from '../../lib/dates';

import { useStore } from '../../lib/store';

import { useUiStore } from '../../lib/ui-store';

import { useSwipeActions } from '../../lib/use-swipe';

import type { TaskItem } from '../../types';

import { cx } from '../../lib/utils';

import { playBlip } from '../../lib/voice';

const priorityTone = { basse: 'basse', moyenne: 'moyenne', haute: 'haute' } as const;

export function TaskItemRow({ task }: { task: TaskItem }) {
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const addTask = useStore((s) => s.addTask);
  const sounds = useStore((s) => s.settings.sounds);
  const pushToast = useUiStore((s) => s.pushToast);
  const openTaskMenu = useUiStore((s) => s.openTaskMenu);
  const requestExit = useUiStore((s) => s.requestExit);
  const cancelExit = useUiStore((s) => s.cancelExit);

  const onToggle = () => {
    toggleTask(task.id);
    if (sounds) playBlip(task.done ? 520 : 760);

    if (!task.done) pushToast({ message: `Bravo ! « ${task.title} » est cochée.` });
  };

  // gestes tactiles mobile : glisser vers la droite = terminée, appui long = menu d'actions
  const swipeRef = useSwipeActions<HTMLLIElement>({
    onSwipeRight: () => {
      if (!task.done) onToggle();
    },
    onLongPress: () => openTaskMenu(task.id),
  });

  // coche de la tâche (clic, swipe, voix, menu) : micro-confettis au niveau de la ligne + vibration courte
  // (mobile). import dynamique : le chunk des célébrations n'est chargé que si un effet se déclenche.
  const prevDone = useRef(task.done);
  useEffect(() => {
    if (!prevDone.current && task.done) {
      void import('../../lib/celebrate').then((m) => {
        m.spawnConfetti(swipeRef.current);
        m.vibrateShort();
      });
    }
    prevDone.current = task.done;
  }, [task.done, swipeRef]);

  // sortie douce avant suppression réelle (classe animate-exit posée sur la ligne)
  const exiting = useUiStore((s) => s.exitingIds.includes(`task:${task.id}`));

  const onDelete = () => {
    // sortie douce avant suppression réelle ; « Annuler » restaure si elle a déjà eu lieu
    requestExit(`task:${task.id}`, () => deleteTask(task.id));
    pushToast({
      message: `« ${task.title} » supprimée.`,
      actionLabel: 'Annuler',
      duration: 5000,
      onAction: () => {
        if (cancelExit(`task:${task.id}`)) return; // sortie annulée à temps : la tâche est toujours là
        addTask({ title: task.title, date: task.date, time: task.time, category: task.category, priority: task.priority });
      },
    });
  };

  return (
    <li
      ref={swipeRef}
      className={cx(
        'relative flex touch-pan-y select-none items-center gap-3 rounded-card border border-line/70 bg-surface p-3 shadow-card transition-shadow duration-fast ease-out hover:shadow-hover',
        exiting && 'animate-exit',
      )}
      style={{ WebkitTouchCallout: 'none' }}
      aria-label={`${task.done ? 'Tâche faite' : 'Tâche active'} : ${task.title}. Glisser vers la droite pour la terminer, appui long pour le menu.`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={task.done}
        aria-label={task.done ? `Reprendre la tâche « ${task.title} »` : `Marquer « ${task.title} » comme faite`}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          aria-hidden
          className={cx(
            'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-fast ease-out',
            // Sourire (M-10) : coche « faite » — bordure voicetext (3,44:1 ≥ 3:1 sur surface,
            // border-voice n'en faisait que 1,79) et coche onbright sur fond voice (9,10:1 ;
            // text-surface n'y faisait que 1,83:1)
            task.done ? 'border-voicetext bg-voice' : 'border-line bg-surface hover:border-voice',
          )}
        >
          {task.done && <Check size={16} strokeWidth={3} className="animate-pop text-onbright" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-sm font-semibold', task.done ? 'text-muted line-through' : 'text-ink')}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={priorityTone[task.priority]} withDot>
            {priorityLabel(task.priority)}
          </Badge>
          <Badge tone={task.category} withDot>
            {categoryLabel(task.category)}
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-pill bg-line/60 px-2 py-0.5 text-xs text-ink">
            <CalendarDays size={12} aria-hidden /> {formatDayShort(task.date)}
          </span>
          {task.time && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-line/60 px-2 py-0.5 text-xs text-ink">
              <Clock size={12} aria-hidden /> {formatTimeFr(task.time)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Supprimer la tâche « ${task.title} »`}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill text-muted transition-colors duration-fast hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </li>
  );
}
