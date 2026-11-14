'use client';

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

  const onToggle = () => {
    toggleTask(task.id);
    if (sounds) playBlip(task.done ? 520 : 760);
    if (!task.done) pushToast({ message: `Bravo ! « ${task.title} » est cochée ✅` });
  };

  const onDelete = () => {
    deleteTask(task.id);
    pushToast({
      message: `« ${task.title} » supprimée`,
      actionLabel: 'Annuler',
      duration: 5000,
      onAction: () =>
        addTask({ title: task.title, date: task.date, time: task.time, category: task.category, priority: task.priority }),
    });
  };

  // gestes tactiles mobile : glisser vers la droite = terminée, appui long = menu d'actions
  const swipeRef = useSwipeActions<HTMLLIElement>({
    onSwipeRight: () => {
      if (!task.done) onToggle();
    },
    onLongPress: () => openTaskMenu(task.id),
  });

  return (
    <li
      ref={swipeRef}
      className="flex touch-pan-y select-none items-center gap-3 rounded-card border border-line/70 bg-surface p-3 shadow-card transition-shadow duration-fast ease-out hover:shadow-hover"
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
            'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-fast ease-out',
            task.done ? 'border-voice bg-voice' : 'border-line bg-surface hover:border-voice',
          )}
        >
          {task.done && <Check size={16} strokeWidth={3} className="animate-pop text-surface" />}
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
          <span className="inline-flex items-center gap-1 rounded-pill bg-line/60 px-2 py-0.5 text-xs text-muted">
            <CalendarDays size={12} aria-hidden /> {formatDayShort(task.date)}
          </span>
          {task.time && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-line/60 px-2 py-0.5 text-xs text-muted">
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
