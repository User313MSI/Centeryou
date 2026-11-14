import type { Metadata } from 'next';
import { OnboardingSteps } from '../../components/auth/onboarding-steps';

export const metadata: Metadata = {
  title: 'Bienvenue — prise en main',
  description:
    'Trois étapes pour prendre Centeryou en main : saisie en langage naturel, glisser-déposer dans le planning, et brief du matin à la voix.',
  alternates: { canonical: '/onboarding' },
};

export default function OnboardingPage() {
  return <OnboardingSteps />;
}
