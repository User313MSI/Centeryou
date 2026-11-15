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

- 2026-11-15 — branche créée, journal ouvert, PR brouillon ouverte (base `main`) :
  **PR https://github.com/User313MSI/Centeryou/pull/19**
- Baseline vérifiée : `npm run build` ✅, `npm test` ✅ 139/139.
- **Étape 1 — rate-limit par IP sur `/api/voix`** (`src/app/api/voix/route.ts`) :
  - plafond **20 requêtes/heure/adresse IP**, fenêtre fixe (`AAAA-MM-JJTHH`), compteur en mémoire
    `Map` (même pattern et mêmes limites connues que le quota existant : par instance serverless) ;
  - IP = **dernière entrée de `x-forwarded-for`** (ajoutée par le proxy de confiance, ex. Vercel —
    une valeur usurpée en première position ne change donc pas l'identité retenue), repli
    `x-real-ip`, puis `inconnu` ;
  - le compteur est incrémenté **avant toute validation** (les requêtes invalides comptent aussi) ;
  - dépassement → **429** JSON 100 % français `{ ok:false, reason:'rate-limit', limit:20, remaining:0,
    retryAfter, message }` + en-tête **`Retry-After`** (secondes jusqu'à la prochaine heure pleine)
    + `Cache-Control: no-store` (déjà en place) — aucun détail interne dans la réponse ;
  - le quota par profil (300 car/jour) est **conservé intact** en complément.
  - Tests : 5 nouveaux cas dans `tests/api-voix.test.ts` (21e requête → 429 + `Retry-After`, plafond
    bien par IP, requêtes invalides comptées, aucune fuite dans le 429, `x-forwarded-for`
    multi-IP). `npm test` ✅ **144/144**, `npm run build` ✅.
