import type { Metadata } from 'next';
import { StatsView } from '../../components/stats/stats-view';

export const metadata: Metadata = {
  title: 'Statistiques — Ton temps, en clair',
  description:
    'Ton temps, en clair : temps prévu par semaine et par catégorie, jours les plus chargés, tâches accomplies et jours de suite. Calculé sur ton appareil, rien n’est envoyé en ligne.',
  alternates: { canonical: '/stats' },
};

export default function StatsPage() {
  return <StatsView />;
}
