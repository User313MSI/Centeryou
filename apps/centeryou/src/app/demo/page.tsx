import type { Metadata } from 'next';
import { DemoView } from '../../components/demo/demo-view';
import { SLOGAN } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Démo — la semaine de Sofia, graphiste',
  description:
    'Explore une semaine type dans Centeryou, en lecture seule et sans compte : planning, tâches et priorités de Sofia, graphiste indépendante. Données fictives, aucune donnée réelle.',
  alternates: { canonical: '/demo' },
  openGraph: {
    title: `Démo Centeryou — ${SLOGAN}`,
    description:
      'La semaine type de Sofia, graphiste indépendante, dans Centeryou : lecture seule, sans compte, aucune donnée réelle.',
    url: '/demo',
  },
};

export default function DemoPage() {
  return <DemoView />;
}
