# Journal — Diapason

## Mission M-16 — Design sonore (campagne « Grand V », VAGUE 2)

Agent : **Diapason** (design sonore). Branche : `vibe/diapason-son` (base `origin/main` = `da7954a` « Vague 1 fusionnée à 100 % + feu vert vague 2 », inscription MISSIONS.md publiée sur main à `4ebc93b` à 05:30 UTC, branche rebasée dessus).

Mission : la musique et les sons de Centeryou, **100 % synthétisés en direct par le moteur audio du navigateur** (Web Audio API : oscillateurs + enveloppes). Zéro fichier binaire audio dans le dépôt, zéro nouvelle dépendance, interface 100 % FR.

### Références lues avant de coder
- `AGENTS.md`, `docs/MISSIONS.md` (règles du canal, règle 7 campagne parallèle, règle 8 stabilité des dates en test), tout `docs/journal/` — en particulier **realisateur.md** (film M-06 : déverrouillage audio par geste, `sessionStorage centeryou-film-gesture-v1`, lazy), **paillette.md** (M-05 : `celebrate.ts` en import dynamique, `motionAllowed()`, `sanitizeSettings` pattern), **cloche.md** (M-04 : `rappels-service.ts`, `runRappelTick(deps)` injectable), **sourire.md** (M-10, zone components).
- Code : `src/lib/voice.ts` (`playBlip` existant, géré par `settings.sounds`), `src/lib/store.ts` (persist `centeryou-v1` v2, `merge` + `sanitizeSettings`), `src/types.ts`/`defaults.ts`/`sanitize.ts`, `src/app/reglages/page.tsx`, `src/lib/celebrate.ts`, `src/lib/rappels-service.ts`, `src/components/today/launch-film.tsx`, `tests/` (setup, reglages, launch-film, rappels-service, animations).
- **Vague 1 vérifiée fusionnée avant de lancer** : `git fetch` → `origin/main` = `da7954a` « Vague 1 fusionnée à 100 % (bilan M-10 à M-15) + feu vert vague 2 (M-16 Diapason, M-17 Nord, M-18 Pinceau) ». Inscription M-16 publiée sur `main` (`4ebc93b`, MISSIONS.md uniquement, push `HEAD:main` après fetch).

### Zone étanche tenue
`src/lib/sons.ts` (nouveau), `src/app/reglages/page.tsx` (carte « Sons »), `src/lib/celebrate.ts`, `src/lib/rappels-service.ts`, `src/components/today/launch-film.tsx` + **champs de réglage uniquement** dans `src/types.ts`, `src/lib/defaults.ts`, `src/lib/sanitize.ts` (migrations v1→v2 intactes, `merge` intact) + tests nouveaux (`tests/sons.test.ts`, `tests/diapason.test.tsx`) + ce journal. `package.json`/lock **inchangés** (vérifié `git diff`), **aucun fichier audio binaire** (vérifié `find *.mp3|wav|ogg|m4a|flac` = 0), tokens inchangés, pas de sidebar, ondes réservées à la voix.

### Baseline mesurée (main 4ebc93b, 2026-11-21 ~05:35 UTC)
- `npm test` : **457/457** ✅ (30 fichiers) · `npx tsc --noEmit` ✅ · `npm run build` ✅ · First Load JS `/` = **114 kB**.

