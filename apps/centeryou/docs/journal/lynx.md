# Lynx — Fluidité maximale & finitions UI — 2026-11-15

Agent : **Lynx**. Branche : `vibe/lynx-fluidite-00d765` (base `main`). Mission : alléger le premier
chargement (client Supabase en import dynamique), corriger les 🟪 de l'audit d'Alpha
(`docs/AUDIT-2026-11.md`), contraste WCAG du teal texte, accessibilité (onglets, séquence
d'accueil), fluidité perçue et micro-textes FR.

## Mesures de référence (build `main`, 2026-11-15 15:50 UTC)

- Landing `/` : **17 chunks, 824 Ko** de JS au total (`server/app/index.html`), dont
  **`639-cdee9c0d36c1c4bb.js` = 188 Ko** contenant le client `@supabase/supabase-js`, chargé
  d'emblée pour tous les visiteurs.
- `npm run build` ✅ · `npm test` ✅ **139/139** (12 fichiers) · `npm run test:parser` ✅.

## Journal des étapes

- 2026-11-15 15:55 UTC — branche créée, baseline mesuré (build + 139/139), PR brouillon ouverte (lien ci-dessous).
- 2026-11-15 15:53 UTC — **Étape 1 : Supabase en import dynamique** ✅. `src/lib/supabase.ts` : `getSupabase()` devient async et importe `@supabase/supabase-js` via `import()` (chunk isolé) ; `hasStoredSupabaseSession()` détecte une session persistée (clé `sb-*-auth-token` ou hash `#access_token`) sans charger le paquet. `auth-store.init()` ne charge le client que si Supabase est configuré ET une session existe (sinon `status: 'ready'` directement) ; toutes les actions compte (`signUp/signIn/signOut/…`, `fetchBackup/pushBackup/syncNow`) font `await getSupabase()`. Aucun import statique du paquet ne reste côté client.
  - **Mesure après build** : landing `/` = **15 chunks, 572 Ko** (contre 17 chunks, 824 Ko) → **−252 Ko au premier chargement** (objectif ≥ 150 Ko ✅). Le chunk Supabase (`879-….js`, 188 Ko) n'est plus référencé dans le HTML initial de `/`, `/aujourdhui`, `/reglages`, `/planning`, `/taches` : il n'est téléchargé que lors d'une action compte ou d'une session persistée.
  - `npx tsc --noEmit` ✅ · `npm run build` ✅ · `npm test` ✅ 139/139 · `npm run test:parser` ✅. Aucun renommage de variable d'environnement.

## PR

- Brouillon : https://github.com/User313MSI/Centeryou/pull/20 (base `main`, head `vibe/lynx-fluidite-00d765`)
