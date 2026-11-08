'use client';

import { EmptyState } from '../../components/ui/empty-state';

export default function VoixPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-ink">Voix</h1>
      <EmptyState
        title="L'assistant vocal t'attend"
        description="Dis « ajoute sport demain 14h », « mon programme » ou « quoi de prévu demain ? » — ou tape ta commande ci-dessous."
      />
    </div>
  );
}
