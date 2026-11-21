import type { Metadata } from 'next';

import Link from 'next/link';

import { LEGAL } from '../../lib/legal';

import { LegalDoc, LegalList, LegalSection } from '../../components/legal/legal-doc';


export const metadata: Metadata = {
  title: `Politique de confidentialité — ${LEGAL.appName}`,
  description: `Ce que ${LEGAL.appName} fait de tes données, expliqué simplement : tout reste sur ton appareil par défaut, rien n'est envoyé sans que tu l'actives.`,
};

const linkCls =
  'font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary';

export default function ConfidentialitePage() {
  return (
    <LegalDoc
      title="Politique de confidentialité"
      meta={`Version ${LEGAL.privacyVersion} — mise à jour le ${LEGAL.privacyUpdated} — écrite en français clair, conforme au RGPD`}
    >
      <LegalSection title="En deux mots">
        <p>
          <strong className="text-ink">Par défaut, Centeryou ne sait rien de toi.</strong> Tes rendez-vous, tes
          tâches, ton prénom et tes réglages restent dans ton navigateur, sur ton appareil. Aucun compte n'est
          nécessaire, et <strong className="text-ink">rien n'est envoyé sur Internet sans que tu actives une
          option</strong> (voix premium, compte en ligne, offre Premium). Il n'y a aucune publicité, aucun
          traceur, aucune vente de données — cette page te dit exactement ce qui existe.
        </p>
      </LegalSection>

      <LegalSection title="1. Qui est responsable de tes données ?">
        <p>
          Le responsable du traitement est l'éditeur de {LEGAL.appName} (application éditée à titre personnel, sans
          société immatriculée). Contact :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className={linkCls}>
            {LEGAL.contactEmail}
          </a>
          . L'application est hébergée par Vercel.
        </p>
      </LegalSection>

      <LegalSection title="2. Ce que l'application stocke, et où">
        <p>
          Tout est enregistré dans le <strong className="text-ink">stockage local de ton navigateur</strong>{' '}
          (localStorage) — une zone qui appartient à ton appareil, pas à nous :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-bold text-ink">Donnée</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-bold text-ink">Où</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-bold text-ink">Pourquoi</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-bold text-ink">Durée</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Événements (titre, date, heure, catégorie, récurrence, rappel)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Ton navigateur (clé <code>centeryou-v1</code>)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Afficher ton planning</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Tant que tu ne les supprimes pas</td>
              </tr>
              <tr>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Tâches (titre, date, heure, catégorie, priorité, état)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Ton navigateur (clé <code>centeryou-v1</code>)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Afficher tes tâches</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Tant que tu ne les supprimes pas</td>
              </tr>
              <tr>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Réglages, dont ton prénom</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Ton navigateur (clé <code>centeryou-v1</code>)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Te saluer et personnaliser ton brief du matin</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Tant que tu ne les supprimes pas</td>
              </tr>
              <tr>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">État des rappels et record de série (stats)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Ton navigateur (clés <code>centeryou-*</code>)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Ne pas te notifier deux fois la même chose</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Quelques jours (rappels) / tant que tu joues</td>
              </tr>
              <tr>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Identifiant d'appareil, statut d'abonnement, quota de voix du mois</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Ton navigateur (clé <code>centeryou-v1</code>)</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Savoir si l'offre Premium est active et compter les essais gratuits</td>
                <td className="border-b border-line/70 px-2 py-1.5 align-top">Tant que tu ne les supprimes pas</td>
              </tr>
              <tr>
                <td className="px-2 py-1.5 align-top">Session de compte (si tu crées un compte) et coquille de l'app pour le mode hors-ligne</td>
                <td className="px-2 py-1.5 align-top">Ton navigateur (clés <code>sb-*</code>, cache du service worker)</td>
                <td className="px-2 py-1.5 align-top">Te reconnaître à la reconnexion ; faire fonctionner l'app sans Internet</td>
                <td className="px-2 py-1.5 align-top"> Jusqu'à déconnexion / suppression du compte</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Si le stockage local est illisible ou corrompu, l'application en garde une copie de secours à côté avant de
          repartir à zéro : rien n'est perdu silencieusement.
        </p>
      </LegalSection>

      <LegalSection title="3. Ce qui peut quitter ton appareil — et seulement si tu l'actives">
        <p>
          Nous avons parcouru tout le code : <strong className="text-ink">les seuls destinataires possibles sont nos
          propres adresses internes (/api/…), le service de synthèse vocale pour le texte lu à voix haute, Stripe et
          Supabase uniquement si tu actives un compte ou l'offre Premium.</strong> Voici le détail, sans jargon :
        </p>
        <LegalList
          items={[
            'Voix premium (ElevenLabs) : quand la voix premium est utilisée, le texte à lire à voix haute — par exemple ton brief du matin ou la réponse de l’assistant vocal — est envoyé à notre route interne /api/voix, qui le transmet au service de synthèse vocale ElevenLabs (situé aux États-Unis, avec les garanties prévues par la Commission européenne) ; il renvoie l’audio. Ton prénom accompagne la requête uniquement pour compter ton quota du jour (300 caractères par jour) : il est gardé en mémoire vive sur notre serveur, jamais enregistré, et remis à zéro chaque nuit. La clé du service de synthèse reste côté serveur et n’est jamais dans ton navigateur. Par défaut (sans voix premium), la voix est produite par ton navigateur : dans ce cas, Centeryou n’envoie aucun texte.',
            'Reconnaissance vocale (bouton micro) : quand tu appuies sur le micro, c’est le service de reconnaissance vocale de ton navigateur qui écoute ta voix — selon le navigateur (Chrome, Edge…), l’audio peut alors être traité par les serveurs du fabricant du navigateur. Centeryou n’envoie rien lui-même, et tu peux tout à fait refuser le micro : le champ texte fonctionne partout.',
            'Compte en ligne (facultatif, pour la sauvegarde en ligne) : si tu crées un compte, ton adresse e-mail, ton mot de passe et ton prénom sont envoyés à Supabase (hébergé dans l’Union européenne), qui gère l’identification, et une copie de tes données (événements, tâches, réglages) est enregistrée dans ta sauvegarde en ligne. Sans compte, rien de tout cela n’existe.',
            'Offre Premium (4,99 €/mois, facultative) : le paiement est traité exclusivement par Stripe, sur sa page hébergée — ta carte bancaire ne passe jamais par nous. Stripe reçoit ton e-mail de compte et tes données de paiement, jamais ton planning. La synchronisation multi-appareils de l’offre Premium envoie un instantané de tes données (événements, tâches, réglages) vers notre route interne /api/sync, où il est stocké chez notre hébergeur, associé à ton identifiant client Stripe — uniquement si l’abonnement Premium est actif.',
            'Suppression de compte : le bouton « Supprimer mon compte et mes données » envoie une demande à notre route interne /api/compte/suppression pour effacer ton compte côté serveur (voir section 6).',
            'Journaux de l’hébergeur : comme tout site web, Vercel enregistre des journaux techniques (adresse IP, date et heure, page demandée) pour la sécurité et le fonctionnement du service. Nous n’y avons pas accès au quotidien et ils ne contiennent pas tes données de planning.',
            'Rien d’autre : aucune mesure d’audience, aucune publicité, aucun réseau social, aucun partage. La sauvegarde JSON que tu exportes (section 6) est un fichier que tu télécharges toi-même : il ne part nulle part.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Les rappels sont 100 % locaux">
        <p>
          Les rappels (avant un rendez-vous, ou le récapitulatif des tâches du jour) sont des notifications envoyées
          par <strong className="text-ink">ton navigateur, sur ton appareil</strong> : aucun serveur de push n’est
          impliqué. Ils fonctionnent quand Centeryou est ouvert ou en arrière-plan, et tu peux les désactiver à tout
          moment dans Réglages → Rappels.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies et traceurs : il n’y en a aucun (et c’est assumé)">
        <p>
          Centeryou n’utilise <strong className="text-ink">aucun cookie</strong>, aucun outil de mesure d’audience,
          aucune publicité et aucun traceur tiers. C’est pourquoi il n’y a <strong className="text-ink">pas de
          bandeau cookies</strong> : la loi n’en demande pas, puisqu’aucun cookie n’est déposé. L’application utilise
          uniquement le <strong className="text-ink">stockage local de ton navigateur</strong> (localStorage),
          strictement nécessaire pour fonctionner — tes événements, tâches et réglages y sont enregistrés. Ce
          stockage reste sur ton appareil ; il n’est ni lu ni transmis ailleurs.
        </p>
      </LegalSection>

      <LegalSection title="6. Tes droits, concrètement (moins de 30 secondes depuis les Réglages)">
        <LegalList
          items={[
            'Voir et modifier tes données : directement dans l’application (ton prénom se change dans Réglages → Profil).',
            'Récupérer toutes tes données : Réglages → carte « Données locales » → « Sauvegarder mes données ». Tu télécharges un fichier JSON qui contient TOUT : tous tes événements (avec catégorie et rappel), toutes tes tâches, tous tes réglages, dont ton prénom. Tu peux le rouvrir sur un autre appareil avec « Restaurer une sauvegarde… ».',
            'Tout effacer : Réglages → « Supprimer mon compte et mes données » (deux clics de confirmation). Effacement immédiat de tout ce qui est sur cet appareil (prénom, événements, tâches, réglages, rappels) ET, si tu as un compte, demande d’effacement du compte côté serveur. C’est définitif et irréversible. Le bouton « Effacer toutes mes données », lui, n’efface que l’appareil local.',
            'Nous écrire pour toute autre demande (accès, rectification, portabilité, opposition, limitation) : écris à ' + LEGAL.contactEmail + ' en indiquant ton prénom et, si tu as un compte, ton adresse e-mail. Nous répondons ' + LEGAL.responseDelayShort + ', et ' + LEGAL.responseDelayLegal + ' pour les demandes de droits. Tu peux aussi saisir la CNIL (cnil.fr).',
          ]}
        />
        <p>
          Pour exercer un droit :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className={linkCls}>
            {LEGAL.contactEmail}
          </a>{' '}
          · CNIL :{' '}
          <a href="https://www.cnil.fr" className={linkCls} rel="noopener noreferrer">
            cnil.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité">
        <p>
          L’application est servie en HTTPS. Les clés des services externes (synthèse vocale, paiement) ne vivent que
          côté serveur, jamais dans ton navigateur : la voix premium et le paiement passent par nos routes internes
          qui les relaient. Des en-têtes de sécurité stricts empêchent d’autres sites d’embarquer Centeryou ou de
          lire tes données. Tes données locales sont nettoyées automatiquement si elles sont corrompues, sans perte
          silencieuse (une copie de secours est conservée). Aucune donnée n’est vendue ni partagée.
        </p>
      </LegalSection>

      <LegalSection title="8. Combien de temps les données sont-elles gardées ?">
        <LegalList
          items={[
            'Données de l’application (prénom, événements, tâches, réglages) : dans ton navigateur, tant que tu ne les supprimes pas — toi seul décides.',
            'Sauvegarde en ligne (si compte) : jusqu’à la suppression de ton compte (« Supprimer mon compte et mes données »).',
            'Synchronisation Premium (si offre Premium active) : tant que l’abonnement est actif ; la suppression du compte efface aussi l’instantané côté serveur.',
            'Quota de voix premium (prénom + compteur de caractères) : mémoire vive du serveur uniquement, remis à zéro chaque jour, jamais enregistré sur disque.',
            'Texte envoyé au service de synthèse vocale : transmis à ElevenLabs lors de la lecture, puis conservé par ce service selon sa propre politique de confidentialité.',
            'Journaux de l’hébergeur (Vercel) : selon la durée propre à Vercel, limitée à ce qui est nécessaire à la sécurité.',
            'E-mails que tu nous écris : le temps de traiter ta demande, puis supprimés.',
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Qui d’autre que nous voit tes données ? (sous-traitants)">
        <LegalList
          items={[
            'Vercel : hébergement de l’application et de ses journaux techniques (États-Unis, garanties contractuelles types de la Commission européenne).',
            'ElevenLabs : synthèse vocale premium, uniquement via notre route interne /api/voix, uniquement quand la voix premium est utilisée (États-Unis, mêmes garanties).',
            'Stripe : paiement de l’offre Premium uniquement (e-mail de compte et données de paiement, jamais ton planning).',
            'Supabase : compte en ligne et sauvegarde en ligne uniquement si tu crées un compte (Union européenne).',
            'Aucun autre. La liste est vérifiable dans le code de l’application.',
          ]}
        />
      </LegalSection>

      <LegalSection title="10. Cette page peut évoluer">
        <p>
          La version en vigueur est celle affichée ici (version {LEGAL.privacyVersion}, mise à jour le{' '}
          {LEGAL.privacyUpdated}). En cas de changement important, il sera signalé dans l’application. Voir aussi les{' '}
          <Link href="/cgu" className={linkCls}>
            conditions générales d’utilisation
          </Link>{' '}
          , les{' '}
          <Link href="/legal" className={linkCls}>
            mentions légales
          </Link>{' '}
          et la page{' '}
          <Link href="/contact" className={linkCls}>
            contact
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
