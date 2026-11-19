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
- 2026-11-15 15:56 UTC — **Étape 2 : mémoïsations (🟪 audit Alpha)** ✅. `aujourdhui-view.tsx` : tri sur copie (`sortedTodayTasks = useMemo(() => [...todayTasks].sort(...))`) — le tableau mémoïsé n'est plus muté dans le render. `week-view.tsx` : `days` + `instancesByDay` (Map mémoïsée, `calendarOnDate` × 7 au lieu de recalcul à chaque rendu) + `hours` mémoïsés. `month-view.tsx` : `weeks` + `eventsByDay` (Map mémoïsée, `calendarMonthOnDate` × 42 en un seul passage). `welcome-sequence.tsx` : `todayCount` mémoïsé aussi.
- 2026-11-15 15:57 UTC — **Étape 3 : contraste WCAG du teal texte** ✅. `design/tokens.ts` : nouveau token `voiceText: '#0F9B8E'` (var CSS `--c-voicetext`, classe `text-voicetext`, mêmes valeurs clair/sombre — seule exception autorisée aux tokens ; `#2DD4BF` inchangé pour les éléments graphiques). Appliqué aux textes : pourcentage de progression (`progress-bar.tsx`, `welcome-sequence.tsx`), compteurs de la semaine (`welcome-sequence.tsx`), « Lecture en cours… » (`welcome-sequence.tsx`), « Écoute en cours » (`voice-fab.tsx`), action des toasts (`toast.tsx`). Vérifié dans le build : `--c-voicetext: 15 155 142` injecté dans `:root` ET `.dark`, classe `.text-voicetext` générée.
- 2026-11-15 15:58 UTC — **Étape 4 : accessibilité** ✅. `tabs.tsx` : `role="tablist"` complété — `id="tab-<id>"`, `aria-controls="tabpanel-<id>"`, roving tabindex, navigation ←/→/Home/End (activation au focus) ; panneaux `role="tabpanel"` + `aria-labelledby` ajoutés dans `planning/page.tsx` et `taches/page.tsx`. `welcome-sequence.tsx` : focus initial à l'ouverture, piège de focus (Tab en boucle), Échap en capture (ferme toujours, même hors focus), restauration du focus et `overflow` restaurés à la fermeture — même pattern que `ui/dialog.tsx`. `app-shell.tsx` : les raccourcis globaux (n/t/v/1-3/?) restent inertes tant qu'une modale `aria-modal="true"` est ouverte.
- 2026-11-15 15:59 UTC — **Étape 5 : fluidité perçue + micro-textes FR** ✅. Squelettes de chargement courts (opacité seule, donc compatibles `prefers-reduced-motion` global) : écran d'hydratation (`app-shell.tsx`) et « Chargement du compte… » (`account-section.tsx`) ; transitions existantes conservées telles quelles (transform/opacity). Micro-textes : « Ton prochain rendez-vous aujourd’hui » au singulier (`welcome-sequence.tsx`) ; séparateur vocal « . Et . » (`voice-commands.ts`) ; événement finissant à 00:00 accepté (`endMinutesOf()` dans `dates.ts` : 00:00 = 24h00, utilisée dans `event-dialog.tsx`, `events.ts#overlaps`, `event-block.tsx`, `store.ts#moveEvent`, `use-event-actions.ts`, filtre « à venir » de `welcome-sequence.tsx`).
- 2026-11-15 16:00 UTC — **Vérifications finales** ✅ : `npx tsc --noEmit` ✅ · `npm run build` ✅ (23 pages) · `npm test` ✅ **139/139** (12 fichiers, aucun supprimé) · `npm run test:parser` ✅ · smoke loopback `next start` : `/`, `/aujourdhui`, `/planning`, `/taches`, `/reglages`, `/voix`, `/bienvenue`, `/demo`, `/offres`, `/cgu`, `/inscription` → tous 200. **Poids final mesuré** : landing `/` = **15 chunks, 572 Ko** contre **17 chunks, 824 Ko** en baseline → **−252 Ko (−30 %)**, objectif ≥ 150 Ko dépassé ; le chunk Supabase (`879-….js`, 188 Ko) existe toujours mais n'est téléchargé qu'à l'activation de la sauvegarde en ligne.
- **Interdits respectés** : aucune fonctionnalité nouvelle, pas de barre latérale, aucune variable d'environnement renommée, `next.config.mjs` et routes `/api/*` inchangés (voir `git status`), tokens inchangés sauf l'exception teal `#0F9B8E`, interface 100 % française.

## PR

- **PR finale (ready for review)** : https://github.com/User313MSI/Centeryou/pull/20 — base `main`, head `vibe/lynx-fluidite-00d765`. Brouillon ouvert dès la première étape, poussé à chaque étape, passé en revue à la fin avec le bilan mesuré.
