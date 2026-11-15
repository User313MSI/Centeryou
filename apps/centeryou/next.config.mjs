/** @type {import('next').NextConfig} */
// La CSP (avec nonce par requête) est posée par src/middleware.ts — elle ne peut
// pas être statique ici, sinon elle serait servie en double et sans nonce.
// Origine Supabase autorisée dans la CSP (connect-src) quand la sauvegarde en
// ligne est configurée — lue depuis l'environnement, jamais de clé ici.

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  // Masque l'en-tête X-Powered-By (fingerprint du serveur).
  poweredByHeader: false,
  // Aucune clé secrète n'est inlinée ici : Stripe et ElevenLabs ne sont lus que
  // côté serveur (routes /api/*) — jamais dans le bundle navigateur.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
