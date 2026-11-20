import type { Metadata } from 'next';
import { StatsView } from '../../components/stats/stats-view';

export const metadata: Metadata = {
  title: 'Stats',
  description:
    'Ton temps, en clair : heures planifiées par semaine et par catégorie, habitudes, taux de complétion des tâches et série de jours organisés. Calculé localement, rien n’est envoyé en ligne.',
  alternates: { canonical: '/stats' },
};

export default function StatsPage() {
  return <StatsView />;
}
