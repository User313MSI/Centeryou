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
- **Étape 4 — audit des dépendances (`npm audit`)** :
  - Résultat initial : **8 vulnérabilités** (3 critical, 2 high, 3 moderate) : `next` (critical,
    correctif = next@16.4.6, **majeur**), `postcss` imbriqué sous next (high, idem), et 6 paquets
    **dev uniquement** (`vitest`, `vite`, `vite-node`, `esbuild`, `tinypool`, `@vitest/mocker` —
    correctif = vitest@5.1.0, **majeur**).
  - `npm audit fix` (sans `--force`, donc sans breaking change) : **aucun correctif applicable** —
    `next@14.2.35` est le dernier 14.2.x et `vitest@2.1.9` le dernier 2.x ; toutes les corrections
    exigent une montée de version majeure, interdite par la mission. Le lockfile n'a subi aucune
    modification de version (bruit d'entrées optionnelles swc rétabli à l'identique).
  - **Reste à corriger (hors cette PR, car breaking)** : monter `next` vers 15.x puis 16.x
    (résout next + postcss imbriqué ; 2 vulnérabilités de production restantes) et `vitest`
    vers 5.x (6 vulnérabilités dev-only, jamais déployées : le bundle livré ne contient aucune
    de ces librairies — `npm audit --omit=dev` ne remonte que next/postcss).
  - Atténuations déjà en place ici : CSP stricte par nonce (bloque l'exécution de tout script
    injecté), rate-limit `/api/voix`, en-têtes de sécurité, erreurs API non verbeuses.
- **Étape 5 — preuve qu'aucune clé n'est dans le bundle client** :
  - Méthode : build de production avec des **valeurs secrètes factices** injectées
    (`NEXT_ELEVENLABS_API_KEY=FAUX-XI-KEY-SECRET-12345`, `STRIPE_SECRET_KEY=sk_test_FAUXSECRET123456`,
    `STRIPE_WEBHOOK_SECRET=whsec_FAUXSECRET654321`, `KV_REST_API_TOKEN=kv_FAUXTOKEN999888`,
    `SUPABASE_SERVICE_ROLE_KEY=supa_FAUXSERVICE111222`), puis `grep -rEo` dans `.next/static`
    (tout le bundle navigateur) sur (a) chaque valeur factice et (b) les préfixes/patterns
    `sk_live_`, `sk_test_`, `whsec_`, `xi-api-key`, `api.elevenlabs.io`, `api.stripe.com`,
    `service_role`.
  - Résultat : **0 occurrence** de chaque valeur factice et de chaque préfixe dans `.next/static`.
    Les 7 occurrences de `Bearer ` trouvées sont des template literals de `@supabase/supabase-js`
    (`Bearer ${jwt}` à l'exécution — clé anon publique/JWT utilisateur, jamais une clé secrète).
  - Contrôle positif : `xi-api-key` et `api.elevenlabs.io` n'existent que dans
    `.next/server/app/api/voix/route.js` (code serveur) ✅. `NEXT_PUBLIC_SUPABASE_URL` est bien
    présent côté client — c'est une URL **publique par design** (pas une clé).
  - Côté dépôt : seul `.env.local.example` est commité (placeholders uniquement) ; grep de
    littéraux ressemblant à des clés (`sk_live…`, `sk_test…`, `whsec_…`, `xi-api-key…`, JWT `eyJ…`)
    dans `src/`, `next.config.mjs`, `public/` → **0**.

## Vérifications finales

- `npm run build` ✅ (avec et sans fausses clés)
- `npm test` ✅ **162/162** (139 initiaux + 23 nouveaux : rate-limit IP ×5, sécurité API ×18)
- `npm run test:parser` ✅
- `next start` + requêtes loopback : CSP nonce servie sur toutes les pages, scripts inline signés,
  `X-Powered-By` absent, 21e requête `/api/voix` depuis une IP → 429 + `Retry-After`
- PR : **https://github.com/User313MSI/Centeryou/pull/19** (base `main`, branche
  `vibe/secure-hardening-c8ed2d`)
