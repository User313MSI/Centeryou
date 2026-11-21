# Sourire — Journal de mission M-10 · Accessibilité & contrastes (campagne « Grand V », vague 1)

- **Agent** : Sourire (session Vibe Code dédiée). Branche : `vibe/sourire-accessibilite` (base `main` `6dd1ab9`). PR : brouillon ouverte dès le départ, base `main`.
- **Zone étanche** : `src/components/**` + `src/app/globals.css` (uniquement les 2 teintes `warning`/`danger`). INTERDIT tenu : `src/app/reglages/page.tsx`, fichiers ICS/sync (`src/lib/ics.ts`, `src/lib/sync.ts`, `src/components/settings/agendas-card.tsx`, tests ICS), `src/components/events/event-dialog.tsx`, `public/sw.js`, `apps/centeryou-desktop`, `package.json`. Aucun fichier hors zone modifié ; aucune fusion (réservé à Vibe Work) ; aucun test supprimé.
- **Sources lues avant de coder** : `AGENTS.md`, `apps/centeryou/docs/MISSIONS.md`, `apps/centeryou/docs/journal/sentinelle.md` (axe 5 accessibilité 3/5), tout `src/components/**`, `design/tokens.ts`, `globals.css`, `layout.tsx`, `tailwind.config.ts`.
- **Heures UTC** : ouverture 2026-11-21 03:30 UTC.

## 1. Contrastes — mesures AVANT (méthode WCAG 2.1, luminance relative sRGB)

Outil : script Node maison (formule WCAG : `L = 0,2126R + 0,7152G + 0,0722B` en linéaire, ratio `(L1+0,05)/(L2+0,05)`), rejoué sur les valeurs des tokens et les fonds réellement utilisés (clair : `#FAFAFC`/`#FFFFFF` + voiles `bg-warning/15`, `bg-danger/10`, `bg-danger/15` aplatis sur surface ; sombre : `#14141F`/`#1E1F2E` + mêmes voiles).

| Couple (thème clair) | Avant | AA 4,5:1 |
|---|---|---|
| `text-warning #FFB020` sur `#FAFAFC` | **1,75:1** | ❌ |
| `text-warning #FFB020` sur `#FFFFFF` | 1,83:1 | ❌ |
| `text-warning` sur voile `bg-warning/15` (`#FFF3DE`) | 1,67:1 | ❌ |
| `text-danger #FF6B6B` sur `#FAFAFC` | **2,66:1** | ❌ |
| `text-danger` sur `#FFFFFF` | 2,78:1 | ❌ |
| `text-danger` sur voile `bg-danger/10` (`#FFF0F0`) | 2,51:1 | ❌ |
| `text-danger` sur voile `bg-danger/15` (`#FFE9E9`) | 2,39:1 | ❌ |
| `text-primary #7C5CFF` sur `#FAFAFC` / `#FFFFFF` / `bg-primary/10` | 4,17 / 4,35 / 3,84:1 | ❌ (<4,5) |
| `text-voicetext #0F9B8E` sur `#FAFAFC` / `#FFFFFF` | 3,30 / 3,44:1 | ❌ |
| `text-surface #FFFFFF` sur `bg-primary #7C5CFF` (jour « aujourd’hui », hover boutons) | 4,35:1 | ❌ |
| `onbright #1A1B2E` sur `bg-primary` | 3,90:1 | ❌ |
| `text-surface/60` (croix de toast, thème sombre) sur `bg-ink #F0F0F5` | ~4,35:1 | ❌ |
| badge « neutre » `text-muted #6E7191` sur `bg-line/60` (`#F0F0F6`) | 4,14:1 | ❌ |
| barres graphique `bg-voice #2DD4BF` sur piste `bg-line/70` (progressbar, clair) | ~1,6:1 | ❌ (1.4.11) |
| catégories en remplissage SVG (perso 1,86 / sante 2,78 / focus 1,83 sur blanc) | <3:1 | ❌ (1.4.11, couvert par alternative textuelle aria-label + `<title>`) |
| **OK déjà** : `text-muted` 4,54:1 · `ink` 16,24:1 · `primarydark #5B3FE8` 6,07:1 · `onbright` sur `voice`/`warning`/`danger` 9,10/9,26/6,10:1 · voix sombre 9,1–9,8:1 (token voix intact) · sombre : warning 9,99:1, danger 6,58:1 sur `#14141F` | ≥4,5:1 | ✅ |

## 2. Décision — les 2 seules teintes ajustées (exception autorisée)

