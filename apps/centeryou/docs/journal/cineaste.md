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

- `npm test` : **544/544** ✅ (543 base main `e84722a` + 1 nouveau test M-21 ; **0 supprimé**) · `npx tsc --noEmit` ✅ · `npm run test:parser` ✅ · `npm run build` ✅ (23 routes — 1ʳᵉ tentative en faux échec d'infrastructure connu/documenté (`ENOENT` collecte de pages, tests verts), **relancée une fois avant diagnostic** : la relance passe) · branche resynchronisée sur `main` (rebase, 0 conflit), tests rejoués : 544/544 ✅.
- `git diff --name-only` (branche vs main) : `src/components/today/launch-film.tsx`, `src/app/globals.css`, `tests/launch-film.test.tsx`, `docs/journal/cineaste.md` — **uniquement la zone** (+ MISSIONS.md publié séparément sur main, règle du canal). `src/lib/launch-film.ts` relu, **inchangé**. `package.json`/lock inchangés, aucun binaire, aucune image committée.

---

## Preuves d'écran APRÈS correctif (captures `after/`, mêmes méthode et tailles)

**Mesures communes à toutes les tailles** : `.film-root` = exactement le viewport (0,0 → 1920×1080 / 1366×768 / 1440×900 / 320×700 — avant : 1100 px de large, jusqu'à y=2006/2511 hors écran). Zone centrale : `scrollHeight == clientHeight` partout (avant : contenu fantôme faisait défiler). Débordement de chaque `.film-scene` par rapport au conteneur de scènes : **aucun positif** (tous à −24 px = à l'intérieur, rognage `overflow-hidden` jamais atteint). exactly **1** `.film-caption` partout. Scène 4 : **2** `.film-scene-on` (la scène + la carte « Carte créée » désormais visible).

| Taille | Scène 1 (ouverture) | Scène 2 (Ta journée) | Scène 3 (progression) | Scène 4 (La magie) | Scène 5 (signature) | Transition |
|---|---|---|---|---|---|---|
| 1920×1080 | monogramme + « Bonjour, Camille » + date centrés, rien ne dépasse | 3 compteurs + carte « Prochaine étape » à halo, centrés | anneau 50 % + pastilles + texte | **carte « CARTE CRÉÉE — Réunion équipe · 10h00 · Travail » VISIBLE + halo + texte d'aide**, sous-titre en bas | signature centrée | une seule scène lisible, l'ancienne fond dessous (z-index 0), 0 débordement |
| 1366×768 | idem, plein écran 1366×768 | idem | idem | idem, carte visible | idem | idem (−5,8/−10,2 px = intérieur) |
| 1440×900 | idem | idem | idem | idem, carte visible | idem | idem |
| 320×700 | idem, plein écran 320 px | 3 cartes côte à côte lisibles (2 / 1 / 3 h), carte prochaine étape, rien ne dépasse | idem | **carte visible**, titre + carte + aide + sous-titre tiennent dans 700 px (zone scrollH = clientH = 517) | idem | idem |

Détail visuel (captures `after/s1..s5_<taille>.png`, `after/transition_<taille>.png`) :
- **Scène 1** : fond nuit plein écran avec halos/particules, barre du haut (« Activer le son » à gauche, « Passer » à droite), monogramme d'ondes, « Bonjour, Camille », « Dimanche 22 novembre » centrés verticalement et horizontalement (m-auto conservé), sous-titre « Bonjour, Camille. Nous sommes le Dimanche 22 novembre. » en bas dans le flux.
- **Scène 2** : « Ta journée » + 3 cartes (2 événements / 1 tâche à faire / 3 h planifié) + carte « Prochaine étape — Réunion équipe, 10h00–11h00 · Travail » à halo pulsant ; à 320 px les 3 cartes tiennent (≈75 px chacune), labels wrappés proprement.
- **Scène 3** : « Ta progression », anneau animé 50 %, 7 pastilles (aujourd'hui en surbrillance), « Série de 1 jour organisés d'affilée. Tu avances bien, bravo. ».
- **Scène 4 « La magie »** : après la machine à écrire, la **carte « CARTE CRÉÉE » apparaît en fondu (film-scene-in) avec son halo**, suivie du texte « Dis-la à voix haute, ou écris-la dans l'ajout rapide — elle devient un événement. » — **avant M-21 cette carte était invisible (opacity 0)** et débornait de 114 px.
- **Scène 5** : « Ton planning qui te parle. / Bonne journée, Camille. » + monogramme.
- **Transition** (capturée à +350 ms du changement de scène, 720 ms de fondu) : une seule scène lisible à la fois ; l'ancienne est sous la nouvelle (z-index 0 vs 1) et fond en 720 ms, sans jamais rester nette par-dessus, et sans déborder du conteneur (mesuré : −5,8 px haut / −10,2 px bas = à l'intérieur).

**Hors zone, noté sans toucher** : la carte PWA « Installer Centeryou » (composant `install-prompt`, z-index au-dessus du film) peut chevaucher le bas du film à 320 px — présente avant M-21, hors de ma zone, annulable (×).

### Comportements vérifiés sans régression (tests + code)
« Passer » toujours visible (haut droite) · Échap (capture) · clic hors zone (`data-film-keep`) · piège de focus sur le dialogue · sous-titres permanents en bas, un seul, dans le flux · `prefers-reduced-motion` / animations off → panneau statique `film-static` (keyframes tuées par les blocs globaux 0,01 ms) · réglages « Film de lancement » (3 modes) + « Voix du film » · bouton « Activer le son » discret non bloquant (visible sur toutes les captures) · double verrou de fréquence · lazy loading du film · voix = un seul `speak` du brief. Tests : 544/544 (dont tous les tests M-06/M-20 du film, inchangés sauf les 2 requêtes `container` → `document` justifiées par le portail).

### Suivi
- 2026-11-22 ~05:45 UTC — branche `vibe/cineaste-film-propre` créée depuis `main` e84722a ; inscription M-21 publiée sur `main` (d56f14b).
- ~06:10 UTC — diagnostic reproduit en headless (captures `before/` + mesures), correctifs codés, 544/544 tests, tsc, build (après 1 relance du faux échec infra), commit `b85ad7c` poussé, **PR #45 ouverte en brouillon** (base main) ; MISSIONS.md mis à jour sur main (6b7b701).
- ~06:35 UTC — preuves d'écran APRÈS livrées (captures `after/` + mesures ci-dessus, 5 scènes + transition × 4 tailles), branche resynchronisée sur main (rebase 24e78d9, 0 conflit), tests rejoués 544/544, tsc ✅. PR : **https://github.com/User313MSI/Centeryou/pull/45** (brouillon).
- ~06:55 UTC — vérification de propreté : un 500 sur `/` observé en smoke venait d'un `.next` pollué par le serveur dev lancé en parallèle dans le même worktree (artefact d'environnement, pas du code) — après arrêt du dev et **rebuild propre** : smoke **11/11 routes en 200** (`/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages`, `/voix`, `/demo`, `/bienvenue`, `/onboarding`, `/presse`, `/offres`) et re-capture scène 4 à 1920×1080 sur ce build propre : `.film-root` = viewport exact, 2 `film-scene-on` (scène + carte « Carte créée » visible). Le code de main pristine servant `/` en 200 dans le même environnement, aucune régression attribuable au diff.
