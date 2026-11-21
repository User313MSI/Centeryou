# Journal — Verrou

## Mission M-13 — Sécurité offensive pré-lancement (campagne « Grand V », vague 1)

- **Agent** : Verrou (session Vibe Code dédiée). Branche : `vibe/verrou-securite` (base `main` b0127c3, puis 6187d37 après publication de MISSIONS.md).
- **PR** : **https://github.com/User313MSI/Centeryou/pull/35** (brouillon, base `main`, commit `5238bf1` + merge de main `f7da2ec`, 13 fichiers = zone uniquement).
- **Zone étanche tenue** : `src/app/api/**`, `src/lib/server/**`, `src/middleware.ts`, `.github/workflows/**` + ce journal + `tests/api-intrusion.test.ts` (nouveau fichier exigé par la mission). **Aucun autre fichier touché** (vérifié au commit : `git commit -- <chemins>` explicites, car le worktree est partagé avec d'autres agents de la vague 1 — leurs fichiers WIP n'ont jamais été commités ici). Aucune fusion (réservé à Vibe Work). Aucun test supprimé. Zéro nouvelle dépendance (`package.json` inchangé). Interface 100 % FR.
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md`, `journal/sentinelle.md` (rapport d'audit, attaques pentest n°1–15), `journal/bouclier.md` (M-08 déjà corrigé — rien de refait : auth `/api/sync` + `/api/compte/suppression`, 429 modèle voix, etc.), `journal/secure.md`, tests existants `api-voix` / `api-securite` / `api-sync-auth`.
- **Baseline mesurée** (2026-11-21 03:29 UTC) : `npm ci` ✅ · `npm test` ✅ **327/327** sur 2d08f82 ; après rebase sur b0127c3 (M-07 fusionnée) : **383 tests** sur main.

## Méthode

J'ai joué l'attaquant AVANT les vrais attaquants : chaque attaque du rapport Sentinelle (n°4 usurpation d'en-têtes, n°6 DoS, n°10 rate-limits manquants, n°11 Host forgé) est rejouée automatiquement dans `tests/api-intrusion.test.ts`, avec le résultat **avant** (constaté à la lecture du code / en smoke) et **après** (corrigé).

## Attaques tentées et résultats avant/après

| # | Attaque | Avant (constaté) | Après (corrigé) | Preuve |
|---|---------|------------------|-----------------|--------|
| 1 | Flood `/api/checkout` (création de sessions Stripe = coût) | **aucun rate-limit** (audit n°10) | 10 req/h/IP → 429 + `Retry-After` + message FR sans détail | test + smoke (`HTTP 429, retry-after: 531`) |
| 2 | Flood `/api/portal` | aucun rate-limit | 10 req/h/IP → 429 propre | test |
| 3 | Flood `/api/subscription/status` (chaque appel lit Stripe) | aucun rate-limit | 30 req/h/IP → 429 propre | test (31ᵉ requête) |
| 4 | Flood `/api/compte/suppression` | aucun rate-limit | 10 req/h/IP → 429 propre | test |
| 5 | Rotation de `x-centeryou-user` pour multiplier le quota voix (300 car/jour/profil) | quota keyed sur le prénom client ; borné seulement par 20 req/h/IP (max 6 000 car/h/IP) | **plafond global par IP plus strict** : 100 req/jour/IP **et** 3 000 caractères/jour/IP au total → 429 `quota-ip` | test : 10 prénoms × 300 car même IP passent, le 11ᵉ → 429 `limit: 3000` |
| 6 | Multiplier les prénoms en étant connecté (session Supabase) | l'identité de session n'avait aucun poids | **dès qu'une session Supabase existe (Bearer vérifié côté serveur), elle PRIME sur le prénom** : clé de quota = `session:<userId>` | test : même Bearer, prénoms Alice puis Bob → 2ᵉ requête 429 quota ; sans Bearer, repli sur le prénom |
| 7 | `Host` forgé sur `/api/checkout` → `success_url` dérivée du Host (redirection de paiement / phishing, audit n°11, APP_URL vide en prod) | `appUrl = APP_URL ?? new URL(req.url).origin` → `https://evil.example/reglages?...` | **`trustedBaseUrl`** : APP_URL si définie (validée http(s)), sinon Host validé — localhost toujours accepté, en prod UNIQUEMENT les hôtes connus (`dev-apps-centeryou.vercel.app`, `centeryou.fr`, `www.centeryou.fr`, hôte de `NEXT_PUBLIC_SITE_URL`, `ALLOWED_HOSTS`) ; nom d'hôte à la syntaxe contrôlée ; sinon **400 propre, aucun appel Stripe** | tests (8 cas) + smoke : `Host: evil-attacker.example` → 400, 0 appel Stripe ; domaine prod → `success_url` sur ce domaine |
| 8 | Idem sur `/api/portal` (`return_url`) | idem | idem (400 propre) | test + unité `trustedBaseUrl` |
| 9 | Gros corps sur toutes les routes API (DoS, audit n°6) | seul `/api/sync` plafonné (1 Mo) ; voix/webhook/checkout/portal/suppression sans plafond de lecture | plafonds par route : voix 16 Ko, checkout/portal/status 8 Ko, suppression 4 Ko, webhook 256 Ko → **413** ; + garde-fou **middleware** : `Content-Length` > 2 Mo sur `/api/*` → 413 avant lecture | tests + smoke (webhook 300 Ko → 413 ; CL 3 Mo → 413) |
| 10 | Champs inattendus (`{deviceId, admin:true}`) | ignorés silencieux | **400 « Champ inattendu dans la requête »** sur checkout, portal, status, sync, suppression, voix | tests |
| 11 | Valeurs hors bornes / encodages piégés | `customerId` seulement tronqué à 100 car ; `deviceId` non validé ; e-mail du corps non validé ; `updatedAt` non borné ; `state` quelconque | formats stricts à la main : `cus_[A-Za-z0-9_-]{1,99}`, `cs_(test_)?…`, deviceId imprimable ≤ 100 car sans caractère de contrôle, e-mail RFC simple ≤ 254 car, `updatedAt` fini et ≤ 1e15, `state` objet JSON obligatoire ; `x-centeryou-user` nettoyé (contrôles retirés, 60 car) | tests |
| 12 | Rejeu de webhook (timestamp ancien) / signature malformée / événement sans type | anti-rejeu ±300 s déjà en place (M-08/héritage) ; mais JSON signé illisible → 500, type absent → traité comme reçu | 413 > 256 Ko ; 400 « Événement illisible » ; 400 « Événement invalide » ; rejeu → 400 (inchangé, re-testé) | tests route-level |
| 13 | Tokens malformés (Bearer bidon sur voix/sync/suppression) | vérifiés côté serveur (M-08) | inchangé + re-testé : voix → repli sur le prénom (pas de crash) | test |
| 14 | Fuite d'infos dans les erreurs (clés, stack, hôtes internes) | déjà sobre (M-08) | **balayage automatisé** : 10 réponses d'erreur de toutes les routes testées contre une regex de fuite (`sk_live…`, `whsec_…`, `xi-api-key`, `elevenlabs`, `api.stripe.com`, `Error:`, stack) → aucune fuite | test de balayage |
| 15 | `x-forwarded-for` multi-IP usurpé | dernière entrée = proxy de confiance (déjà OK) | inchangé, re-testé | test existant api-voix |

