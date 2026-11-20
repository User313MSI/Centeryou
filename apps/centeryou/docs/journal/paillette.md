# Paillette — 2026-11-20 — Mission M-05 : animations & célébrations (avec goût)

Agent : **Paillette** (motion design). Branche : `vibe/paillette-animations` (base `main`, créée depuis `origin/main` = `e007ca2`, synchronisée à la fin — aucun commit en avance, aucun conflit).
PR : **https://github.com/User313MSI/Centeryou/pull/25** — base `main`, head `vibe/paillette-animations`, titre « Paillette : animations & célébrations » (brouillon ouvert dès la 1ʳᵉ étape, body à jour à la fin).

Mission : rendre les moments clés vivants et joyeux, jamais de carnival — création d'événement (apparition élastique + halo + onde violette depuis le point de création), coche de tâche (micro-confettis au niveau du bloc, jamais plein écran, + vibration mobile très courte), nouveau record /stats (petit feu d'artifice discret), transitions douces entre vues, sortie douce à la suppression. CSS keyframes + requestAnimationFrame UNIQUEMENT, zéro dépendance, transform/opacity UNIQUEMENT. Nouveau réglage « Animations & célébrations » (activé par défaut) ; si désactivé ou `prefers-reduced-motion` → tout statique instantanément.

## Références lues avant de commencer

- `AGENTS.md`, `docs/MISSIONS.md` (M-05), tous les journaux de `docs/journal/` — en particulier **lynx.md** (classes `animate-view-in` / `animate-fade-in` existantes, bloc `prefers-reduced-motion` global dans `globals.css` à conserver), **dario.md** (tokens, migration v1→v2, pattern `sanitizeSettings`), **apollon.md** (dernier polish, 176/176, parcours à rejouer), **sigma.md** (page /stats, `computeStats`, série `streak`).

## Baseline mesurée (build `main` = `e007ca2`, 2026-11-20 ~08:55 UTC)

- `npm test` ✅ **176/176** (15 fichiers) · `npm run test:parser` ✅ · `npx tsc --noEmit` ✅ · `npm run build` ✅ (24 routes).
- Build table : **`/` = 5,8 kB / First Load JS 113 kB**, shared 87,4 kB.
- JS initial réellement servi par le HTML de `/` (somme des `<script src>`) : **15 fichiers, 559 107 octets**.

## Journal des étapes (heure UTC)

