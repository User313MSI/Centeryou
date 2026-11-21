'use client';

import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { playBlip } from '../../lib/voice';

/**
 * Menu d'actions d'une tâche, ouvert par appui long sur mobile
 * (glisser vers la droite = marquer terminée, voir TaskItemRow).
 */
export function TaskActionsMenu() {
  const taskMenuId = useUiStore((s) => s.taskMenuId);
  const closeTaskMenu = useUiStore((s) => s.closeTaskMenu);
  const task = useStore((s) => s.tasks.find((t) => t.id === taskMenuId));
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const addTask = useStore((s) => s.addTask);
  const sounds = useStore((s) => s.settings.sounds);
  const pushToast = useUiStore((s) => s.pushToast);
  const requestExit = useUiStore((s) => s.requestExit);
  const cancelExit = useUiStore((s) => s.cancelExit);

  if (!task) return null;

  const onToggle = () => {
    toggleTask(task.id);
    if (sounds) playBlip(task.done ? 520 : 760);
    if (!task.done) pushToast({ message: `Bravo ! « ${task.title} » est cochée.` });
    closeTaskMenu();
  };

  const onDelete = () => {
    // sortie douce avant suppression réelle ; « Annuler » restaure si la suppression a déjà eu lieu
    requestExit(`task:${task.id}`, () => deleteTask(task.id));
    closeTaskMenu();
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
    <Dialog open={taskMenuId !== null} onClose={closeTaskMenu} title={task.title}>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" size="md" onClick={onToggle} className="justify-start">
          {task.done ? <RotateCcw size={18} aria-hidden /> : <Check size={18} aria-hidden />}
          {task.done ? 'Reprendre la tâche' : 'Marquer comme faite'}
        </Button>
        <Button variant="danger" size="md" onClick={onDelete} className="justify-start">
          <Trash2 size={18} aria-hidden /> Supprimer la tâche
        </Button>
      </div>
    </Dialog>
  );
}
