import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '../../lib/legal';
import { LegalDoc, LegalList, LegalSection } from '../../components/legal/legal-doc';

export const metadata: Metadata = {
  title: `Contact & support — ${LEGAL.appName}`,
  description: `Contacter l'équipe ${LEGAL.appName} : e-mail, délai de réponse annoncé, exercice de tes droits RGPD.`,
};

export default function ContactPage() {
  return (
    <LegalDoc title="Contact & support" meta={`Une question, un bug, une demande RGPD ? Écris-nous.`}>
      <LegalSection title="Nous écrire">
        <p>
          E-mail de contact :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {LEGAL.contactEmail}
          </a>
        </p>
        <p>
          Délai de réponse annoncé : nous répondons {LEGAL.responseDelayShort}, et {LEGAL.responseDelayLegal}{' '}
          pour les demandes d'exercice de droits.
        </p>
        <p>
          Merci d'indiquer ton prénom et, si tu nous as déjà contacté, l'adresse e-mail utilisée, afin de
          faciliter le traitement de ta demande.
        </p>
      </LegalSection>

      <LegalSection title="Pourquoi nous contacter ?">
        <LegalList
          items={[
            'Une question sur l\'application ou un bug à signaler.',
            'Exercer tes droits RGPD (accès, rectification, effacement, export, opposition) — voir la politique de confidentialité.',
            'Supprimer ton compte et tes données — le plus simple est de le faire directement dans Réglages.',
            'Toute remarque sur les présentes pages légales.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Liens utiles">
        <p>Depuis cette page, tu peux aussi aller directement vers :</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link href="/reglages" className="rounded-pill border border-line bg-bg px-4 py-2 text-sm font-semibold text-ink transition-colors duration-fast hover:border-primary hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Réglages
          </Link>
          <Link href="/confidentialite" className="rounded-pill border border-line bg-bg px-4 py-2 text-sm font-semibold text-ink transition-colors duration-fast hover:border-primary hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Confidentialité
          </Link>
          <Link href="/cgu" className="rounded-pill border border-line bg-bg px-4 py-2 text-sm font-semibold text-ink transition-colors duration-fast hover:border-primary hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            CGU
          </Link>
        </div>
      </LegalSection>
    </LegalDoc>
  );
}