## Fichiers modifiés (zone uniquement)

- `src/lib/server/http.ts` (nouveau) : `json()` sécurisée, `rateLimitOrNull()` (modèle voix : 429 + Retry-After + FR), `readJsonBody()` (plafond + parse sûr), `unknownFields()`, `isSafeText()`, `isValidCustomerId()`, `isValidCheckoutSessionId()`, `isValidEmail()`, **`trustedBaseUrl()`** (Host/APP_URL).
- `src/app/api/checkout/route.ts`, `portal/route.ts`, `subscription/status/route.ts`, `compte/suppression/route.ts` : rate-limit + validation entrées + `trustedBaseUrl` (checkout/portal).
- `src/app/api/sync/route.ts` : validation renforcée (champs, format `cus_…`, bornes `updatedAt`, `state` objet) — auth M-08 intacte.
- `src/app/api/stripe/webhook/route.ts` : plafond 256 Ko (413), événement lisible/typé exigé (400).
- `src/app/api/voix/route.ts` : plafond de corps 16 Ko, champs stricts, `x-centeryou-user` nettoyé, **plafonds IP/jour (100 req, 3 000 car)**, **session Supabase prioritaire sur le prénom** pour le quota. Comportement 20 req/h et messages inchangés.
- `src/middleware.ts` : garde-fou `Content-Length` > 2 Mo sur `/api/*` → 413 FR (CSP nonce inchangée).
- `.github/workflows/centeryou-ci.yml` + `scan-secrets.sh` (nouveau) : **scan de secrets BLOQUANT** (12 motifs de clés courantes + affectations littérales de variables sensibles, grep -E zéro dépendance, périmètre src/public/scripts/tests/configs/.github, hors docs/node_modules) + **npm audit `--omit=dev` informatif non bloquant** (`::warning::`). Le scan a été testé en positif (clé `sk_live_…` plantée → CI échoue) et en négatif (arbre propre → passe).
- `tests/api-intrusion.test.ts` (nouveau) : **27 tests d'intrusion** (voir ci-dessus).

