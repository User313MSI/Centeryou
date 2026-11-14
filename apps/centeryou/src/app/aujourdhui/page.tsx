import type { Metadata } from 'next';
import { AujourdhuiView } from '../../components/today/aujourdhui-view';

export const metadata: Metadata = {
  title: 'Aujourd’hui',
  description:
    'Ta journée en un coup d’œil : programme, tâches, progression et brief du matin. Ajoute en langage naturel, ex. « sport demain 14h ».',
  alternates: { canonical: '/aujourdhui' },
};

export default function AujourdhuiPage() {
  return <AujourdhuiView />;
}
