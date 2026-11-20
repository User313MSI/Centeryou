import type { Metadata } from 'next';
import { InscriptionCard } from '../../components/auth/inscription-card';

export const metadata: Metadata = {
  title: 'Créer mon compte',
  description:
    'Crée ton compte Centeryou en 10 secondes : un prénom suffit. 100 % local — tes données restent dans ce navigateur, aucun serveur, aucun mot de passe.',
  alternates: { canonical: '/inscription' },
};

export default function InscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">Créer mon compte</h1>
        <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-muted">
          Gratuit, sans adresse e-mail ni mot de passe : ton compte vit sur cet appareil.
        </p>
      </header>
      <InscriptionCard />
    </div>
  );
}
