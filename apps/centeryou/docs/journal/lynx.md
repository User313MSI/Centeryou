# Journal — Lynx

## Lynx — 2026-11-15 — Mission : fluidité maximale & finitions UI

**Mission** : alléger le premier chargement de la landing (client Supabase en import dynamique,
uniquement quand l'utilisateur active la sauvegarde en ligne — objectif ≥ 150 Ko), corriger les
points 🟪 de `docs/AUDIT-2026-11.md` d'Alpha (tri mutant du tableau mémoïsé, `calendarOnDate`
appelé par jour, `calendarMonthOnDate` × 42 → mémoïser), contraste WCAG du teal texte
(`#0F9B8E` pour les textes, `#2DD4BF` gardé pour les éléments graphiques — seule exception
autorisée aux tokens), accessibilité (navigation flèches + `aria-controls` sur les onglets,
piège de focus + Échap fiable sur la séquence d'accueil), fluidité perçue (squelettes de
chargement courts, transitions conservées en transform/opacity, `prefers-reduced-motion`
partout) et micro-textes FR (« Tes 1 prochains rendez-vous », « . Et . » dans les commandes
vocales, événement finissant à 00:00 accepté).

**Interdits respectés** : aucune fonctionnalité nouvelle, pas de barre latérale, aucune variable
d'environnement renommée, `next.config.mjs` et les routes API non touchés, tokens inchangés
sauf l'exception teal, interface 100 % française.

**Branche** : `vibe/lynx-fluidite-ui-ad7213` (base `main`).
**PR** : https://github.com/User313MSI/Centeryou/pull/18 (brouillon, base `main`).

## Mesures de référence (avant, build du 2026-11-15 sur `main`)

- Chargement initial de `/` (layout + page, manifest de build) : **704,9 kB en 15 fichiers** JS
  (+ 35,3 kB CSS), dont le chunk `639-*.js` de **185,0 kB** et le chunk `44530001-*.js` de
  **67,2 kB**, tous deux issus de `@supabase/supabase-js` (GoTrueClient / realtime / storage),
  chargés via `/layout` donc pour **tous** les visiteurs, landing comprise.
- `npm run build` ✅ — `npm test` ✅ **139/139** (12 fichiers) — `npm run test:parser` ✅.

## Avancée

- 2026-11-15 — Création de la branche `vibe/lynx-fluidite-ui-ad7213` depuis `main`, build de
  référence + mesure du poids initial de la landing (voir ci-dessus), ouverture du PR brouillon.
- 2026-11-15 08:10 UTC — **Étape 1 : Supabase en import dynamique** ✅.
  - `src/lib/supabase.ts` : `import type` uniquement (aucun runtime) ; `getSupabase()` devient
    asynchrone et fait `await import('@supabase/supabase-js')` (mémoïsé, avec remise à zéro en
    cas d'échec du chunk) ; nouveau `hasStoredSession()` (détection bon marché de la clé
    `sb-*-auth-token` dans le localStorage, sans charger Supabase).
  - `src/lib/auth-store.ts` : tous les appels `await getSupabase()` ; `init()` ne charge le
    client **que si une session est déjà persistée** (visiteur anonyme / landing : rien n'est
    téléchargé) ; `ensureAuthListener()` enregistre une seule fois `onAuthStateChange` ;
    `signIn`/`signUp` branchent la synchro eux-mêmes (connexion = activation de la sauvegarde
    en ligne) avec garde anti double exécution d'`afterSignIn`.
  - `src/lib/sync.ts` : `fetchBackup`/`pushBackup`/`syncNow` awaitent le client (atteints
    uniquement avec un compte connecté).
  - **Mesure après** : chargement initial de `/` = **457,5 kB en 13 fichiers** (422,3 kB JS),
    contre 704,9 kB en 15 fichiers avant → **−247,4 kB (−35 %)**, objectif ≥ 150 Ko ✅.
    Les chunks Supabase (`879-*.js` 191,4 kB + `44530001-*.js` 68,8 kB, soit ~260 kB) ne figurent
    plus dans le manifest initial d'**aucune** page : chargés uniquement à la demande.
  - Vérifs : `npx tsc --noEmit` ✅, `npm run build` ✅, `npm test` ✅ **139/139**,
    `npm run test:parser` ✅. Push de l'étape.
