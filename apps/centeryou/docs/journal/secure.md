# Sécure — 2026-11-15 — Mission : sécurité au maximum

Agent : **Sécure** (spécialiste sécurité). Branche : `vibe/secure-hardening-c8ed2d` (base : `main`).
Périmètre : `apps/centeryou/` — **hors zone UI/pages** (agent Lynx) : aucune modification de
composant ou de page, aucune variable d'environnement renommée, aucune dépendance lourde ajoutée.

## État au 15/11 (constaté)

- CSP présente (`next.config.mjs` → `headers()`) mais `script-src 'self' 'unsafe-inline'`.
- `/api/voix` : quota 300 car/jour/profil (Céléste) mais **pas de plafond par IP**.
- HSTS ✅ (Vercel), `X-Frame-Options: DENY` ✅, `X-Content-Type-Options` ✅, `Referrer-Policy` ✅.
- `poweredByHeader` absent de `next.config.mjs` (X-Powered-By exposé — point noté dans l'audit d'Alpha).

## Plan

1. Rate-limit par IP sur `/api/voix` (20 req/h/IP, fenêtre fixe) + réponse 429 propre
   (`Retry-After`, JSON français) + test vitest dédié.
2. CSP stricte sans `'unsafe-inline'` dans `script-src` via **nonce par requête**
   (middleware Next.js) ; `style-src 'unsafe-inline'` conservé et justifié.
3. `poweredByHeader: false` dans `next.config.mjs`.
4. Audit dépendances (`npm audit`) : correctifs sans breaking change, reste listé ici.
5. Vérifications documentées : signature webhook Stripe, refus sans clés sur
   `/api/sync` et `/api/checkout`, aucune fuite de détails d'erreur sur les routes API.
6. Preuve par grep qu'aucune clé (`sk_…`, `whsec_…`, `xi-api-key`…) n'est dans le bundle client.

## Avancement

- 2026-11-15 — branche créée, journal ouvert, PR brouillon ouverte (base `main`).
- Baseline vérifiée : `npm run build` ✅, `npm test` ✅ 139/139.
