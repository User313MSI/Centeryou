# Nuage — Journal de mission M-23 · Ligne graphique douce et aérienne

- **Agent** : Nuage (session Vibe dédiée). Branche : `vibe/nuage-ligne-graphique` (base `main` `876f700`, inscription M-23 publiée sur `main` à 05:28 UTC en commit MISSIONS.md seul). PR : brouillon, base `main` (lien en bas, « PR #XX ouverte »).
- **Zone tenue** : `src/app/globals.css`, `design/tokens.ts`, `tailwind.config.ts` (non modifié — rien à y changer), `src/components/**`, pages `src/app/**` (hors `api` sauf 2 chaînes d'erreur, voir §6), `docs/journal/nuage.md`, MISSIONS.md (inscription). **INTERDIT tenu** : `src/lib/parser.ts` et les tests du parseur (mission M-31 Almanach en parallèle) — `git diff` le prouve. Zéro dépendance ajoutée (`package.json`/lock inchangés), aucun binaire, aucune image committée (captures hors dépôt).
- **Sources lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (M-23), tout `docs/journal/` — notamment **pinceau.md** (échelles en place), **sourire.md** (contrastes à préserver), **accord.md** (le film), **nord.md** (choix tranchés, non rouverts), **cactus.md** (défauts client), plus plume/cineaste pour ne rien refaire.
- **Heures UTC** : inscription 05:28 · audit + captures avant 05:35–05:55 · codage 05:55–06:10 · tests/build/captures après 06:10–06:18.

---

## 1. La ligne directrice « douce et aérienne » — documentée pour les futurs contributeurs

Règles simples, toutes dérivées des tokens existants (aucun hex nouveau, palette figée intacte : `#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E`) :

1. **Fond = voiles pastel très doux.** Le fond uni reste sur `<html>` (`bg-bg`) ; `body` est transparent et un pseudo-élément fixe `body::before` (z-index -1, `pointer-events: none`, statique) porte 3–4 dégradés radiaux en `rgb(var(--c-primary) / 0.05–0.09)` et `rgb(var(--c-voice) / 0.07)` en clair, un peu plus soutenus en sombre (`html.dark body::before`, 0.12–0.18). Jamais d'image, jamais d'animation : rien à tuer sous `prefers-reduced-motion`. **Règle** : opacités faibles — le contraste AA doit rester vrai sous les voiles (voir §5).
2. **Cartes plus légères, plus d'air.** Ombre au repos adoucie dans `design/tokens.ts` (`0 6px 24px rgba(26,27,46,.06)` clair, `0 6px 24px rgba(0,0,0,.38)` sombre — diffuse = légère) ; padding des cartes passées à `px-6 pt-6 / pb-6` (`card.tsx`) ; `main` en `pt-8 md:pb-16` ; landing en `gap-12 md:gap-16`. Cartes toujours **opaques** (`bg-surface`) : la translucidité ferait varier le contraste perçu.
3. **Dégradés discrets UNIQUEMENT sur les éléments clés**, jamais sur du texte de corps : voile blanc 12 % en haut à gauche des boutons primaires (classe `.bg-cta` dans `globals.css`, posée à côté de `bg-primarydark`), slogan du hero en dégradé `from-primary to-primarydark` (`bg-clip-text`, texte large 48 px), rond du logo en dégradé SVG violet `primary → primarydark` (id unique par `useId`). **Règle** : un dégradé sur du texte exige que chaque point du dégradé passe le seuil (4,5:1 texte normal, 3:1 texte large ≥ 24 px gras) — mesurer avant.
4. **Le motif d'ondes reste réservé à la voix** (inchangé). La nuit du film (`#1A1B2E`) et le mode sombre restent cohérents avec la ligne : mêmes voiles, thème sombre dérivé des mêmes variables.
5. **Couleurs = tokens uniquement.** Aucun hex/rgba en dur dans les composants (les seuls `rgb(var(--c-…))` autorisés sont ceux de `globals.css` et du SVG logo). Échelles Pinceau inchangées : espacements multiples de 2 px, typo 12–48 px, rayons card/tile/pill/full, ombres `shadow-card`/`shadow-hover`, motion 200/300 ms ease-out, focus `ring-2` global.
6. **Français impeccable** : casse de phrase (seule la 1re lettre en majuscule — jamais la classe CSS `capitalize` qui met une majuscule à chaque mot), tutoiement, vocabulaire courant (pas de « localStorage », « Supabase », « Stripe », « parseur », « quota serveur », « snapshot », « JSON », nom de variable d'env…). Les pages légales (CGU/confidentialité/mentions) gardent volontairement les termes techniques **avec explication en français** — c'est de la transparence juridique (audit Huissier M-25), pas du jargon UI.

## 2. Méthode et preuves d'écran

- App en **production** (`npm run build` + `next start`, port 3231) depuis la branche ; **Chrome 157 headless piloté en CDP** (WebSocket natif Node 24, zéro dépendance ajoutée — script conservé hors dépôt). Tailles exactes `Emulation.setDeviceMetricsOverride` : **1440×900 et 320×700**. Profils injectés en `localStorage` : profil neuf (pages publiques) et profil connecté « Camille » avec événements/tâches (pages app), thème clair + thème sombre.
- **Aucune image n'est committée** : les 38 captures avant + 40 après (dont 2 preuves de fermeture de bannière) vivent hors dépôt dans `C:\Users\stark\Documents\nuage-shots\before|after\` (`pub_*` pages publiques, `app_*` pages app, `dark_*` sombre ; suffixe `__1440x900` / `__320x700`). Nommage : `pub_<route>__<taille>.png`.
- Pages passées au peigne fin : accueil `/`, `/inscription`, `/bienvenue`, `/aujourdhui`, `/planning`, `/taches`, `/voix`, `/stats`, `/reglages`, `/demo`, `/offres`, `/presse`, `/legal`, `/cgu`, `/confidentialite`, `/contact` — chacune en 1440×900 et 320×700, clair et sombre pour les pages clés. À chaque capture, mesure `scrollWidth` vs `clientWidth` : **0 débordement horizontal** sur les 78 captures.

### Auto-critique honnête, page par page (avant → après)

| Page | Avant (constaté sur capture) | Après — « finie parce que… » |
|---|---|---|
| `/` 1440 | logo+nom doublés (barre + hero), fond plat blanc uni, 3e argument « (localStorage) » | hero = monogramme dégradé seul (le nom vit dans la barre), slogan en dégradé violet, voiles pastel visibles, « sur cet appareil » — on respire, c'est cohérent |
| `/` 320 | header tassé : nom « Centeryou » collé au bouton « Créer mon compte » | monogramme seul sous `sm`, CTA en `px-4` : 30 px + bouton avec vrai espace, rien ne colle |
| `/planning` | « Semaine Du Lundi 23 Novembre » (classe `capitalize`), header « Lundi 23 Novembre » | « Semaine du lundi 23 novembre » / « Lundi 23 novembre » — casse française, plus de majuscules parasites |
| `/planning` 320 | bannière « Installer Centeryou » = grosse carte couvrant 1/4 de l'écran | pilule compacte 1 ligne (titre/desc masqués sous md) : discrète, et la croix la tue pour de bon (preuve CDP ci-dessous) |
| `/reglages` | « (variables Supabase non renseignées) », « (localStorage) », « snapshot vers le serveur », « par Stripe (Checkout + portail client) », « quota serveur » | « la sauvegarde en ligne n'est pas encore activée », « sur cet appareil », « une copie sur le serveur », « paiement sécurisé, en français », « voix premium illimitée » |
| `/voix` | « même parseur que l'ajout rapide » | « compris aussi dans la barre d'ajout rapide » |
| `/aujourdhui`, `/demo` | date en « Lundi 23 Novembre » (classe `capitalize`) | « Lundi 23 novembre » (capitalize JS, 1re lettre seule) |
| `/bienvenue`, `/inscription`, `/legal`, `/offres`, `/presse` | h1 en `md:text-3xl` (30 px, hors échelle Pinceau) vs `md:text-4xl` ailleurs ; `text-primary` (4,17:1) sur « ÉTAPE 1 SUR 3 » et des icônes ; `hover:bg-primary` (4,35:1) sur les CTA offres/presse | h1 unifié en `md:text-4xl`, `text-primarydark`, `hover:brightness-95` + `bg-cta` — échelle et AA restaurés |
| toutes | ombre dure, cartes denses | ombre diffuse + padding 24 px : les cartes « flottent » doucement sur les voiles |
| sombre (planning/réglages/aujourd'hui) | fond uni sombre | voiles sombres violet/teal cohérents, contrastes mesurés ≥ 6,4:1 pour le secondaire |
| film de lancement | date de scène en « … Novembre » (classe `capitalize`) ; bannière install par-dessus le film (z-toast 60 > z-dialog 50) | « Lundi 23 novembre » ; bannière passée en `z-nav` (40) → le film la couvre proprement |

**Preuve de fermeture persistante de la bannière** (CDP, 320×700, `after/proof-banner-open__320x700.png` puis `proof-banner-closed-next-page__320x700.png`) : bannière visible → clic sur la croix → `localStorage["centeryou-pwa-dismissed"]="1"` → invisible sur la même page, **à la page suivante ET après rechargement complet**. Avant : elle revenait à chaque chargement de page (état zustand non persisté).

## 3. Les micro-choses de Cactus, une par une

| Défaut Cactus | Correction | Fichier |
|---|---|---|
| « Semaine Du Lundi 16 Novembre » | classe `capitalize` retirée du h1 + `capitalize()` JS (1re lettre) ; idem top-nav, aujourd'hui, démo, film (2 lignes) | `planning/page.tsx`, `top-nav.tsx`, `aujourdhui-view.tsx`, `demo-view.tsx`, `launch-film.tsx` |
| Logo + nom doublés sur l'accueil | hero : monogramme seul 56 px (nom reste dans la barre) | `home-gate.tsx` |
| En-tête tassé à 320 px | `Logo` seul sous `sm` dans `PublicNav` et `TopNav` (nom dès `sm`) ; CTA `px-4 sm:px-5` | `public-nav.tsx`, `top-nav.tsx`, `logo.tsx` (props `className`) |
| Bannière install envahissante à 320 px | pilule compacte (titre/desc masqués sous md/sm, boutons `whitespace-nowrap`) | `install-prompt.tsx` |
| Bannière qui revient à la page suivante | fermeture écrite dans `localStorage` (`centeryou-pwa-dismissed`) + relue au montage ; z-nav pour passer sous le film | `install-prompt.tsx` |
| « (localStorage) » (accueil, onboarding, réglages) | « sur cet appareil » | `home-gate.tsx`, `onboarding-steps.tsx`, `reglages/page.tsx` |
| « variables Supabase non renseignées » | « la sauvegarde en ligne n'est pas encore activée » | `account-section.tsx` |
| Toast « STRIPE_SECRET_KEY manquante côté serveur » | 503 réécrit en français courant côté API (déploiement sans paiement) | `api/checkout/route.ts`, `api/portal/route.ts` (§6) |
| « parseur », « snapshot », « quota serveur », « par Stripe (Checkout + portail) », « fichier de sauvegarde JSON » | réécrits en français courant | `voix/page.tsx`, `reglages/page.tsx`, `plans.ts`, `subscription-card.tsx` |

## 4. Ce que j'ai découvert en plus en parcourant chaque page (et refermé)

- h1 hors échelle (`md:text-3xl`) sur 5 pages publiques → unifié `md:text-4xl` (bienvenue, inscription, legal, offres, presse).
- `text-primary` (4,17:1) encore présent sur des pages (Sourire les avait signalées hors zone) → `text-primarydark` (bienvenue ×2, offres, presse, réglages ×5, agendas-card) ; `text-voicetext` (3,30:1) en texte → `text-primarydark` (reglages, offres, agendas-card).
- `hover:bg-primary` (4,35:1 au survol, violation Sourire) sur les CTA de `/offres` et `/presse` → `hover:brightness-95` + `bg-cta`.
- Boutons/CTA primaires sans le voile dégradé (duplication de classes) → `.bg-cta` ajouté partout où il y a `bg-primarydark` en CTA (button, public-nav ×2, home-gate, demo, install, offres, presse, voice-fab, voice-panel, onglet actif des tabs).
- Logo en SVG uni avec `fill-primary` → dégradé violet dérivé des tokens ; **id de dégradé dupliqué corrigé** (3 logos sur une page → `useId()` par instance, sinon `url(#id)` se résolvait vers une defs invisible et le rond disparaissait à certaines tailles — vu sur capture 1440 px).
- `body` opaque (`bg-bg` sur le wrapper app-shell) masquait tout fond décoratif → wrapper transparent, fond uni remonté sur `<html>`.
- Classes `capitalize` restantes (5 endroits) retirées — la casse française se fait en JS.

## 5. Contrastes — mesures WCAG 2.1 après la ligne (script hors dépôt, formule officielle)

| Couple | Ratio | Seuil |
|---|---|---|
| `textSecondary` neuf `#5F6284` sur `#FAFAFC` (était `#6E7191` 4,54:1) | **5,65:1** | AA 4,5 ✅ |
| idem sous voile violet 9 % (pire cas fond clair) | **5,07:1** | ✅ |
| idem sous voile violet 10 % | 4,98:1 | ✅ |
| idem sous voile teal 7 % | 5,39:1 | ✅ |
| `muted` sombre `#A5A8C6` sur `#14141F` / sous voile 18 % | 7,84:1 / 6,46:1 | ✅ |
| bouton primaire : blanc sur `#5B3FE8` + voile blanc 12 % (`.bg-cta`) | **4,99:1** (6,32:1 sans voile) | ✅ |
| sombre : encre sur `#A794FF` + voile 12 % | 7,31:1 | ✅ |
| slogan dégradé (texte large 48 px gras, seuil 3:1) : `#7C5CFF`→`#5B3FE8` clair, `#7C5CFF`→`#A794FF` sombre | 4,17 / 6,07 / 4,20 / 7,24:1 | ✅ |
| encre sur fond voilé clair / sombre | 16,24:1 / 13,25:1 | ✅ |

Pourquoi `textSecondary` a bougé : `#6E7191` (4,54:1) n'avait aucune marge — un voile violet à 6 % faisait déjà tomber à ~4,2:1. Assombri à `#5F6284` (même hue, imperceptible), **hors de la liste figée** de AGENTS.md (qui ne fige que `#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E`) ; le test d'accessibilité ne fige que `≥ 4,5:1` et passe. Sourire (warning/danger) intact : le test « globals.css surcharge UNIQUEMENT --c-warning/--c-danger » passe toujours (mes voiles utilisent `rgb(var(--c-…))`, jamais de redéfinition `--c-…:`).

## 6. Extensions hors zone stricte — documentées, minimales, testées

- `src/app/api/checkout/route.ts` + `src/app/api/portal/route.ts` : **chaînes d'erreur 503 uniquement** réécrites en français courant (le toast client affichait le nom de la variable d'env — défaut 🔴 de Cactus). Aucun comportement changé (même statut 503).
- `tests/api-securite.test.ts` : UNE assertion ajustée (documentée dans le test) — elle exigeait que le 503 *contienne* « STRIPE_SECRET_KEY » ; elle exige désormais le message français ET l'absence du nom de variable (l'esprit « aucun détail interne » est renforcé, pas contourné). Aucun test supprimé.
- `src/lib/plans.ts` : un libellé d'offre (« Voix premium illimitée (quota serveur) » → « Voix premium illimitée »), aucun comportement.

## 7. Validation (branche, 2026-11-23 ~06:18 UTC)

- `npm test` : **572/572 ✅** (32 fichiers — base 572, aucun supprimé ; 1 assertion ajustée et documentée, §6).
- `npx tsc --noEmit` ✅ · `npm run build` ✅ « ✓ Compiled successfully », 23/23 pages.
- Smoke `next start` : **16/16 routes en 200** (`/`, `/inscription`, `/bienvenue`, `/demo`, `/offres`, `/presse`, `/legal`, `/cgu`, `/confidentialite`, `/contact`, `/aujourdhui`, `/planning`, `/taches`, `/voix`, `/stats`, `/reglages`).
- CSS compilé vérifié : `body:before{…radial-gradient…rgb(var(--c-primary)/.09)…}`, `html.dark body:before{…}`, `.bg-cta{background-image:linear-gradient(135deg,rgb(255 255 255/.12),…)}`, surcharges Sourire `html:root{--c-warning:160 96 0;--c-danger:192 58 58}` intactes.
- `git diff --name-only` : 32 fichiers, tous dans la zone + les 3 extensions documentées §6. `parser.ts` et tests du parseur **intacts** (M-31). `package.json`/lock inchangés. Aucun binaire, aucune image.

## 8. Hors périmètre M-23 — signalé, PAS codé (choix tranchés d'autres missions ou décisions contenu)

- **Dates absolues silencieuses** (« dentiste 14/12 10h » → aujourd'hui) : défaut n°1 de Cactus = **M-31 Almanach** (zone parser, en parallèle).
- **Prix Premium affiché sur `/offres`** : décision contenu (M-29/M-30 ou utilisateur) — la page reste sans prix, signalé à Cactus.
- « Sans rappel » manquant dans le défaut de rappel des Réglages ; bouton « Revoir le film » ; double parcours d'accueil (/inscription 1 champ vs /bienvenue 3 étapes, prénom non persisté à l'étape 1) ; stats qui ne regardent que le passé ; « c'est fait X » qui ne cherche que les tâches ; toasts « Événement ajouté » vs « C'est noté » non uniformes ; messages `BackupError` techniques dans `src/lib/backup.ts` ; toast « JSON invalide » — tout ça est **fonctionnel/microcopy Nord+**, hors « repeindre et finir », laissé à arbitrage M-32+.

## 9. Liens

- Branche `vibe/nuage-ligne-graphique` (poussée). Inscription M-23 sur `main` : commit `876f700` (05:28 UTC).
- PR brouillon base `main` : **« M-23 Nuage — la ligne directrice douce et aérienne »** — voir MISSIONS.md (section M-23, « PR #XX ouverte »).
- Captures avant/après (hors dépôt) : `C:\Users\stark\Documents\nuage-shots\before\` et `...\after\` (38 + 40 PNG, 1440×900 et 320×700, clair + sombre).
