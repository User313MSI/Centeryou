import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '../../lib/legal';
import { LegalDoc, LegalList, LegalSection } from '../../components/legal/legal-doc';

export const metadata: Metadata = {
  title: `Conditions générales d'utilisation — ${LEGAL.appName}`,
  description: `Conditions générales d'utilisation de ${LEGAL.appName} (version ${LEGAL.cguVersion}), planning personnel 100 % local.`,
};

export default function CguPage() {
  return (
    <LegalDoc
      title="Conditions générales d'utilisation"
      meta={`Version ${LEGAL.cguVersion} — mise à jour le ${LEGAL.cguUpdated}`}
    >
      <LegalSection title="1. Éditeur du service">
        <p>
          {LEGAL.appName} est une application web de planning personnel, éditée à titre personnel par un
          particulier, sans société immatriculée. Contact :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {LEGAL.contactEmail}
          </a>
          . L'application est hébergée par Vercel.
        </p>
      </LegalSection>

      <LegalSection title="2. Présentation du service">
        <p>
          {LEGAL.appName} est un planning interactif personnel, 100 % en français : agenda (jour, semaine,
          mois), tâches, saisie rapide et assistant vocal. L'application fonctionne « 100 % local » : tes
          données sont enregistrées dans ton navigateur (stockage local) et ne quittent pas ton appareil,
          sauf mention contraire dans la politique de confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="3. Accès et compte">
        <p>
          À ce jour, aucun compte n'est nécessaire pour utiliser {LEGAL.appName} : aucune inscription, aucun
          e-mail ni mot de passe n'est demandé. L'accès se fait simplement en ouvrant l'application.
        </p>
      </LegalSection>

      <LegalSection title="4. Offres">
        <p>
          L'application est gratuite par défaut : agenda, tâches, assistant vocal, mode sombre et application
          installable sont accessibles sans paiement, sans publicité et sans revente de données. Une offre
          Premium optionnelle (voix premium illimitée, synchronisation multi-appareils) est proposée contre
          paiement via Stripe, présentée clairement avant tout paiement, annulable à tout moment.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilités">
        <LegalList
          items={[
            'Le service est fourni « tel quel », sans garantie de disponibilité permanente ni d\'absence de bug.',
            'Tes données étant stockées localement dans ton navigateur, tu restes responsable de leur sauvegarde (par exemple en notant ce qui est important ailleurs).',
            'Centeryou ne saurait être tenu responsable d\'une perte de données causée par un effacement du navigateur, un changement d\'appareil ou une suppression de compte.',
            'Tu t\'engages à utiliser le service dans le respect de la loi et des droits des tiers.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          Le code, le nom et l'identité visuelle de {LEGAL.appName} sont la propriété de l'éditeur. Tes données
          (événements, tâches, prénom) t'appartiennent : elles restent dans ton navigateur et tu peux les
          supprimer à tout moment.
        </p>
      </LegalSection>

      <LegalSection title="7. Résiliation et suppression des données">
        <p>
          Il n'y a rien à résilier : aucun engagement, aucun abonnement. Tu peux supprimer toutes tes données
          à tout moment depuis{' '}
          <Link href="/reglages" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            Réglages → « Supprimer mon compte et mes données »
          </Link>
          . La suppression est immédiate, définitive et irréversible, côté navigateur comme côté serveur.
        </p>
      </LegalSection>

      <LegalSection title="8. Modification des conditions">
        <p>
          Les présentes conditions peuvent évoluer. La version en vigueur est celle affichée sur cette page,
          avec sa date de mise à jour (version {LEGAL.cguVersion}, {LEGAL.cguUpdated}). Continuer à utiliser
          l'application après une mise à jour vaut acceptation des nouvelles conditions.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable et litiges">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, contacte-nous d'abord à{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {LEGAL.contactEmail}
          </a>{' '}
          pour rechercher une solution amiable ; à défaut, les tribunaux compétents selon les règles de droit
          commun seront saisis. Pour toute question sur tes données personnelles, consulte la{' '}
          <Link href="/confidentialite" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
