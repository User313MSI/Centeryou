import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '../../components/ui/card';

export const metadata: Metadata = {
  title: 'Mentions légales & confidentialité',
  description:
    'Mentions légales, politique de confidentialité et conditions d’utilisation de Centeryou : données stockées uniquement dans votre navigateur (localStorage), aucune collecte côté serveur.',
  alternates: { canonical: '/legal' },
};

export default function LegalPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">Mentions légales & confidentialité</h1>
        <p className="mt-1 text-sm font-semibold text-muted">Dernière mise à jour : janvier 2026.</p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Éditeur</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-muted">
          <p>
            <strong className="text-ink">Centeryou</strong> est édité par <strong className="text-ink">NovaLoom Studio</strong>{' '}
            (marque du studio, définie dans <code>brand.config.json</code> à la racine du dépôt).
          </p>
          <p>
            Contact : dépôt GitHub{' '}
            <a
              href="https://github.com/User313MSI/Dev-Apps"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primarydark underline-offset-2 hover:underline"
            >
              User313MSI/Dev-Apps
            </a>
            .
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Hébergement</h2>
        </CardHeader>
        <CardBody className="text-sm text-muted">
          L’application est une application web statique servie par Vercel. Aucune donnée personnelle n’est transmise à
          l’hébergeur : le planning, les tâches et les réglages restent dans le navigateur de l’utilisateur.
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Données personnelles & confidentialité</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-muted">
          <p>
            Centeryou est <strong className="text-ink">local-first</strong> : toutes les données (événements, tâches,
            prénom, réglages) sont stockées uniquement dans le <code>localStorage</code> de votre navigateur (clé{' '}
            <code>centeryou-v1</code>). Aucun compte serveur n’existe, aucune donnée n’est envoyée, collectée, vendue ou
            partagée.
          </p>
          <p>
            Aucun cookie de pistage ni outil de mesure d’audience externe n’est utilisé. Vous pouvez effacer toutes vos
            données à tout moment via <Link href="/reglages" className="font-semibold text-primarydark underline-offset-2 hover:underline">Réglages → « Effacer toutes mes données »</Link>{' '}
            ou en vidant les données du site dans votre navigateur.
          </p>
          <p>
            La reconnaissance vocale et la synthèse vocale utilisent, par défaut, les API du navigateur (Web Speech API) ;
            si une clé ElevenLabs optionnelle est configurée par l’exploitant, le texte dicté peut transiter par ce service
            tiers — sans cela, aucune donnée vocale ne quitte l’appareil.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Conditions d’utilisation</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-muted">
          <p>
            Centeryou est proposé gratuitement, pour un usage personnel, « tel quel » et sans garantie de disponibilité.
            Les données étant stockées localement, leur perte (appareil perdu, navigateur vidé) n’engage pas l’éditeur.
          </p>
          <p>
            Voir aussi : <Link href="/offres" className="font-semibold text-primarydark underline-offset-2 hover:underline">offres</Link> ·{' '}
            <Link href="/presse" className="font-semibold text-primarydark underline-offset-2 hover:underline">fiche de presse</Link> ·{' '}
            <Link href="/demo" className="font-semibold text-primarydark underline-offset-2 hover:underline">démo</Link>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
