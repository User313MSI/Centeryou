'use client';

import { EmptyState } from '../components/ui/empty-state';

export default function AujourdhuiPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-ink">Aujourd'hui</h1>
      <EmptyState
        title="Rien de prévu pour l'instant"
        description="Crée un événement dans le Planning ou ajoute une tâche rapide pour remplir ta journée."
      />
    </div>
  );
}