- 2026-11-20 08:55 — Branche créée, PR brouillon #25 ouverte après le 1ᵉʳ commit. `npm ci` OK (Node v24.22.1, npm 11.19.1).
- 2026-11-20 09:00 — **Étape 1 : réglage « Animations & célébrations »** ✅. `types.ts` (`Settings.animations: boolean`), `defaults.ts` (`animations: true`), `sanitize.ts` (bornage booléen, défaut sûr `true` si absent/malformé — aucune migration cassée, v1→v2 intacte), page `/reglages` : nouvelle carte « Animations & célébrations » (icône `Sparkles`, bascule `Toggle` id `toggle-animations`, texte 100 % FR). Commit `18330a6`, poussé. Build de ce commit seul : `/` = **113 kB** (le réglage seul ne régresse rien).
- 2026-11-20 09:10 — **Étape 2 : libs motion** ✅. `src/lib/motion.ts` (pur, testé en node : `prefersReducedMotion()`, `animationsActiveFrom()`, `isNewRecord()`, `readRecord`/`writeRecord()` best-effort, `CELEBRATE_PALETTE` adossée aux tokens via `rgb(var(--c-…))` : primary #7C5CFF, primarydark #5B3FE8, voice #2DD4BF, warning #FFB020) ; `src/lib/use-motion.ts` (hook réactif `useMotionEnabled()` : réglage + écoute `change` de matchMedia) ; `src/lib/celebrate.ts` (effets DOM en rAF, `pointer-events: none`, transform/opacity seuls, chaque effet vérifie `motionAllowed()` : `spawnRipple`/`spawnRippleAt` (anneau violet, keyframes CSS), `spawnConfetti` (12 particules contenues dans l'hôte en `overflow:hidden`), `spawnFirework`/`spawnFireworkAt` (22 particules, rayon ≤ ~92 px + flash), `vibrateShort()` (`navigator.vibrate(30)`), repli `setTimeout` si rAF absent). `ui-store.ts` : `exitingIds` + `requestExit`/`cancelExit` (sortie douce internalisée ici pour ne pas alourdir le graphe initial — voir étape 4).
- 2026-11-20 09:12 — **Étape 3 : CSS** ✅ (`globals.css`, patterns existants réutilisés) : keyframes `event-celebrate-in` (élastique, léger overshoot), `halo-out`, `ripple-out`, `exit-out` + classes `.animate-event-celebrate` / `.animate-halo` / `.animate-exit` et surcouches `.celebrate-halo` / `.celebrate-ripple` / `.celebrate-confetti` / `.celebrate-firework` (toutes `pointer-events: none`, `will-change: transform, opacity`) + **bloc `html.animations-off *`** identique au bloc `prefers-reduced-motion` global existant (qui continue de tout tuer).
- 2026-11-20 09:15 — **Étape 4 : composants** ✅.
  - `event-block.tsx` : événement frais → `animate-event-celebrate` + halo sibling (mêmes coordonnées, débord 6 px) + onde violette depuis le centre du bloc (point de création) ; coche d'une tâche dans le planning → confettis dans le bloc + vibration ; `exitingIds` → `animate-exit`. Le drag & drop est inchangé (le bloc garde ses handlers ; `pointer-events` du halo/overlay = none).
  - `task-item.tsx` : ligne `relative`, coche (clic/swipe/voix/menu, détectée par transition `done`) → confettis dans la ligne + `vibrate(30)` ; suppression → `requestExit` puis `deleteTask`, « Annuler » → `cancelExit` (toujours là) sinon re-création.
  - `event-dialog.tsx` `remove()` et `task-actions-menu.tsx` `onDelete()` : même sortie douce pour `event:<id>` / `task:<id>`.
  - `stats-view.tsx` : record = série de jours organisés (`stats.streak`) battant le record persisté (`localStorage` clé `centeryou-record-serie`, lue/écrite via `readRecord`/`writeRecord`) → un seul feu d'artifice discret ancré sur la ligne « série » (`#stats-serie`).
  - `app-shell.tsx` : `<main key={pathname} className="animate-view-in …">` (transition fade + translate sobre entre les vues) + effet qui pose/retire `animations-off` sur `<html>` selon le réglage.
  - `reglages/page.tsx` : la bascule (étape 1).
  - **Choix perf** : `celebrate.ts` est importé **dynamiquement** (`void import(...)`) depuis `event-block` / `task-item` / `stats-view` — sinon la vitrine `/` (qui rend `WeekView` via le mock produit) chargeait le chunk célébrations : measured +6,5 kO. Avec import dynamique, le chunk célébrations est hors du HTML initial de `/`.
- 2026-11-20 09:20 — **Étape 5 : poids** ✅. Après itération (sortie douce d'abord en module `exit.ts` absorbé dans le chunk layout initial → retour à 114 kB ; internalisée dans `ui-store` déjà chargé) : build final **`/` = 5,8 kB / First Load JS 113 kB — identique à la baseline, 0 régression** ; shared 87,4 kB inchangé. JS initial servi par `/` : 15 fichiers, **561 374 octets** (+2 267 octets bruts, non visible dans la métrique build à 0,1 kO près). Autres routes : `/aujourdhui` 123 kB, `/planning` 107 kB, `/taches` 105 kB, `/reglages` 119 kB, `/stats` 103 kB (102 baseline, +1 kO, page app uniquement).
- 2026-11-20 09:23 — **Étape 6 : tests** ✅. `tests/animations.test.tsx` (20 tests : réglage défaut/persistance/sanitation, bascule dans Réglages, `prefersReducedMotion`/`animationsActiveFrom` avec matchMedia mocké, `useMotionEnabled`, `isNewRecord`/`readRecord`/`writeRecord`, `motionAllowed`, `spawnConfetti` contenu dans l'hôte + nettoyage, `vibrateShort` 30 ms, `requestExit`/`cancelExit` avec timers fakés (délai 220 ms si actif, 0 si inactif), EventBlock : classe élastique + halo + onde, `animate-exit`). `tests/parcours-animations.test.tsx` (13 tests de parcours en jsdom avec les vrais composants : création d'événement dans DayView, coche de tâche en ligne et dans le planning, record /stats (feu d'artifice une seule fois, record persisté), suppression douce + Annuler + délai 0 si désactivé, AppShell `animations-off` + `animate-view-in` sur `<main>` — le tout rejoué avec le réglage activé, désactivé, et `prefers-reduced-motion` émulé).
- 2026-11-20 09:26 — **Validation finale** ✅ : `npx tsc --noEmit` ✅ · `npm test` ✅ **209/209** (17 fichiers : 176 existants intacts + 33 nouveaux, aucun supprimé) · `npm run test:parser` ✅ · `npm run build` ✅ (24 routes, `/` = 113 kB) · smoke `next start` : 17/17 routes en 200 (`/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages`, `/voix`, `/bienvenue`, `/demo`, `/offres`, `/cgu`, `/inscription`, `/contact`, `/presse`, `/legal`, `/confidentialite`, `/onboarding`).

## Décisions & liste avant → après

- `Settings` : + `animations: boolean` (défaut `true`) — `sanitizeSettings` le borne, migration v1→v2 et `merge` intacts.
- Réglages : carte « Animations & célébrations » (bascule activée par défaut, 100 % FR) — avant : rien → après : bascule `toggle-animations`.
- Création d'événement : avant `animate-event-in` (scale 0,96→1) → après `animate-event-celebrate` (élastique 0,7→1,06→0,985→1) + halo violet qui s'évapore + onde violette depuis le bloc (point de création), couleurs #7C5CFF/#5B3FE8 via `rgb(var(--c-primary…))`.
- Coche de tâche : avant rien → après 12 micro-confettis contenus dans la ligne/bloc (overlay `overflow:hidden`, `pointer-events:none`) + `navigator.vibrate(30)` si mobile.
- Record /stats : avant rien → après feu d'artifice discret (≤ ~92 px) sur la ligne « série », une seule fois par record battu (persisté `centeryou-record-serie`).
- Navigation entre vues : avant aucun fondu de page → après `animate-view-in` (fade + translateY 6 px, 260 ms) sur `<main key={pathname}>` ; les vues planning (jour/semaine/mois) avaient déjà leur `animate-view-in`.
- Suppression : avant suppression immédiate → après `animate-exit` (scale 0,9 + fondu, 200 ms) puis suppression réelle ; « Annuler » annule la sortie à temps ; délai 0 si animations inactives.
- Désactivation : classe `animations-off` sur `<html>` (même patron que le bloc `prefers-reduced-motion` global, inchangé) + aucun effet JS créé (`motionAllowed()` vérifié dans chaque spawn) → **tout statique instantanément**, dans les deux cas.

## Contraintes respectées

- Zéro nouvelle dépendance (`package.json` inchangé) ; CSS keyframes + rAF uniquement ; **transform/opacity uniquement** (aucun re-layout) ; surcouches `pointer-events: none` (glisser-déposer et cibles tactiles intacts pendant/après) ; tokens inchangés (#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E, `design/tokens.ts` non touché) ; aucune variable d'env renommée ; pas de sidebar ; voix/mode sombre non gated Premium ; comptes/paiement/mobile/stats/hors-ligne non touchés ; interface 100 % FR ; aucun test existant supprimé (176/176 → 209/209) ; `First Load JS` de `/` = 113 kB avant = après (0 régression) ; `next.config` et routes `/api/*` non touchés.

## Liens

- PR : https://github.com/User313MSI/Centeryou/pull/25 (base `main`)
- Commits : `18330a6` (réglage), `f7de4fd` (animations), `98a2d55` (tests de parcours)
