/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Aucune clé secrète n'est exposée au client : ElevenLabs et Stripe ne sont
  // lus que côté serveur (routes /api). Les anciennes variables NEXT_PUBLIC_*
  // ElevenLabs ne sont plus injectées dans le bundle navigateur.
};

export default nextConfig;
