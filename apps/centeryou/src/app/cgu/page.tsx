import type { Metadata } from 'next';

import Link from 'next/link';

import { LEGAL } from '../../lib/legal';

import { formatPriceMonthly, PLANS } from '../../lib/plans';

import { LegalDoc, LegalList, LegalSection } from '../../components/legal/legal-doc';


export const metadata: Metadata = {
  title: `Conditions générales d'utilisation — ${LEGAL.appName}`,
  description: `Conditions générales d'utilisation de ${LEGAL.appName} (version ${LEGAL.cguVersion}) : service 100 % local par défaut, offre Premium ${formatPriceMonthly(PLANS.premium.priceMonthlyEur)} facultative.`,
};

const linkCls =
  'font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary';

const PREMIUM_PRICE = formatPriceMonthly(PLANS.premium.priceMonthlyEur);

export default function CguPage() {
  return (
    <LegalDoc
      title="Conditions générales d'utilisation"
      meta={`Version ${LEGAL.cguVersion} — mise à jour le ${LEGAL.cguUpdated}`}
    >
      <LegalSection title="1. Éditeur du service">
        <p>
          {LEGAL.appName} est une application web de planning personnel, éditée à titre personnel par un particulier,
          sans société immatriculée. Contact :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className={linkCls}>
            {LEGAL.contactEmail}
          </a>
          . L'application est hébergée par Vercel. Les données personnelles sont décrites dans la{' '}
          <Link href="/confidentialite" className={linkCls}>
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Ce que fait l'application">
        <p>
          {LEGAL.appName} est un planning interactif personnel, 100 % en français : agenda (jour, semaine, mois),
          tâches, saisie rapide, assistant vocal et rappels. Par défaut, l'application fonctionne{' '}
          <strong className="text-ink">100 % localement</strong> : tes données sont enregistrées dans ton navigateur
          (stockage local) et ne quittent pas ton appareil. Tu peux à tout moment télécharger une{' '}
          <strong className="text-ink">sauvegarde complète</strong> (fichier JSON contenant tous tes événements,
          tâches et réglages) depuis Réglages → « Sauvegarder mes données », et la réimporter ailleurs.
        </p>
      </LegalSection>

      <LegalSection title="3. Accès et compte">
        <p>
          Aucun compte n'est nécessaire pour utiliser {LEGAL.appName} : aucune inscription n'est demandée à
          l'ouverture. Un compte en ligne <strong className="text-ink">facultatif</strong> (e-mail + mot de passe,
          géré par Supabase) existe uniquement pour la sauvegarde en ligne de tes données. Tu peux le créer, le
          supprimer et tout effacer à tout moment depuis les Réglages (voir article 7).
        </p>
      </LegalSection>

      <LegalSection title="4. Les offres et leurs prix">
        <LegalList
          items={[
            `Offre Découverte — gratuite pour toujours : agenda et tâches illimités, assistant vocal avec la voix de ton navigateur, rappels locaux, mode sombre, application installable, données 100 % locales. Sans publicité, sans revente de données.`,
            `Offre Premium — ${PREMIUM_PRICE} TTC, facultative et sans engagement : voix premium illimitée (service de synthèse vocale), sauvegarde en ligne avec un compte, et synchronisation multi-appareils.`,
            'Le paiement est traité exclusivement par Stripe, sur sa page sécurisée hébergée : nous ne voyons jamais ta carte bancaire. Le prix est affiché clairement avant tout paiement.',
            'Tu peux annuler à tout moment depuis le portail Stripe (Réglages → Abonnement → « Gérer mon abonnement ») : l’accès Premium reste actif jusqu’à la fin de la période déjà payée, puis revient à l’offre Découverte — sans perdre tes données, qui restent sur ton appareil.',
          ]}
        />
        <p>
          Voir la page{' '}
          <Link href="/offres" className={linkCls}>
            offres
          </Link>{' '}
          pour le détail.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilités">
        <LegalList
          items={[
            'Le service est fourni « tel quel », sans garantie de disponibilité permanente ni d’absence de bug.',
            'Tes données étant stockées localement dans ton navigateur par défaut, pense à télécharger ta sauvegarde JSON de temps en temps (Réglages → « Sauvegarder mes données ») : c’est ton filet de sécurité.',
            'Centeryou ne saurait être tenu responsable d’une perte de données causée par un effacement du navigateur, un changement d’appareil sans sauvegarde, ou une suppression de compte.',
            'Tu t’engages à utiliser le service dans le respect de la loi et des droits des tiers.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          Le code, le nom et l'identité visuelle de {LEGAL.appName} sont la propriété de l'éditeur. Tes données
          (événements, tâches, prénom, réglages) <strong className="text-ink">t'appartiennent</strong> : elles restent
          sur ton appareil, tu peux les exporter à tout moment et les supprimer quand tu veux.
        </p>
      </LegalSection>

      <LegalSection title="7. Résiliation et suppression des données (définitive)">
        <p>
          Il n'y a aucun engagement : tu peux arrêter quand tu veux. Depuis{' '}
          <Link href="/reglages" className={linkCls}>
            Réglages
          </Link>
          , en moins de 30 secondes :
        </p>
        <LegalList
          items={[
            '« Effacer toutes mes données » (carte « Données locales ») : efface immédiatement tout ce qui est stocké sur cet appareil (prénom, événements, tâches, réglages, rappels).',
            '« Supprimer mon compte et mes données » : efface en plus le compte côté serveur, s’il existe (sauvegarde en ligne comprise). La suppression est définitive et irréversible, côté navigateur comme côté serveur.',
            'Annuler l’offre Premium : via le portail Stripe, à tout moment, sans frais cachés (voir article 4).',
          ]}
        />
        <p>
          Le détail de ce qui est effacé, où et combien de temps, est dans la{' '}
          <Link href="/confidentialite" className={linkCls}>
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Modification des conditions">
        <p>
          Les présentes conditions peuvent évoluer. La version en vigueur est celle affichée sur cette page, avec sa
          date de mise à jour (version {LEGAL.cguVersion}, {LEGAL.cguUpdated}). Continuer à utiliser l'application
          après une mise à jour vaut acceptation des nouvelles conditions.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable et litiges">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, contacte-nous d'abord à{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className={linkCls}>
            {LEGAL.contactEmail}
          </a>{' '}
          pour rechercher une solution amiable ; à défaut, les tribunaux compétents selon les règles de droit commun
          seront saisis. Pour toute question sur tes données personnelles (accès, effacement, portabilité…), consulte
          la{' '}
          <Link href="/confidentialite" className={linkCls}>
            politique de confidentialité
          </Link>{' '}
          et la page{' '}
          <Link href="/legal" className={linkCls}>
            mentions légales
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
