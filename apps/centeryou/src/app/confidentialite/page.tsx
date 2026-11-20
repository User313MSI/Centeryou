import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '../../lib/legal';
import { LegalDoc, LegalList, LegalSection } from '../../components/legal/legal-doc';

export const metadata: Metadata = {
  title: `Politique de confidentialité — ${LEGAL.appName}`,
  description: `Politique de confidentialité de ${LEGAL.appName} (RGPD) : données collectées, finalités, durées, sous-traitants et tes droits.`,
};

export default function ConfidentialitePage() {
  return (
    <LegalDoc
      title="Politique de confidentialité"
      meta={`Version ${LEGAL.privacyVersion} — mise à jour le ${LEGAL.privacyUpdated} — conforme au RGPD`}
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est l'éditeur de {LEGAL.appName} (application éditée à titre personnel,
          sans société immatriculée). Contact :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {LEGAL.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées et où elles sont stockées">
        <LegalList
          items={[
            `Ton prénom (réglages) : saisi par toi, stocké uniquement dans ton navigateur (stockage local).`,
            'Tes données de planning (événements, tâches, réglages) : stockées dans ton navigateur (stockage local). Aucune copie n\'est envoyée sur un serveur, sauf si tu crées un compte en ligne facultatif (voir ci-dessous).',
            'Aucun compte n\'est nécessaire pour utiliser l\'application : un compte en ligne facultatif (e-mail + mot de passe, hébergé par Supabase) existe uniquement pour la sauvegarde en ligne et la synchronisation multi-appareils ; s\'il est créé, une copie de tes données de planning est alors enregistrée côté serveur, et supprimable à tout moment.',
            'Voix premium (ElevenLabs) : le texte à prononcer et ton prénom (en-tête « x-centeryou-user », uniquement pour le quota journalier) sont envoyés à notre route serveur /api/voix hébergée par Vercel ; le prénom sert uniquement à un compteur en mémoire, jamais enregistré, et le texte est transmis à l\'API d\'ElevenLabs qui renvoie l\'audio. La clé API reste côté serveur et n\'est jamais exposée au navigateur. Sans voix premium (ou en bascule automatique), la voix est produite par ton navigateur (Web Speech API) et aucune donnée ne sort de ton appareil.',
            'Journaux d\'hébergement : comme tout site web, l\'hébergeur (Vercel) peut enregistrer des journaux techniques (adresse IP, date et heure, pages demandées) pour la sécurité et le fonctionnement du service.',
            `Correspondance : si tu nous écris par e-mail (${LEGAL.contactEmail}), ton adresse e-mail et ton message sont utilisés uniquement pour te répondre.`,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Finalités des traitements">
        <LegalList
          items={[
            'Te fournir le service : affichage de ton planning, de tes tâches et de l\'assistant vocal.',
            'Assurer la sécurité et le bon fonctionnement du service (journaux d\'hébergement).',
            'Répondre à tes demandes (contact, exercice de tes droits).',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Bases légales">
        <LegalList
          items={[
            'Exécution du « contrat » de fourniture du service (CGU) pour les données de l\'application.',
            'Intérêt légitime (sécurité, prévention des abus) pour les journaux d\'hébergement.',
            'Ton consentement ou l\'exécution de ta demande pour la correspondance e-mail.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Durées de conservation">
        <LegalList
          items={[
            'Données de l\'application (prénom, planning) : conservées dans ton navigateur tant que tu ne les supprimes pas (Réglages → « Supprimer mon compte et mes données », ou effacement des données du site dans ton navigateur).',
            'Journaux d\'hébergement (Vercel) : conservés selon la durée propre à la politique de Vercel, limitée à ce qui est nécessaire à la sécurité.',
            'Données de voix (texte prononcé, prénom pour le quota) : le compteur de quota est gardé en mémoire vive sur le serveur et remis à zéro chaque jour, il n\'est jamais enregistré ; le texte prononcé envoyé à ElevenLabs est conservé par ce service selon sa propre politique, uniquement lorsque la voix premium est utilisée.',
            'E-mails de correspondance : conservés le temps du traitement de ta demande, puis supprimés.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Sous-traitants et transferts hors UE">
        <LegalList
          items={[
            'Vercel : hébergement de l\'application et de ses journaux techniques.',
            'ElevenLabs : synthèse vocale premium, appelée uniquement via notre route serveur /api/voix (la clé API n\'est jamais dans le navigateur) ; le texte prononcé lui est transmis lorsqu\'on utilise la voix premium, depuis les États-Unis, dans le cadre de garanties appropriées (clauses contractuelles types de la Commission européenne).',
            'Paiement de l\'offre Premium (facultative) : traité exclusivement par Stripe, qui reçoit ton e-mail de compte et tes données de paiement — jamais ton planning ni tes tâches. Aucun autre sous-traitant n\'a accès à tes données.',
          ]}
        />
        <p>
          La sauvegarde en ligne de compte (Supabase) et le paiement de l'offre Premium (Stripe) sont des
          fonctionnalités facultatives, décrites ci-dessus : elles ne sont utilisées que si tu les actives,
          et cette page est mise à jour avant toute évolution de ces traitements.
        </p>
      </LegalSection>

      <LegalSection title="7. Tes droits (RGPD)">
        <p>Tu disposes des droits suivants sur tes données :</p>
        <LegalList
          items={[
            'Droit d\'accès : consulter tes données. Elles sont dans ton navigateur, accessibles à tout moment dans l\'application.',
            'Droit de rectification : modifier ton prénom et tes événements/tâches directement dans l\'application.',
            'Droit à l\'effacement : supprimer toutes tes données dans Réglages → « Supprimer mon compte et mes données » (suppression locale immédiate, plus effacement côté serveur via notre API).',
            'Droit à la portabilité / export : tes données étant locales, tu peux les consulter et les copier librement ; sur demande par e-mail, nous te fournissons aussi un export lisible.',
            'Droit d\'opposition et de limitation : t\'opposer à un traitement fondé sur l\'intérêt légitime ou demander la limitation, par e-mail.',
          ]}
        />
        <p>
          Pour exercer un droit, écris à{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {LEGAL.contactEmail}
          </a>{' '}
          en indiquant ton prénom et, si tu nous as déjà écrit, l'adresse e-mail utilisée. Nous répondons{' '}
          {LEGAL.responseDelayShort} et {LEGAL.responseDelayLegal}. Tu peux aussi saisir la CNIL (
          <a href="https://www.cnil.fr" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies et stockage local">
        <p>
          L'application n'utilise aucun cookie publicitaire ni traceur tiers. Elle utilise uniquement le
          stockage local de ton navigateur (localStorage), strictement nécessaire au fonctionnement (tes
          événements, tâches et réglages y sont enregistrés).
        </p>
      </LegalSection>

      <LegalSection title="9. Sécurité">
        <p>
          L'application est servie en HTTPS (hébergement Vercel). Tes données restent chiffrées au repos dans
          la mesure offerte par le stockage de ton navigateur/appareil. Aucune donnée n'est vendue ni partagée.
        </p>
      </LegalSection>

      <LegalSection title="10. Mise à jour de cette politique">
        <p>
          Cette politique peut être mise à jour ; la version en vigueur est celle affichée ici (version{' '}
          {LEGAL.privacyVersion}, {LEGAL.privacyUpdated}). En cas de changement important, il sera signalé dans
          l'application. Voir aussi les{' '}
          <Link href="/cgu" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            conditions générales d'utilisation
          </Link>{' '}
          et la page{' '}
          <Link href="/contact" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            contact
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
