'use client';

import { EmptyState } from '../../components/ui/empty-state';

export default function PlanningPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-ink">Planning</h1>
      <EmptyState
        title="Aucun événement"
        description="Clique sur un créneau horaire ou appuie sur « + » pour créer ton premier événement."
      />
    </div>
  );
}
