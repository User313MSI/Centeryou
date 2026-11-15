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
  - Smoke test loopback (`next start` + requêtes HTTP locales) : 20 requêtes → 503 (pas de clé
    en local), la 21e depuis la même IP → **429 + `Retry-After: 2601`**, une autre IP non bloquée.
- **Étape 2 — CSP stricte par nonce** :
  - Nouveau `src/middleware.ts` : nonce aléatoire (128 bits, hex) **par requête**, posé dans
    l'en-tête de requête `Content-Security-Policy` (que Next.js 14.2 relit pour signer ses
    propres scripts inline : bootstrap + données RSC `self.__next_f.push`) et dans `x-nonce`
    (lu par le layout via `headers()` pour signer le script inline anti-flash). La CSP complète
    est renvoyée au navigateur : `script-src 'self' 'nonce-…'` — **`'unsafe-inline'` supprimé**.
  - `next.config.mjs` : la CSP statique en est retirée (sinon double en-tête CSP, la version
    sans nonce gagnerait) ; `poweredByHeader: false` ajouté → **`X-Powered-By` ne part plus**.
  - `style-src 'self' 'unsafe-inline'` **conservé et justifié** : le layout racine injecte une
    balise `<style>` inline (variables CSS des deux thèmes, `layout.tsx`) et React/Next peuvent
    injecter des styles inline ; aucun contenu saisi par l'utilisateur n'y entre (échappement
    React), donc le risque XSS via CSS reste nul. À retirer exigerait de sortir les variables
    CSS du layout (zone UI) — hors périmètre.
  - Point technique constaté (Next 14.2.35) : une page **statique** est servie telle quelle, sans
    nonce sur ses scripts inline → CSP stricte impossible en statique. Le layout racine lit
    donc `headers()` (pattern officiel Next), ce qui rend les pages en rendu dynamique (ƒ) :
    Next applique alors le nonce à tous ses scripts inline. **Seule retouche du layout** :
    lecture du nonce + constante du script anti-flash déplacée dans `src/lib/theme-init.ts`
    (aucun changement de rendu/UI). Aucun composant ni `page.tsx` touché.
  - Vérification empirique (`next start` + requêtes loopback, 7 pages) : `script-src 'self'
    'nonce-…'`, **tous** les scripts inline (7–8/page, y compris le script anti-flash) portent
    le nonce de la requête, nonce **unique par requête**, `X-Powered-By` absent, CSP aussi
    présente sur les routes API. `npm test` ✅ 144/144, `npm run build` ✅.
- **Étape 3 — vérifications « paiement / erreurs » + anti-rejeu** :
  - **Signature webhook Stripe vérifiée** ✅ : HMAC-SHA256 sur `t.body` avec `STRIPE_WEBHOOK_SECRET`,
    comparaison en **temps constant** (`timingSafeEqual`), aucune signature valide → 400.
    Renforcement ajouté : **tolérance d'horodatage ±300 s** (recommandation Stripe) → un webhook
    rejoué avec un vieux `t` est rejeté même si la signature est valide (`src/lib/server/stripe.ts`).
  - **Refus sans clés vérifié** : `/api/checkout` et `/api/portal` → **503** propre si
    `STRIPE_SECRET_KEY` absent ; `/api/subscription/status` → `{ snapshot: null, configured: false }` ;
    `/api/compte/suppression` → 200 explicite « aucun compte serveur configuré ». `/api/sync`
    **sans clés KV** ne refuse pas : repli **mémoire** intentionnel et documenté (déjà en place,
    aucune donnée secrète en jeu, la synchro locale reste fonctionnelle) — mais il gagne des
    garde-fous : `customerId` borné à 100 caractères et corps POST plafonné à **1 Mo (413)**.
  - **Aucune route API ne fuit de détails d'erreur** : `sync`, `checkout`, `portal`,
    `stripe/webhook`, `subscription/status` renvoient désormais un **message générique français**
    en 500 et loguent le détail côté serveur (`console.error('[api/…]')`) — avant, `err.message`
    partait dans la réponse (ex. message d'erreur Stripe/KV).
  - Tests : nouveau `tests/api-securite.test.ts` (18 cas : signature valide/invalide/maltraitée,
    rejeu > 5 min refusé, rotation multi-v1, webhook 400/200 en route, 503 sans clé checkout/portal,
    500 sans fuite d'interne, garde-fous sync 400/413 + repli mémoire fonctionnel).
    `npm test` ✅ **162/162** (139 initiaux + 23 nouveaux), `npm run build` ✅.
