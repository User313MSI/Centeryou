'use client';

import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Tabs, type TabOption } from '../../components/ui/tabs';
import { QuickAdd } from '../../components/tasks/quick-add';
import { TaskItemRow } from '../../components/tasks/task-item';
import { useStore } from '../../lib/store';

type Filter = 'toutes' | 'actives' | 'terminees';
const FILTER_OPTIONS: TabOption[] = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'actives', label: 'Actives' },
  { id: 'terminees', label: 'Terminées' },
];

export default function TachesPage() {
  const [filter, setFilter] = useState<Filter>('toutes');
  const tasks = useStore((s) => s.tasks);

  const visible = useMemo(() => {
    const filtered =
      filter === 'actives' ? tasks.filter((t) => !t.done) : filter === 'terminees' ? tasks.filter((t) => t.done) : tasks;
    return [...filtered].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.createdAt - b.createdAt,
    );
  }, [tasks, filter]);

  const activeCount = tasks.filter((t) => !t.done).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Tâches</h1>
        <p className="text-sm font-semibold text-muted">
          {activeCount} active{activeCount > 1 ? 's' : ''} sur {tasks.length}
        </p>
      </div>

      <Card>
        <CardBody className="pt-4">
          <QuickAdd />
          <p className="mt-2 text-xs text-muted">
            Astuce : « sport demain 14h » · « dentist mardi 10h30 santé » · « rapport vendredi » · « !lundi réunion »
          </p>
        </CardBody>
      </Card>

      <Tabs options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(v as Filter)} ariaLabel="Filtrer les tâches" />

      {visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'terminees'
              ? 'Aucune tâche terminée'
              : filter === 'actives'
                ? 'Aucune tâche active — bravo !'
                : 'Aucune tâche pour l’instant'
          }
          description={
            filter === 'toutes'
              ? 'Utilise le champ ci-dessus pour ajouter ta première tâche en langage naturel.'
              : 'Change de filtre ou ajoute une nouvelle tâche.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5" aria-label="Liste des tâches">
          {visible.map((t) => (
            <TaskItemRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}
