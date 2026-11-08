'use client';

import { EmptyState } from '../../components/ui/empty-state';

export default function ReglagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-ink">Réglages</h1>
      <EmptyState
        title="Personnalise Centeryou"
        description="Renseigne ton prénom, le début de ta journée et tes préférences son / voix."
      />
    </div>
  );
}
