import type { Metadata } from 'next';

import Link from 'next/link';

import { Card, CardBody, CardHeader } from '../../components/ui/card';

import { LEGAL } from '../../lib/legal';

import { formatPriceMonthly, PLANS } from '../../lib/plans';

export const metadata: Metadata = {
  title: 'Mentions légales & confidentialité',
  description:
    'Mentions légales de Centeryou : données stockées uniquement dans ton navigateur (localStorage), aucun cookie ni traceur, compte et offre Premium facultatifs, droits RGPD expliqués simplement.',
  alternates: { canonical: '/legal' },
};

export default function LegalPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink md:text-4xl">Mentions légales & confidentialité</h1>
        <p className="mt-1 text-sm font-semibold text-muted">
          Dernière mise à jour : {LEGAL.cguUpdated} — version {LEGAL.privacyVersion} de la politique de confidentialité.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Éditeur</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-muted">
          <p>
            <strong className="text-ink">Centeryou</strong> est édité à titre personnel, sans société immatriculée.
            Contact : <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primarydark underline-offset-2 hover:underline">{LEGAL.contactEmail}</a>.
          </p>
          <p>
            Dépôt GitHub :{' '}
            <a
              href="https://github.com/User313MSI/Centeryou"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primarydark underline-offset-2 hover:underline"
            >
              User313MSI/Centeryou
            </a>
            — le code est public, la liste des destinataires de données y est vérifiable.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Hébergement</h2>
        </CardHeader>
        <CardBody className="text-sm text-muted">
          L’application est servie par Vercel (HTTPS, en-têtes de sécurité stricts). Comme tout site web, Vercel
          enregistre des journaux techniques (adresse IP, date et heure, page demandée) pour la sécurité du service :
          ils ne contiennent aucune donnée de planning.
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Données personnelles & confidentialité</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-muted">
          <p>
            Centeryou est <strong className="text-ink">100 % local par défaut</strong> : événements, tâches, prénom et
            réglages sont stockés uniquement dans le <code>localStorage</code> de ton navigateur (clé{' '}
            <code>centeryou-v1</code>). Aucune donnée n’est envoyée, collectée, vendue ou partagée sans action de ta
            part.
          </p>
          <p>
            Trois options facultatives peuvent envoyer des données, et uniquement si tu les actives : la{' '}
            <strong className="text-ink">voix premium</strong> (le texte lu à voix haute — par exemple le brief du
            matin — passe par notre serveur puis par le service de synthèse vocale ElevenLabs ; la clé du service
            reste côté serveur), le <strong className="text-ink">compte en ligne</strong> (e-mail, mot de passe et
            prénom chez Supabase, dans l’UE, plus une sauvegarde de tes données), et l’<strong className="text-ink">offre
            Premium ({formatPriceMonthly(PLANS.premium.priceMonthlyEur)})</strong> (paiement via Stripe — ta carte ne
            passe jamais par nous — et synchronisation multi-appareils via notre serveur). Les rappels sont des
            notifications <strong className="text-ink">100 % locales</strong> envoyées par ton navigateur.
          </p>
          <p>
            Aucun cookie, aucun traceur, aucune publicité, aucune mesure d’audience : c’est pourquoi aucun bandeau
            cookies n’apparaît (le stockage local strictement nécessaire n’en requiert pas). Tu peux{' '}
            <strong className="text-ink">récupérer toutes tes données</strong> (Réglages → « Sauvegarder mes données » :
            fichier JSON complet) et <strong className="text-ink">tout effacer définitivement</strong> (Réglages →
            « Supprimer mon compte et mes données » : effacement local immédiat + compte serveur si tu en as un),
            en moins de 30 secondes. Détails et délais :{' '}
            <Link href="/confidentialite" className="font-semibold text-primarydark underline-offset-2 hover:underline">politique de confidentialité</Link>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Conditions d’utilisation</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-muted">
          <p>
            Centeryou est proposé « tel quel », pour un usage personnel, sans garantie de disponibilité. L’offre de
            base est gratuite ; l’offre Premium ({formatPriceMonthly(PLANS.premium.priceMonthlyEur)}, annulable à tout
            moment) ajoute la voix premium illimitée, la sauvegarde en ligne et la synchro multi-appareils. Les données
            étant locales, leur perte (appareil perdu, navigateur vidé) n’engage pas l’éditeur — d’où le bouton de
            sauvegarde. Voir les{' '}
            <Link href="/cgu" className="font-semibold text-primarydark underline-offset-2 hover:underline">CGU</Link>.
          </p>
          <p>
            Voir aussi : <Link href="/offres" className="font-semibold text-primarydark underline-offset-2 hover:underline">offres</Link> ·{' '}
            <Link href="/presse" className="font-semibold text-primarydark underline-offset-2 hover:underline">fiche de presse</Link> ·{' '}
            <Link href="/demo" className="font-semibold text-primarydark underline-offset-2 hover:underline">démo</Link> ·{' '}
            <Link href="/contact" className="font-semibold text-primarydark underline-offset-2 hover:underline">contact</Link>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
