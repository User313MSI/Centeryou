'use client';

import { EmptyState } from '../../components/ui/empty-state';

export default function TachesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-ink">Tâches</h1>
      <EmptyState
        title="Aucune tâche"
        description="Ajoute une tâche en langage naturel, par exemple « sport demain 14h » ou « !lundi réunion »."
      />
    </div>
  );
}
