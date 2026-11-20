# Journal — Bouclier

## Mission M-08 — Correctifs pré-lancement issus de l'audit Sentinelle

- **Agent** : Bouclier (sous-agent de l'Adjudant, session Vibe Code). Branche : `vibe/bouclier-correctifs` (base `origin/main`).
- **PR** : https://github.com/User313MSI/Centeryou/pull/27 (brouillon, base `main`, head `vibe/bouclier-correctifs`, titre « Bouclier : correctifs pré-lancement (M-08) »).
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (M-08), tous les journaux de `docs/journal/` — en particulier `sentinelle.md` (rapport d'audit, risques n°1/2/4/5/6/7), `secure.md` (rate-limit `/api/voix`, erreurs non verbeuses, garde-fous sync 400/413 + repli mémoire), `celeste.md` (voix), `alpha.md` (sanitation store), `paillette.md` (M-05 : a retouché `event-block.tsx` — le bug de hooks y est **toujours présent**, confirmé à la lecture), `realisateur.md` (M-06, 233/233).
- **Baseline mesurée sur `origin/main` (2026-11-20 ~13:10 UTC)** : `npm ci` ✅ · `npx tsc --noEmit` ✅ · `npm test` ✅ **233/233** (18 fichiers) · `npm run test:parser` ✅ · branche créée depuis `origin/main` (33588e2).

## Étapes (heure UTC)

- 2026-11-20 13:10 — Branche `vibe/bouclier-correctifs` créée depuis `origin/main`, `npm ci` OK (Node v24.22.1, npm 11.19.1), baseline verte (voir ci-dessus), journal ouvert, branche poussée, PR brouillon **#27** ouverte (https://github.com/User313MSI/Centeryou/pull/27).
- 2026-11-20 13:25 — **Correctif 1 — `/api/sync` sans auth** ✅ (commit `b9fcaae`) :
  - Avant : n'importe quel `customerId` deviné donnait lecture/écrasement du snapshot (seuls garde-fous : 100 car / 1 Mo, aucun rate-limit).
  - Après : `src/lib/server/rate-limit.ts` (limiteur 20 req/h/IP, fenêtre horaire fixe, `429` + `Retry-After` + message FR, même modèle que `/api/voix`) appliqué en premier sur GET et POST ; puis `src/lib/server/auth.ts` (`supabaseServerConfig`, `verifySessionUser` via `GET {SUPABASE_URL}/auth/v1/user` avec `apikey` serveur + Bearer) : si Supabase est configuré, session valide exigée (sinon **401**) avant toute lecture/écriture ; si Stripe est configuré, `retrieveCustomer(customerId)` (ajouté à `src/lib/server/stripe.ts`) doit avoir le même e-mail que la session (sinon **403**, sinon **502** si vérif impossible) ; Stripe configuré sans Supabase → **503** refus propre ; aucun backend configuré (dev local) → repli mémoire inchangé (les 233 tests existants, dont le repli mémoire, restent verts).
  - Client : `src/lib/sync.ts` envoie `Authorization: Bearer <access_token>` (session Supabase courante) sur le GET et le POST de `/api/sync`.
  - Tests : `tests/api-sync-auth.test.ts` — 13 cas (lecture/écriture sans preuve → 401 et rien n'est persisté ; jeton invalide → 401 ; session valide + e-mail correspondant → 200 lecture/écriture ; e-mail différent → 403 ; Stripe sans Supabase → 503 ; 21ᵉ requête/IP → 429 + `Retry-After`).
- 2026-11-20 13:25 — **Correctif 2 — `/api/compte/suppression` sans auth** ✅ (même commit) :
  - Avant : un POST avec un e-mail suffisait à faire un DELETE sur `comptes` via la clé service.
  - Après : si Supabase est configuré, session Bearer valide exigée (**401** sinon, **aucun DELETE exécuté**) ; l'e-mail supprimé est **celui de la session**, jamais celui du corps (403 si le corps en fournit un différent) ; Supabase non configuré → accusé sans effet de bord, identique à avant.
  - Client : `src/app/reglages/page.tsx` envoie le jeton de session quand il existe (la suppression locale des données, elle, reste inconditionnelle comme avant).
  - Tests : 6 cas dans `tests/api-sync-auth.test.ts` (401 sans jeton/invalide + compteur d'appels REST à 0 ; 200 authentifié avec `email=eq.<e-mail de session>` ; 403 e-mail du corps différent ; 200 e-mail identique ; non configuré → inchangé).
- 2026-11-20 13:35 — **Correctif 3 — crash parseur « dans 999999999 jours »** ✅ (commit `998d317`) :
  - Avant : `date: "NaN-NaN-NaN"` → `RangeError` Intl dans `formatDayShort` → écran d'erreur.
  - Après (`src/lib/parser.ts`) : quantité `n` plafonnée à **500 unités** (`MAX_RELATIVE_UNITS`) + la date produite est validée (`isValidISODate`) ; au-delà, les mots restent dans le titre et la date vaut aujourd'hui — **aucune date NaN possible**. « dans 2 semaines », « dans 3 jours », « dans 3 sem », « dans 500 jours » : inchangés.
  - Tests : 7 cas dans `tests/parser.test.ts` + 4 assertions dans `scripts/test-parser.mjs` (999999999, 501, 500, 2 semaines).
- 2026-11-20 13:35 — **Correctif 4 — hooks conditionnels `event-block.tsx`** ✅ (même commit) :
  - Constaté : le problème existe ENCORE après la refonte Paillette (les deux `return null` étaient toujours avant les 12 hooks, lignes 44/48).
  - Après : retours précoces déplacés APRÈS tous les hooks (ordre des hooks identique à chaque rendu, visible ou masqué).
  - Note honnêteté : en jsdom/React 18.3.1, un `return null` qui saute les 12 hooks d'un coup ne lève pas « fewer hooks » dans les cycles simples testés (le crash vient des exécutions partielles et des chemins concurrents de prod) — le test exigé par la mission (bloc masqué puis réaffiché, sans erreur, + mise à jour de store entre-temps) est vert : `tests/event-block-hooks.test.tsx` (2 cas).
- 2026-11-20 13:35 — **Gain rapide 5 — `repeat: 'mois'` sur un 31** ✅ (même commit) :
  - Avant : événement du 31 absent des mois courts (février, avril…).
  - Après (`src/lib/events.ts`) : même règle que `addMonthsISO` — clamp au dernier jour du mois cible (31 mars → 30 avril, 28/29 février). **Une assertion existante (`tests/events.test.ts`) encodait l'ancien comportement buggy (absent le 28 février) : elle est corrigée en « présent » conformément au gain 5 demandé ; aucun autre test touché.**
  - Tests : 3 nouveaux cas (31 → fév/avr, 29 février bissextile → 2025-02-28 et 2028-02-29, mois normal) + 3 assertions dans `test-parser.mjs`.
- 2026-11-20 13:35 — **Gain rapide 6 — sanitation des payloads distants** ✅ (même commit, `src/lib/sync.ts`) :
  - Avant : `applyPayload` et `pullSync` faisaient un `setState` avec les tableaux distants tels quels.
  - Après : `sanitizeEvents` / `sanitizeTasks` / `sanitizeSettings` (les mêmes sanitizers que la sauvegarde locale et que `merge`) appliqués item par item ; champ non tableau → état local conservé ; `updatedAt` non numérique → snapshot ignoré.
  - Tests : `tests/sync-sanitize.test.ts` — 5 cas (payload Supabase malformé réparé, payload valide tel quel, snapshot Stripe malformé, snapshot valide, `updatedAt` non numérique).
- 2026-11-20 13:35 — `npx tsc --noEmit` ✅ · `npm test` ✅ **263/263** (21 fichiers : 233 existants intacts + 30 nouveaux) · `npm run test:parser` ✅. Push des 2 commits sur `vibe/bouclier-correctifs`.
- 2026-11-20 14:40 — **Validation bloquante finale** ✅ :
  - `npx tsc --noEmit` ✅ · `npm test` ✅ **263/263** (21 fichiers, 233 existants intacts + 30 nouveaux) · `npm run test:parser` ✅ · `npm run build` ✅ (Next.js 14.2.35, toutes les routes compilées).
  - **Smoke `next start` (port 3100)** : toutes les pages en **200** (`/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages`, `/voix`, `/bienvenue`, `/demo`, `/offres`, `/cgu`, `/inscription`, `/contact`, `/presse`, `/legal`, `/confidentialite`, `/onboarding`, `/robots.txt`, `/sitemap.xml`).
  - Sans backend configuré (dev local) : `GET /api/sync?customerId=…` → 200 `{"snapshot":…}` (repli mémoire inchangé), `POST /api/sync` payload incomplet → **400** propre, payload complet → 200 `{"ok":true}`, `POST /api/compte/suppression` → 200 `{"ok":true,"serverDeleted":false,"reason":"aucun compte serveur configure a ce jour"}` (comportement d'avant, aucun effet de bord).
  - **Avec `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` configurés** (smoke avec valeurs bidons) : `GET` et `POST /api/sync` sans jeton → **401** `{"error":"Session invalide ou absente : synchronisation refusée."}` ; `POST /api/compte/suppression` sans jeton → **401** `{"ok":false,"serverDeleted":false,"error":"session_requise"}` (aucun DELETE) ; faux Bearer → **401**. Rate-limit : après 20 requêtes/IP sur `/api/sync` → **429** + `Retry-After` + `Cache-Control: no-store`.
  - « Authentifié accepté » : couvert par les tests unitaires (fetch mocké, 13 cas dans `tests/api-sync-auth.test.ts` : session valide → 200 lecture/écriture, e-mail correspondant → OK, e-mail différent → 403).
- 2026-11-20 14:46 — **Sync `origin/main`** : `git fetch origin` → `origin/main` toujours à `33588e2` (base de la branche), aucun merge nécessaire, aucun conflit. Branche à jour, poussée.
- 2026-11-20 14:46 — **PR #27** mise à jour (corps avant/après complet) : https://github.com/User313MSI/Centeryou/pull/27 — **brouillon, non fusionnée** (Vibe Work fusionnera).
- 2026-11-20 14:46 — **M-08 terminée.** Aucun comportement produit visible modifié (repli mémoire dev inchangé, suppression locale inchangée, interface 100 % FR, tokens inchangés, zéro dépendance ajoutée, `package.json` intact). En attente revue/merge par Vibe Work. Ne rien anticiper sur M-04.
