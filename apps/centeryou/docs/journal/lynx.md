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
- 2026-11-15 08:12 UTC — **Étape 2 : corrections 🟪 de l'audit** ✅.
  - `aujourdhui-view.tsx` : le tri est déplacé **dans le `useMemo`** (le `filter` renvoie un
    nouveau tableau) — le tableau mémoïsé n'est plus muté pendant le rendu.
  - `week-view.tsx` : `days` mémoïsé + `dayInstances` mémoïsé (`calendarOnDate` n'est plus
    appelé au rendu pour chaque jour).
  - `month-view.tsx` : `weeks` mémoïsé + `cells` mémoïsé (`calendarMonthOnDate` n'est plus
    appelé × 42 au rendu).
- 2026-11-15 08:12 UTC — **Étape 3 : contraste WCAG du teal texte** ✅.
  - `design/tokens.ts` : nouveau token `voiceText: '#0F9B8E'` (seule exception autorisée ;
    tous les autres tokens inchangés), ajouté à `colors`, `darkColors`, `colorsDark` et
    `colorVarNames` (`voicetext`) → classe `text-voicetext`, injectée dans `:root` et `.dark`
    par `layout.tsx` (vérifié dans le HTML pré-rendu : `--c-voicetext: 15 155 142`).
  - `text-voice` → `text-voicetext` uniquement sur les **textes** : pourcentage de progression
    (`progress-bar.tsx`), « {dayPct} % » et compteurs de la semaine et « Lecture en cours… »
    (`welcome-sequence.tsx`), action des toasts (`toast.tsx`), « Écoute en cours »
    (`voice-fab.tsx`). `#2DD4BF` (`text-voice`, `bg-voice`, `border-voice`, `ring-voice`)
    reste pour tous les **éléments graphiques** (icônes, barres, pastilles).
- 2026-11-15 08:13 UTC — **Étape 4 : accessibilité** ✅.
  - `ui/tabs.tsx` : navigation clavier WAI-ARIA (Flèche droite/gauche en boucle, Home/Fin,
    activation automatique), `tabIndex` itinérant, `id` + `aria-controls="tab-panel-<id>"` ;
    panneaux correspondants `role="tabpanel"` + `aria-labelledby` dans `planning/page.tsx`
    et `taches/page.tsx`.
  - `welcome-sequence.tsx` : focus initial dans le panneau à l'ouverture, **piège de focus**
    (Tab) et **Échap fiable** (écouté sur `window` en capture, même si le focus est dehors),
    `overflow` du body verrouillé, focus restitué à la fermeture — même pattern que
    `ui/dialog.tsx`. `app-shell.tsx` : les raccourcis globaux (n/t/v/1/2/3/?) sont inactifs
    tant qu'une fenêtre `aria-modal` est ouverte.
- 2026-11-15 08:13 UTC — **Étape 5 : micro-textes FR** ✅.
  - `voice-commands.ts` : jonction des segments vocaux en « . Et . » (pauses nettes à l'oral).
  - `event-dialog.tsx` : une fin à **00:00 est acceptée** (comptée comme 24 h) pour la
    validation et le calcul de chevauchement (`24:00` transmis à `findConflict`).
  - « Tes 1 prochains rendez-vous » : déjà conforme dans `welcome-sequence.tsx`
    (toujours au pluriel) — vérifié, aucun changement nécessaire.
- 2026-11-15 08:14 UTC — **Étape 6 : fluidité perçue** ✅.
  - `app-shell.tsx` : écran de chargement pré-hydratation avec **squelette court**
    (3 blocs `animate-pulse`, opacité seule, `aria-busy` + « Chargement… » en sr-only).
  - `globals.css` : `prefers-reduced-motion` couvre désormais aussi `animation-delay` et
    `transition-delay` (0 ms) — tout est instantané partout, y compris les sections de la
    séquence d'accueil qui avaient un `animationDelay`.
  - Transitions existantes conservées telles quelles (aucune nouvelle propriété animée ajoutée).

## Vérification finale (2026-11-15)

- `npx tsc --noEmit` ✅ · `npm run build` ✅ (23 pages statiques) · `npm test` ✅ **139/139**
  (12 fichiers, aucun test supprimé) · `npm run test:parser` ✅
- **Poids mesuré** (manifest de build, `/` = layout + page) :
  avant **704,9 kB / 15 fichiers** → après **458,6 kB / 13 fichiers** = **−246,3 kB (−35 %) au
  premier chargement**, objectif ≥ 150 Ko ✅. Les ~260 kB de `@supabase/supabase-js`
  (`879-*.js` 191,4 kB + `44530001-*.js` 68,8 kB) ne sont plus dans le manifest initial
  d'aucune page : import dynamique déclenché uniquement à la connexion d'un compte
  (ou si une session `sb-*-auth-token` est déjà persistée).
- Smoke test sur le HTML pré-rendu : landing OK (« Ton planning qui te parle »), squelette de
  chargement présent (`aria-busy`, `animate-pulse`), `--c-voicetext` injecté dans les deux thèmes.
- Contraintes respectées : aucune fonctionnalité ajoutée, pas de barre latérale, aucune
  variable d'environnement renommée, `next.config.mjs` et routes API non touchés, tokens
  inchangés sauf l'exception teal `voiceText`, interface 100 % française.

## Liens

- PR : https://github.com/User313MSI/Centeryou/pull/18 (brouillon, base `main`,
  head `vibe/lynx-fluidite-ui-ad7213`)