### Étapes
- 2026-11-21 05:30 UTC — Inscription M-16 dans `MISSIONS.md` sur `main` (`4ebc93b`, pull/fetch d'abord), worktree `~/.vibe/worktrees/centeryou/diapason-son`, branche `vibe/diapason-son` depuis `origin/main`, rebasée sur `4ebc93b`. `npm ci` OK (Node v24.22.1, npm 11.19.1).
- 05:36 UTC — **Réglages** : `Settings` +2 champs : `soundVolume: number` (0–1, **défaut bas 0,35**) et `filmPad: boolean` (**défaut false** — la nappe ne s'impose jamais). `defaults.ts` + `sanitize.ts` (bornage `Math.min(1, Math.max(0, …))`, booléen strict ; aucune migration cassée, v2 intact, `merge`/`restoreBackup` couvrent les nouveaux champs). Le `sounds` existant (défaut `true`) reste le master on/off.
- 05:38 UTC — **Moteur `src/lib/sons.ts`** (nouveau, ~470 lignes, zéro dépendance) :
  - Bibliothèque `PLANS` : « ding » = 2 notes douces montantes (mi5 659,25 Hz → si5 987,77 Hz, triangle) pour la coche de tâche ; « pop » = fa5 698,46 Hz velouté + harmonique do6 à 22 % pour la création d'événement ; « carillon » = 3 notes discrètes la5→mi5→do5 pour le rappel ; « record » = motif do5→mi5→sol5 pour un record /stats. Fréquences 150–1200 Hz, durées < 1,6 s, crête 0,22 × volume → feutré, jamais criard.
  - Nappe du film : `ACCORDS_NAPPE` = 4 accords (la m → fa → sol → do), un toutes les 8 s, attaque 2,8 s, relâchement chevauchant, volume = moitié du réglage → **2-3 accords lents très doux**.
  - **Déverrouillage audio** (politique navigateur, même logique que le film) : écouteurs capture `pointerdown`/`keydown`/`touchstart` posés à l'import ; `marquerGesteAudio()` tamponne `sessionStorage centeryou-sons-gesture-v1` et resume le contexte ; `audioDebloque()` n'est vrai qu'après un geste dans l'onglet → **jamais de son sans interaction préalable dans la session**.
  - Contexte **partagé** (singleton `getContexte()`, `webkitAudioContext` en repli), créé lazily ; SSR/jsdom/vieux navigateur → no-op silencieux.
  - **Gardes dans `jouerSon()`** : `sonsActifsFrom` (réglage `sounds`) → `audioDebloque()` → `nbActifs >= MAX_SONS_SIMULTANES (2)` → contexte running. Libération du créneau via `onended` + `setTimeout` de sécurité. La nappe occupe 1 créneau.
  - `SonsDeps` injectables (`getSettings`/`getCtx`/`estDebloque`/`getVolume`) : moteur testable en node sans Web Audio.
  - Poids : `sons.ts` n'est atteint que par imports **dynamiques** existants (celebrate, rappels-service, launch-film) → **hors du HTML initial de `/`** (First Load `/` = 114 kB, inchangé).
- 05:40 UTC — **Intégrations (avec retenue)** :
  - `celebrate.ts` : `spawnConfetti` → `playDing()` (coche), `spawnRipple` → `playPop()` (création), `spawnFirework` → `playRecord()` (record) — posés **avant** le garde `motionAllowed()` : le son ne dépend pas du réglage d'animations (et vice versa).
  - `rappels-service.ts` : `runRappelTick` joue `playCarillon({ getSettings: () => settings })` après chaque notification affichée (événement + récapitulatif des tâches), avec dep injectable `jouerCarillon` pour les tests. Le carillon garde en interne : sons actifs + geste de la session (un tick à 30 s sans interaction ne joue rien).
  - `launch-film.tsx` : au `start()` (toujours après un geste : bouton « Lancer le film » ou lecture auto), si `nappeVoulue(settings)` → `startNappe()` ; arrêt propre dans `close()` et au démontage (`stopNappe()`). **OFF par défaut** : sans activation dans Réglages, `startNappe()` renvoie null et rien ne s'impose.
- 05:42 UTC — **Carte « Sons »** (`reglages/page.tsx`) : l'ancienne carte « Son & voix » devient **« Sons »** (icône `Volume2`) : bascule « Effets sonores » (`toggle-sons`, `settings.sounds`), **curseur « Volume des sons »** (`input[type=range]` `reglage-volume-sons`, 0–100 %, libellé « — 35 % » par défaut, `soundVolume = value/100`, grisé si sons coupés, `accentColor` token primaire), bascule **« Nappe du film »** (`toggle-nappe-film`, `settings.filmPad`, off par défaut, texte FR explicite « ne s'impose jamais »), et la bascule « Assistant vocal » inchangée dans la même carte. 100 % FR.
- 05:44 UTC — **Tests nouveaux** (38) : `tests/sons.test.ts` (23) : défauts/sanitation des nouveaux champs (volume borné, filmPad off), helpers purs, plans (ding = 2 notes, carillon = 3, < 1,6 s, 150–1200 Hz), déverrouillage (rien sans geste — `AudioContext` même pas construit ; `pointerdown` débloque ; tampon sessionStorage ; contexte singleton), gardes de `jouerSon` (sons coupés / pas de geste / contexte suspendu + resume / Web Audio absent / **3e son refusé puis créneau libéré par `onended`**), orchestration `jouerPlan`, nappe (null si off/sons coupés/pas de geste ; accords en boucle ; arrêt propre ; occupe 1 créneau). `tests/diapason.test.tsx` (15, `vi.mock` partiel de `sons` + voix mockée) : intégrations — `spawnConfetti`→ding, `spawnRipple`→pop, `spawnFirework`→record (et ding **même avec animations coupées**, sans effet DOM) ; `runRappelTick` → carillon par notification (injecté + câblage par défaut `playCarillon`), rien si rappels coupés ; film — nappe **off par défaut** (`startNappe` jamais appelé), activée → `startNappe` au démarrage (lecture auto après geste) et au clic « Lancer le film », arrêt à « Passer » ; carte « Sons » rendue (switchs, range 35 %), persistance `centeryou-v1` de `sounds`/`soundVolume`/`filmPad`, volume grisé si sons coupés.
- 05:45 UTC — **Validation** : `npx tsc --noEmit` ✅ · `npm test` = **495/495** ✅ (32 fichiers : 457 existants intacts + 38 nouveaux, aucun supprimé/modifié) · `npm run build` ✅ (23 routes, First Load `/` = **114 kB inchangé**, `/aujourdhui` 122 kB, `/reglages` 123 kB) · smoke `next start` : `/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages` tous en **200** ✅ · `git diff` sur `package.json`/lock = vide · `find` binaires audio = 0.

### Décisions
- Le master on/off réutilise le réglage existant `sounds` (défaut `true`) : « célébrations et notifications jouent leur son discret par défaut ». Nouveaux champs limités à `soundVolume` (défaut bas) et `filmPad` (défaut off).
- Sons **indépendants** du réglage « Animations » (ce sont des axes différents) ; chaque son vérifie lui-même ses gardes (sons actifs + geste + < 2 simultanés + contexte running).
- `playBlip` existant (tâches/événements/voix) inchangé : au pire 2 sons se superposent (bip + ding), ce que le plafond autorise ; le ding est très doux.
- La nappe compte pour 1 créneau sonore : pendant le film, au plus 1 autre son en même temps.
- Clé sessionStorage dédiée (`centeryou-sons-gesture-v1`) plutôt que de réutiliser celle du film : chaque domaine garde son propre tampon, même sémantique (geste = déverrouillage pour l'onglet).

### Validation finale
- **495/495 tests** (457 intacts + 38 nouveaux) ✅ · `tsc --noEmit` ✅ · `build` ✅ 23 routes · smoke 6 routes en 200 ✅ · zéro dépendance ajoutée · zéro binaire audio · interface 100 % FR · First Load JS `/` inchangé (114 kB).
- PR : voir MISSIONS.md (branche `vibe/diapason-son`, base `main`, brouillon).