Principe : assombrir UNIQUEMENT `--c-warning` et `--c-danger`, uniquement là où elles servent de texte/icône sur fond clair. En thème sombre et sur la nuit du film (`#1A1B2E`), les teintes vives d’origine restent (elles y passent déjà AA : 9,99:1 / 6,58:1) — assombrir un fond sombre les dégraderait. Les 5 autres tokens sont INTACTS : `#7C5CFF #5B3FE8 #2DD4BF #FAFAFC #1A1B2E` (et `voiceText`, `muted`, etc. inchangés aussi — `design/tokens.ts` non touché, hors zone).

Implémentation : `globals.css` surcharge les deux variables CSS avec une spécificité supérieure au `<style>` inline de `layout.tsx` (`html:root` = 0,1,1 > `:root` = 0,1,0 ; `html.dark` idem) :

- `html:root` (thème clair) : `--c-warning: 160 96 0` (**#A06000**, ambre profond, hue ~36° proche des 38,7° d’origine) et `--c-danger: 192 58 58` (**#C03A3A**, corail profond, hue 0° identique).
- `html.dark` (sombre, placée après `html:root`) : valeurs d’origine conservées (`255 176 32` / `255 107 107`).
- `.film-root` (classe ajoutée à la racine du dialogue du film, `launch-film.tsx`) : valeurs vives conservées, comme en sombre.

Surcharge HORS `@layer`, vérifiée dans le CSS compilé de `npm run build` : `html:root{--c-warning:160 96 0;--c-danger:192 58 58}` et `html.dark{--c-warning:255 176 32;--c-danger:255 107 107}` — la spécificité (0,1,1) bat le `:root`/`.dark` (0,1,0) du `<style>` inline de `layout.tsx`.

## 3. Autres couples < 4,5:1 corrigés SANS toucher aux tokens (dans la zone, par classes existantes)

- `text-primary` (4,17:1) → `text-primarydark` (6,07:1) partout dans `src/components/**` (icônes et textes).
- `text-voicetext` (3,30:1) → `text-primarydark` sur fonds clairs ; `text-surface` sur la bulle voix `bg-ink` (16:1 dans les deux thèmes) et l’action de toast.
- pastille « aujourd’hui » `bg-primary text-surface` (4,35:1) → `bg-primarydark text-surface` (6,32:1 clair, 6,5:1 sombre).
- boutons/CTA `bg-primarydark … hover:bg-primary` (4,35:1 au survol, 3,87:1 en sombre) → `hover:brightness-95` (jamais sous 6:1).
- bouton `variant="danger"` : `bg-danger text-onbright` → `bg-danger text-surface` (blanc sur corail assombri = 5,4:1 ; en sombre `text-surface` sombre sur corail vif = 6,1:1).
- croix de toast `text-surface/60` → `text-surface/80` (≥8:1 dans les deux thèmes).
- badge « neutre » `bg-line/60 text-muted` → `text-ink`.
- remplissage des barres de progression `bg-voice` sur piste claire → `bg-primarydark` (5,6:1 contre la piste ; le teal reste réservé à la voix).
- barres hebdo du stats : `text-primary`/`text-voicetext` → `text-primarydark` uniforme (le jour le plus chargé reste surligné par son étiquette en gras).
- axe du graphique `text-line` → `text-muted`.
- (hors zone, signalé pour le propriétaire de zone : `src/app/bienvenue|offres|presse|reglages` utilisent encore `text-primary` à 4,17:1 — non touché, zone d’un autre agent.)

## 4. Clavier & lecteurs d’écran (retouches précises)

- Focus visible : le ring global `:focus-visible` de `globals.css` couvre tout ; complété là où un composant posait `focus-visible:outline-none` sans ring.
- `role="group"` + `aria-label` sur le bloc « Suggestions rapides » (quick-add) — un `aria-label` sur `<div>` sans rôle n’était pas annoncé.
- `aria-labelledby` sur la `Dialog` (titre `h2` désormais référencé) en plus d’`aria-label`.
- Boutons à icône : `aria-label` vérifié sur chacun (fermeture toast/dialog/install, supprimer/cocher tâche, micro FAB, etc.) — tous déjà nommés, testés.
- Rôles/états : `role="switch"` + `aria-checked` (toggle), `aria-pressed` (mic, tâche), `role="tablist"/tab` + `aria-selected` + roving tabindex (tabs), `role="progressbar"` + `aria-valuenow/min/max/label` (barres), `role="alert"` (erreurs), `aria-live` (toasts, indicateurs, panneau voix), `aria-current="page"` (nav), `aria-hidden` sur tout le décoratif (icônes, logo, ondes, halos).
- Ordre de tabulation : ordre DOM logique conservé ; créneaux de grille et blocs d’événements restent des `role="button"` focusables avec Entrée/Espace ; pièges de focus des dialogues conservés.

## 5. Contrastes — mesures APRÈS (WCAG 2.1, mêmes fonds réels)

| Couple (thème clair) | Avant | Après | AA 4,5:1 |
|---|---|---|---|
| warning sur `#FAFAFC` (texte/icône) | 1,75:1 | **#A06000 → 4,83:1** | ✅ |
| warning sur `#FFFFFF` | 1,83:1 | **5,04:1** | ✅ |
| warning sur voile `warning/15` `#FFF3DE` | 1,67:1 | **4,59:1** | ✅ |
| warning sur carte brief `bg-voice/5` | 1,77:1 | **4,88:1** | ✅ |
| danger sur `#FAFAFC` | 2,66:1 | **#C03A3A → 5,16:1** | ✅ |
| danger sur `#FFFFFF` | 2,78:1 | **5,37:1** | ✅ |
| danger sur voile `danger/10` `#FFF0F0` (alerte auth, hover tâche) | 2,51:1 | **4,86:1** | ✅ |
| danger sur voile `danger/15` `#FFE9E9` | 2,39:1 | **4,63:1** | ✅ |
| bouton danger : blanc `text-surface` sur corail (était onbright 6,10:1) | 6,10:1 | **5,37:1** | ✅ |
| warning SOMBRE sur `#14141F` (inchangé) | 9,99:1 | 9,99:1 | ✅ |
| danger SOMBRE sur `#1E1F2E` (inchangé) | 5,86:1 | 5,86:1 | ✅ |
| warning film sur nuit `#1A1B2E` (inchangé) | 9,26:1 | 9,26:1 | ✅ |

Autres couples corrigés sans toucher aux tokens (mesurés) : `text-primarydark` 6,07:1 sur bg / 6,32:1 sur surface / 5,59:1 sur tuile `primary/10` ; pastille « aujourd’hui » blanche sur `bg-primarydark` 6,32:1 ; `text-muted` 4,54:1 ; ink sur voiles warning/15 15,42:1 et danger/15 14,58:1 ; remplissage progressbar `primarydark` vs piste `line/70` 5,48:1 ; coche « faite » `onbright` sur `voice` 9,10:1 ; bordure de coche `voicetext` 3,44:1 (≥ 3:1, WCAG 1.4.11) ; anneau de focus `primary` 4,17:1 clair / 4,20:1 sombre (≥ 3:1, WCAG 2.4.11) ; **token voix intact : 9,10:1 sur la nuit**.

## 6. Tests & validation (exécutés sur la branche, après merge de `main`)

- Nouveau fichier `tests/accessibilite.test.tsx` : **20 tests** — 8 de contraste mesuré programmatiquement (formule WCAG dans le test : sanity check que les anciennes valeurs échouaient, ratios attendus à ±0,05 près, tokens intacts, `globals.css` ne surcharge que les 2 variables), 9 de rôles/états/aria rendus (Dialog `aria-labelledby` + Échap + bouton nommé, Toggle `switch`/`aria-checked`, Tabs roving tabindex + flèches, Toasts `aria-live` + actions nommées, ProgressBar `aria-valuenow`, QuickAdd champ nommé + `role="group"`, TaskItemRow labels + `aria-pressed`, EventBlock `role="button"` + Entrée), 3 de focus visible.
- `npm test` : **403/403 ✅** (383 de main — dont les 327 de la mission + les 56 ICS de Pont — + mes 20 ; aucun test supprimé ni modifié).
- `npx tsc --noEmit` ✅ · `npm run test:parser` ✅ · `npm run build` ✅ (23 routes, « Compiled successfully »).
- `git diff origin/main...origin/vibe/sourire-accessibilite` : 32 fichiers, **uniquement** `src/components/**`, `src/app/globals.css`, `tests/accessibilite.test.tsx`, `docs/journal/sourire.md` — zéro fichier hors zone.
- Note : sur la base initiale (6dd1ab9), un test `rappels.test.ts` échouait à cause de la date du jour — correctif déjà fusionné sur `main` (d3c67e9) ; après merge de `main` dans ma branche : 403/403.

## 7. Publication

- 2026-11-21 03:30 UTC — MISSIONS.md publié sur `main` (commit `6dd1ab9`), branche `vibe/sourire-accessibilite` poussée, **PR #30** ouverte en brouillon (base `main`).
- 2026-11-21 ~05:10 UTC — commit `79a9b3b` (31 fichiers, zone uniquement) + `5b30245` (fix type test) + merge `main` (`f253e61`) ; tests 403/403, tsc ✅, build ✅ ; push branche ; MISSIONS.md ré-annoté sur `main` à la PR.
