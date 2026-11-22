# Journal — Cinéaste

## Mission M-21 — Le film ENFIN propre à l'écran (fix affichage site, ordinateur)

Agent : **Cinéaste**. Branche : `vibe/cineaste-film-propre` (base `main` `e84722a`, inscription M-21 publiée sur `main` à `d56f14b` avant de coder). PR : — (ouverte en brouillon dès le premier push, base `main`).

### Références lues avant de coder
- `AGENTS.md`, `docs/MISSIONS.md` (section M-21), tout `docs/journal/` — en particulier **realisateur.md** (M-06 : le film), **accord.md** (M-20 : fondu croisé + layout colonne + bouton « Activer le son »), **paillette.md** (M-05 : `animate-view-in` sur le `<main>`, classe `animations-off`), **sourire.md** (M-10), **diapason.md** (M-16 : nappe).
- Code : `src/components/today/launch-film.tsx`, `src/lib/launch-film.ts`, section `.film-*` de `src/app/globals.css`, `tests/launch-film.test.tsx`, `tests/welcome-sequence.test.tsx`, `src/components/layout/app-shell.tsx` (lu uniquement : le `<main className="animate-view-in …">`).

### Méthode de preuve (captures d'écran RÉELLES, headless)
- App lancée en **production** (`next build` + `next start`, port 3200) depuis la branche.
- Navigateur : **Chrome 157 headless** piloté par **CDP** (WebSocket natif Node 24, zéro dépendance ajoutée) — script `cdp.mjs` conservé hors dépôt. `Emulation.setDeviceMetricsOverride` pour des tailles exactes : **1920×1080, 1366×768, 1440×900, 320×700**.
- Déclenchement du film : amorçage du `localStorage` (`centeryou-v1`, `launchFilm: 'always'`, `welcomeSequence: 'always'`, `onboarded: true`, prénom « Camille » + 2 événements et 2 tâches du jour) injecté via `Runtime.evaluate` sur l'origine, puis rechargement de `/aujourdhui` — le film se lance tout seul (bouton « Activer le son » visible, voix non déclenchée sans geste, comme en production).
- Captures `Page.captureScreenshot` des **5 scènes** + d'une **transition** (fondu croisé, +350 ms après le changement) à **chaque taille**, plus mesure DOM à chaque capture : rect du `.film-root`, `scrollWidth/Height` du document, débordement relatif de chaque `.film-scene` par rapport au conteneur de scènes.
- **Aucune image n'est committée** : les PNG restent hors du dépôt (`Documents/cineaste-shots/`, non suivis) ; ce journal décrit ce que l'on y voit, scène par scène et taille par taille, avec les chiffres.

### Baseline mesurée (main e84722a, 2026-11-22)
- `npm test` : **543/543** ✅ (32 fichiers) · `npx tsc --noEmit` ✅ · `npm run build` ✅ (23 routes).

---

## Diagnostic REPRODUIT en conditions réelles (code de main, captures `before/`)

Trois défauts mesurés, tous visibles sur les captures headless :

1. **Le film n'est PAS plein écran** — cause racine trouvée : le `<main>` de `app-shell.tsx` a la classe `animate-view-in` (`animation: view-in … both`, keyframe final `transform: translateY(0)` ≠ `none`) → `translateY(0)` retenu par le fill-mode `both` fait de `<main>` le **containing block des descendants `fixed`**. Le `.film-root fixed inset-0` est donc calé dans `<main>` (max-w 1100 px, sous la barre de nav), pas dans le viewport.
   - Mesures : à 1920×1080, `.film-root` = x 402,5 → 1502,5, y 65 → **2006** (viewport 1080 !) → le film **dépasse de l'écran de 926 px en bas**, `document.scrollHeight` = 2065, barre de défilement visible. À 1366×768 : root y 65 → 2006 (dépasse de 1238 px). À 320×700 : root y 57 → **2511** (dépasse de 1811 px). C'est exactement le « découpé / dépasse de l'écran » du testeur : le contenu des scènes est rogné par la boîte du film et le bas (sous-titres compris) part sous l'écran.
2. **Scène « La magie » : la carte « Carte créée » est INVISIBLE** — la branche `card` rendait `<div className="film-scene …">` seul, et `.film-scene` posé seul vaut `opacity: 0; filter: blur(12px)` (seule `.film-scene-on` rend visible). Capture `before/s4_*.png` : seul le titre « La magie » est visible, aucun contenu dessous. Mesure : la branche carte dépasse en plus de **114,7 px en haut** / 9,3 px en bas du conteneur (non rogné).
3. **Fondu croisé imparfait** — `.film-scene-off` (absolute, inset 0) restait montée 720 ms ; mesurée à **+12 px en haut / +8 px en bas** hors du conteneur pendant la transition. De plus, les scènes étant remontées par React (key) à chaque changement, les `transition` CSS ne jouent jamais sur un nœud fraîchement monté : dans un vrai navigateur il n'y avait aucun fondu réel (coupure sèche), contrairement à ce que les classes suggéraient.

## Correctifs (zone étanche tenue)

- `src/components/today/launch-film.tsx` :
  1. **Portail** `createPortal(…, document.body)` — le film est un dialogue modal plein écran ; rendu dans `document.body` (sans transform), `fixed inset-0` redevient plein écran réel à toutes les tailles.
  2. Branche « carte » de `SceneMagic` : `className="film-scene film-scene-on …"` — la carte et son texte d'aide sont visibles et animées (keyframe d'entrée comme les scènes).
  3. Conteneur de scènes : `overflow-hidden p-6` ajouté (centrage `m-auto` conservé) — la scène fondante en `absolute` est rognée au conteneur, **aucun débordement possible** ; le `p-6` (24 px) laisse passer le halo pulsant (`box-shadow` 24 px) sans le rogner.
- `src/app/globals.css` (section `.film-*` uniquement) :
  - `.film-scene-on` : `z-index: 1` + `animation: film-scene-in 650ms … both` (keyframe d'entrée — joue même sur nœud remonté) ;
  - `.film-scene-off` : `z-index: 0` + `animation: film-scene-out 720ms … both` — l'ancienne scène fond **sous** la nouvelle, jamais nette par-dessus ;
  - keyframes `film-scene-in` / `film-scene-out` ajoutées. `prefers-reduced-motion` / `html.animations-off` tuent ces animations via les blocs globaux existants (0,01 ms) : version statique instantanée conservée.
- `tests/launch-film.test.tsx` : **+1 test** « M-21 — la carte « Carte créée » reçoit la variante visible `film-scene-on` » + garde-fou (aucun `.film-scene` rendu seul). 2 requêtes existantes ajustées (`container.` → `document.`) — **justifié** : le film est désormais portalé dans `document.body`, `container` (le div de rendu RTL) ne le contient plus ; `screen`/`document` le voient. Aucun test supprimé, aucun comportement de test modifié.
- `src/lib/launch-film.ts` : **aucune modification** (la logique pure était correcte ; relu, inchangé).

## Validation

- `npm test` : **544/544** ✅ (543 base main + 1 nouveau M-21 ; 0 supprimé) · `npx tsc --noEmit` ✅ · `npm run test:parser` ✅ · `npm run build` ✅ (voir ci-dessous pour le détail) · `git diff --name-only` = uniquement la zone (voir PR).

*(Preuves d'écran APRÈS correctif et détail scène par scène / taille par taille : section suivante, remplie après les captures `after/`.)*
