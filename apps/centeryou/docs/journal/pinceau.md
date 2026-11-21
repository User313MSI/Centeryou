# Pinceau — Journal de mission M-18 · Interface & harmonie visuelle (campagne « Grand V », VAGUE 2)

- **Agent** : Pinceau (session Vibe dédiée). Branche : `vibe/pinceau-ui` (base `main` `da7954a`, resynchronisée sur `30e85e5`). PR : brouillon ouverte dès le départ, base `main`.
- **Zone étanche tenue** : `src/app/globals.css` + styles des composants `src/components/**` (className uniquement, **aucune logique métier modifiée**). INTERDIT tenu : fichiers ICS (`src/lib/ics.ts`, `components/settings/agendas-card.tsx` — zone Pont), `event-dialog.tsx` (zone Radar), api, `package.json`, pages `src/app/**` hors `globals.css`, `design/tokens.ts` / `tailwind.config.ts` (hors zone : les échelles y sont codifiées en variables CSS dans `globals.css` à la place). Aucun fichier hors zone modifié ; aucune fusion (réservé à Vibe Work) ; aucun test supprimé ni modifié.
- **Palette FIGÉE, non négociable** : violet `#7C5CFF`, violet profond `#5B3FE8`, thé `#2DD4BF`, corail, ambre, azur nuit `#1A1B2E` (+ `#FAFAFC`) — **aucune teinte changée**, mission de cohérence uniquement (les seules surcharges de `--c-warning`/`--c-danger` sont celles de Sourire, laissées intactes).
- **Sources lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (feu vert vague 2 confirmé : `da7954a` « Vague 1 fusionnée à 100 % », 0 PR ouverte), tout `docs/journal/` (notamment `sourire.md`, `paillette.md`, `sentinelle.md`, `lynx.md`, `realisateur.md`), `design/tokens.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `globals.css`, les 51 composants `src/components/**`.
- **Heures UTC** : inscription 2026-11-21 05:31 UTC · audit 05:31–05:33 · livraison 05:36.

## 1. Audit — écarts repérés entre composants, et décision (référence dominante)

### Échelles
| Axe | Avant (écarts) | Après (échelle retenue) |
|---|---|---|
| Espacement | grille déjà homogène : toutes les classes `p-*/m-*/gap-*/space-*` sont des multiples de **2 px** (base 4 px, demi-pas 2 px pour badges/pastilles) | **conservée et codifiée** : `--space-*` dans `globals.css` ; aucun changement de classe |
| Tailles de texte | `text-[13px]` (event-block), `md:text-[10px]` (week-view : plus petit en desktop !), `md:text-[56px]` (home-gate), `text-[11px]` ×3 et `text-3xl` ×7 / `md:text-5xl` ×5 (launch-film), `md:text-3xl` ×2 (onboarding, démo) — tous hors échelle | échelle **12/14/16/18/24/32/48 px** (`text-xs`…`text-4xl`, interligne 1,5) : `text-sm`, `text-xs`, `md:text-4xl`, `text-2xl` — 15 classes corrigées dans 6 fichiers |
| Rayons | `rounded-md` (6 px) sur la coche de la démo ; halo de célébration à `18px` dans `globals.css` | famille **card 16 / tile 20 / pill 999 / full (cercle)** : `rounded-full` (comme la coche de `task-item`), halo → `var(--radius-tile)` |
| Ombres | déjà homogène : uniquement `shadow-card` (repos) et `shadow-hover` (survol) | conservée, documentée (`--shadow-rest` / `--shadow-hover`) |
| Focus | `ring-4` sur le bouton micro de la voix | `ring-2` partout (bloc `:focus-visible` global) |

### Parité clair/sombre
- Thème 100 % piloté par variables CSS (`--c-*` injectées par `layout.tsx` depuis `design/tokens.ts`, classe `.dark`) : **aucune classe `dark:` ni aucun hex en dur** dans `src/components/**` (vérifié au grep : 0 occurrence ; le seul `rgb(250 250 252 / …)` est la sonnerie du film, qui se joue toujours sur la nuit `#1A1B2E` — intentionnel, les deux thèmes y sont identiques).
- Contrastes : ceux de Sourire (M-10, AA 4,5:1 mesurés) sont intacts ; vérifiés en relisant `sourire.md` — aucune régression introduite, aucune teinte touchée.
- `color-scheme: light` + `html.dark` : inchangé.

### Responsive 320 px → grand écran
- `body`/`html` en `overflow-x: clip` (déjà en place) : aucun débordement de page.
- Vue jour : `min-w-[300px]` → `min-w-0` — à 320 px (288 px de contenu avec `px-4`), la colonne tient sans scroll horizontal.
- Semaine (`min-w-[720px]`) et mois (`min-w-[560px]`) : scroll horizontal **contenu** dans leur carte (`overflow-x-auto`), la page ne déborde pas — patron conservé (7 colonnes de jours incompressibles).
- Cibles tactiles : `min-h-11` (44 px) boutons/lignes, `min-h-14` (56 px) onglets bas de nav et FAB — conforme, inchangé. Largeur max du contenu `max-w-[1100px]` + `px-4 md:px-6` : inchangé.

### Mouvement
- Composants : déjà homogènes — `transition-{colors,all,shadow,transform,opacity}` + `duration-fast`/`duration-normal` + `ease-out` uniquement (vérifié au grep).
- `globals.css` : les entrées/sorties UI (`animate-fade-in/slide-up/pop/event-in/drop-settle/view-in/exit`) avaient des durées disparates (240/280/220/260/320/260/200 ms, `ease-in` pour la sortie) → **harmonisées sur l'échelle motion** : `var(--dur-fast)` 200 ms ou `var(--dur-normal)` 300 ms, courbe `var(--ease-ui)` ease-out partout.
- Familles délibérément à part (documentées) : **célébrations** Paillette (440 ms élastique, halo 620 ms, onde 560 ms — overshoot intentionnel) et **boucles ambiantes** (ondes vocales 1,6 s, halo de rappel 1,9 s, film 24–38 s) — inchangées.
- `prefers-reduced-motion: reduce` : bloc global existant, couvrant `*` (animations + transitions + scroll-behavior) — vérifié, inchangé ; idem pour le réglage « Animations & célébrations » (`html.animations-off`). Tous les `animate-*` passent par ces deux blocs.

## 2. Guide de style — les échelles retenues (pour les futurs agents)

> Source de vérité : `design/tokens.ts` + `tailwind.config.ts`. Les variables CSS de `globals.css` (`:root`) les reflètent pour le CSS pur : `--space-*`, `--text-*`, `--radius-*`, `--dur-fast/--dur-normal`, `--ease-ui`.

1. **Espacement** — base **4 px**, demi-pas **2 px** autorisé (micro-éléments). Classes Tailwind `p/m/gap/space-*` en multiples de 0,5 uniquement. Jamais de `p-[…]` arbitraire.
2. **Typographie** — **12 / 14 / 16 / 18 / 24 / 32 / 48 px**, interligne **1,5** : `text-xs sm base lg xl 2xl 4xl`. Jamais de `text-[…]` ni de `text-3xl/5xl` (hors échelle). Titres : `leading-tight` ; pastilles chiffrées : `leading-none`. Poids : 400/600/700/800 (`font-normal/semibold/bold/extrabold`).
3. **Rayons** — `rounded-card` 16 px (cartes, blocs), `rounded-tile` 20 px (grandes tuiles, halo), `rounded-pill` 999 px (boutons, badges, onglets, toasts), `rounded-full` = cercle parfait uniquement (pastilles, coches, avatars). Aucun autre rayon.
4. **Ombres** — `shadow-card` au repos, `shadow-hover` au survol/élévation. Aucune autre ombre.
5. **Bordures** — `border` 1 px (`border-line`) par défaut, `border-2` réservé aux états actifs/checkbox. Focus : `ring-2 ring-primary ring-offset-2 ring-offset-bg` (global `:focus-visible`).
6. **Mouvement** — transitions/entrées UI : `duration-fast` (200 ms) ou `duration-normal` (300 ms), `ease-out`, toujours ; célébrations et boucles ambiantes : familles documentées dans `globals.css`. `prefers-reduced-motion` et le réglage « Animations » rendent tout statique — ne jamais poser une animation hors de ces blocs globaux.
7. **Couleurs** — uniquement les classes tokens (`bg-*`, `text-*` sur `--c-*`) ; **aucun hex / rgba en dur** dans les composants (le film excepté, fond nuit fixe). Palette figée : `#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E` (+ dérivés `voicetext`, `muted`, `line`, `veil`, `onbright`, `cat-*`). Texte sur fond clair : `primarydark`/`voicetext` selon le rôle, jamais `primary` brut (Sourire).
8. **Cibles tactiles** — minimum `min-h-11` (44 px) pour tout élément cliquable, `min-h-14` (56 px) pour la nav du bas et le FAB.
9. **Responsive** — jamais de débordement de page (`overflow-x: clip` global) ; les grilles larges (semaine/mois) scrollent dans leur carte (`overflow-x-auto` + `min-w-*`), la vue jour tient à 320 px (`min-w-0`) ; conteneur max `max-w-[1100px]`.

## 3. Fichiers touchés (zone uniquement — 9 fichiers)

- `src/app/globals.css` : bloc « ÉCHELLES CENTERYOU » (`:root`, variables + documentation), 7 classes `animate-*` harmonisées sur `--dur-*/--ease-ui`, commentaire famille « célébrations », halo `border-radius: var(--radius-tile)`.
- `src/components/` (className uniquement) : `events/event-block.tsx` (text-sm), `events/week-view.tsx` (md:text-[10px] supprimé), `events/day-view.tsx` (min-w-0), `landing/home-gate.tsx` (md:text-4xl), `today/launch-film.tsx` (12 classes typo), `auth/onboarding-steps.tsx` (md:text-4xl), `demo/demo-view.tsx` (md:text-4xl + rounded-full), `voice/voice-panel.tsx` (ring-2).

## 4. Hors zone, signalé (jamais codé ici)

- `src/app/{bienvenue,offres,presse,reglages}/page.tsx` utilisent encore `text-primary` (4,17:1) — pages hors zone (déjà signalé par Sourire).
- `components/settings/agendas-card.tsx` : `text-primary` sur l'icône « Agendas » (4,17:1, OK pour un graphique ≥ 3:1) et `text-voicetext` sur le compteur d'import (3,44:1 < 4,5:1 pour du texte) — fichier ICS (zone Pont), laissé intact.

## 5. Validation (exécutée sur la branche, 2026-11-21 05:35 UTC)

- `npm test` : **457/457 ✅** (30 fichiers ; aucun test modifié — les classes `animate-*` gardent leurs noms, seules les durées changent dans `globals.css`).
- `npx tsc --noEmit` ✅ · `npm run test:parser` ✅ · `npm run build` ✅ « ✓ Compiled successfully », 23/23 pages, First Load JS partagé **87,5 kO inchangé**.
- CSS compilé vérifié (`.next/static/css/*.css`) : `html:root{--c-warning:160 96 0;--c-danger:192 58 58}` (Sourire intact), `--dur-fast:200ms`, `--dur-normal:300ms`, `--ease-ui:ease-out`, `--radius-tile:20px`, `--space-05:2px`, `--text-4xl:48px`, `animation:fade-in var(--dur-fast) var(--ease-ui) both`, `animation:view-in var(--dur-normal) var(--ease-ui) both`, `border-radius:var(--radius-tile)`.
- Smoke `next start` : **16/16 routes en 200** (/, /aujourdhui, /planning, /taches, /stats, /voix, /demo, /inscription, /offres, /presse, /confidentialite, /cgu, /contact, /bienvenue, /onboarding, /legal).
- `git diff origin/main...HEAD` : 9 fichiers, uniquement `src/app/globals.css` + `src/components/**` + ce journal.
- Parcours relu : aucun changement de logique, aucun texte FR touché, palette intacte (grep : 0 hex en dur dans les composants ; 0 `dark:` ; 0 `text-[…]` / `text-3xl` / `text-5xl` / `rounded-md` / `ring-4` restants).

## 6. Publication

- 2026-11-21 05:31 UTC — MISSIONS.md publié sur `main` (commit `30e85e5`), branche `vibe/pinceau-ui` poussée.
- 2026-11-21 05:36 UTC — commit de livraison (9 fichiers zone + journal), push `vibe/pinceau-ui`, **PR ouverte en brouillon (base `main`)** ; MISSIONS.md ré-annoté sur `main` à la PR.