## Validation (2026-11-21 ~03:55 UTC)

- `npx tsc --noEmit` ✅ (sur la zone ; le worktree partagé contient le WIP d'un autre agent avec une erreur TS hors zone, non mienne).
- `npm test` ✅ **410/410** sur la branche = **383 tests de main intacts + 27 nouveaux** (le run global dans le worktree partagé monte à 430 avec les fichiers WIP des autres agents, tous verts aussi). `npm run test:parser` ✅.
- `npm run build` ✅ (Next.js 14.2.35, middleware 27,2 kB).
- **Smoke `next start`** : 19 pages en **200** (`/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages`, `/voix`, `/bienvenue`, `/demo`, `/offres`, `/cgu`, `/inscription`, `/contact`, `/presse`, `/legal`, `/confidentialite`, `/onboarding`, `/robots.txt`, `/sitemap.xml`) ; API : voix sans clé → 503, webhook sans signature → 400, webhook 300 Ko → 413, sync POST 200 / champ inattendu 400 / GET 200, suppression 200, status 200/400, checkout 503 (sans clé) / 413 (gros corps) / **429 + Retry-After après flood**, middleware CL 3 Mo → 413, **Host forgé avec Stripe configuré → 400 sans appel Stripe**, domaine prod/localhost → validation passée.
- Scan de secrets local : ✅ propre (RC 0), et ✅ bloquant sur secret planté (RC 1).
- **Appels légitimes inchangés** : le client (`src/lib/billing.ts`, `src/lib/voice.ts`, `src/lib/sync.ts`, réglages) envoie exactement les champs désormais acceptés (`{deviceId}`, `{customerId}`, `{customerId, sessionId}`, `{customerId, updatedAt, state}`, `{}`, `{text}`) vers `http://localhost`/le domaine prod → mêmes réponses qu'avant hors attaques. Note documentée pour une future mission hors zone : le client voix pourrait envoyer son `Authorization: Bearer` pour activer la priorité de session côté serveur (la route l'honore déjà si l'en-tête est présent).

## Reste connu (hors périmètre, noté pour Vibe Work)

- Rate-limits en mémoire par instance serverless (documenté, acceptable en anti-abus) ; XFF contournable uniquement en self-hosted (M-09 Cloudflare devra poser un vrai IP).
- `next@14.2.35` / vitest : CVE connues, suivies (sentinelle.md), `npm audit` désormais visible en CI en informatif.
- Preview deployments Vercel (`*.vercel.app` autres que le domaine connu) : `/api/checkout` y répond 400 par sécurité (paiement réservé au domaine de prod ; `ALLOWED_HOSTS` permet d'en déclarer d'autres).

---

*Verrou, 2026-11-21. Aucune fusion effectuée (Vibe Work). Branche `vibe/verrou-securite`, PR base `main`.*
