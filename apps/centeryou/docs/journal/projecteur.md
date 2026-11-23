# Projecteur — Journal de mission M-30 · Kit de lancement réseaux sociaux

- **Agent** : Projecteur (session Vibe dédiée). Branche : `vibe/projecteur-reseaux` (base `main` `c8e3491`, inscription M-30 publiée à 07:1x UTC en commit MISSIONS.md seul : « branche créée, en cours »).
- **Zone tenue** : `apps/centeryou/docs/marketing/reseaux/**` (12 fichiers texte), `apps/centeryou/docs/journal/projecteur.md`, `apps/centeryou/docs/MISSIONS.md` (inscription). **Aucun code touché**, aucune image binaire committée (grep le prouve), `git diff --name-only` en fin de mission.
- **Sources lues avant d'écrire** : `AGENTS.md`, `docs/MISSIONS.md` (section M-30), les 5 documents `docs/marketing/` (POSITIONNEMENT, COPY-VITRINE, PLAN-LANCEMENT, POSTS-RESEAUX, EMAILS), les CGU de l'app (`src/app/cgu/page.tsx` — prix exact art. 4 : « Offre Premium — 4,99 €/mois TTC, facultative et sans engagement », lu depuis `src/lib/plans.ts` `priceMonthlyEur: 4.99`), et les journaux `cactus.md` (M-28, parcours réel client), `banquier.md` (M-26, prix/économie/limites réelles : pas de synchro live Google, paiement pas encore activé), `nuage.md` (M-23, **ligne graphique « douce et aérienne »** : voiles pastel violet/turquoise, dégradés discrets, ondes réservées à la voix, palette figée `#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E`).
- **Faits vérifiés dans le code de `main` avant chaque claim** : slogan `SLOGAN = 'Ton planning qui te parle'` (`src/lib/site.ts`) ; film de lancement 5 scènes, 38,2 s (`SCENE_DURATIONS` `src/components/today/launch-film.tsx`), salutation+prénom+chiffres du jour+semaine+scène « magie » (`src/lib/launch-film.ts`), carte « Ton brief du matin » + « Écouter mon brief du jour » (`src/components/today/brief-card.tsx`) ; barre « Ajoute vite : sport demain 14h… » (`src/components/tasks/quick-add.tsx`) ; parseur FR + dates absolues M-31 (`src/lib/parser.ts`) ; page `/voix` et ses 4 commandes (`src/app/voix/page.tsx`) ; Réglages « Données locales » → « Sauvegarder mes données » / « Effacer toutes mes données » (`src/app/reglages/page.tsx`) ; `/inscription` = 1 champ prénom, aucun e-mail ; `/demo` = semaine de Sofia, lecture seule ; offres (`src/lib/plans.ts` : Découverte 0 €, Premium 4,99 €/mois, 3 essais voix premium/mois) ; rappels locaux « pas si l'application est complètement fermée ».
- **Heures UTC** : 07:18 début (branche + inscription) · 07:2x–07:5x rédaction du kit · build + vérifications après.

---

## 1. Livrables (tout en texte réutilisable, 100 % français, dans `docs/marketing/reseaux/`)

| Fichier | Contenu |
|---|---|
| `README.md` | Index du kit + conventions (9:16, accroche 0–3 s, prix exact, URL) |
| `video-01-le-film-du-matin.md` | Script star ~40 s — le film du matin (5 plans minutés, VO, indications de tournage `/aujourdhui`) |
| `video-02-sport-demain-14h.md` | Script ~30 s — la saisie « sport demain 14h » (tournage `/aujourdhui` → `/planning`) |
| `video-03-la-voix-francaise.md` | Script ~35 s — la voix (tournage `/voix`, champ texte ou micro) |
| `video-04-tout-reste-chez-toi.md` | Script ~40 s — confidentialité (tournage `/reglages` → Données locales) |
| `video-05-sans-compte.md` | Script ~30 s — planning sans compte (tournage `/inscription` + `/demo`) |
| `video-06-lancement-1er-janvier.md` | Script ~25 s — lancement J-0 (gratuit d'abord, puis prix exact) |
| `posts-instagram.md` | 8 posts IG : légende complète + carrousel slide par slide + suggestion d'image + hashtags FR |
| `fil-linkedin.md` | Fil LinkedIn 8 messages, vouvoiement, angle « comment Centeryou traite vos données » |
| `fil-x.md` | Fil X 8 messages, direct + variante courte J-1 |
| `calendrier-teasing.md` | Teasing 23/11/2026 (J-39) → 01/01/2027 (J-0), 6 phases, compte à rebours final J-6…J-1 |
| `REGLES.md` | Formules autorisées / interdites + check 30 s avant publication |

Chaque script vidéo contient : **accroche dans les 3 premières secondes**, plans numérotés avec minutage, **texte affiché à l'écran**, **texte de la voix off**, **indications de tournage écran** (quelle page ouvrir, quoi taper/cliquer). Durées : 25–40 s, toutes dans la fenêtre 20–45 s demandée, format vertical 9:16.

## 2. Règles d'or appliquées (vérifiées par grep sur `reseaux/**`)

- **Aucune promesse non vérifiable** : chaque claim est sourcé dans le fichier même (composant/lib de `main`). Grep interdit : `synchro|Google|Apple|Outlook|sauvegarde en ligne|cloud|illimitée` → 0 occurrence présentée comme active (les seuls passages « Google/Apple » sont dans REGLES.md et le calendrier, en **interdiction** de les annoncer).
- **Prix exact** : la seule formulation prix du kit est « Premium à 4,99 € par mois, sans engagement » (CGU art. 4), toujours après l'offre gratuite Découverte 0 € (post 6, post 8, vidéo 6, fil X message 7, fil LinkedIn message 7).
- **Aucune image binaire** : `git status` / `git diff --name-only` = uniquement des `.md`.
- **Ton « doux et aérien »** : tutoiement chaleureux IG/TikTok/X, vouvoiement naturel LinkedIn, zéro jargon (checklist REGLES.md § jargon), visuels décrits avec la palette Nuage (voiles pastel, dégradé violet discret, ondes = voix uniquement).
- **« Sans compte » et jamais « sans inscription »** (règle COPY-VITRINE) ; rappels présentés honnêtement (post 7).
- **URL** : `centeryou.app` toujours accompagné du rappel « remplacer par l'URL de production réelle — ne jamais inventer d'URL ».

## 3. Git

- `vibe/projecteur-reseaux` créée depuis `origin/main` `c8e3491`, pull à jour, **commit 1 = MISSIONS.md seul** (« branche créée, en cours »), push.
- Puis commit du kit + journal, push, **PR brouillon base `main`** (titre : « M-30 Projecteur — kit réseaux complet (6 vidéos, 8 posts, 2 fils, calendrier J-38) »), puis inscription « PR #XX ouverte » dans MISSIONS.md, push final.
- Build : `npm run build` exécuté avant PR (docs uniquement — voir §4).

## 4. Validation

- `grep` de contrôle sur `docs/marketing/reseaux/` (termes interdits, prix) : résultats notés ci-dessous §5.
- `npm run build` en local : ✅ (23 routes, 0 erreur).
- CI PR #50 : premier run **failure** sur `next/font` (« TypeError: Cannot read properties of null (reading '1') » — faux positif d'infra connu, documenté journal Verrou M-13 : 3 faux échecs CI déjà identifiés ; mon diff est 100 % docs) → **relance une fois** → run 137548618007 **success ✅** (tests Vitest + build Next.js bloquants au vert, 07:32 UTC).
- `git diff --name-only origin/main...HEAD` : zone respectée — uniquement `docs/marketing/reseaux/**` (12 fichiers .md) + `docs/journal/projecteur.md` + `docs/MISSIONS.md`.

## 5. Résultats des greps de contrôle (23/11, ~07:5x UTC)

- `grep -ri "google\|apple\|outlook" reseaux/` → hits uniquement dans REGLES.md / calendrier / fil-linkedin en formulation **négative** (« pas de synchro Google/Apple », « nous ne synchronisons pas avec Google ou Apple »).
- `grep -ri "sauvegarde en ligne\|cloud\|compte en ligne" reseaux/` → hits uniquement en interdiction (REGLES.md) ou « les comptes en ligne arrivent, on ne les annonce pas » (fil-linkedin, video-04).
- `grep -rn "4,99" reseaux/` → chaque occurrence est la formule exacte « Premium à 4,99 € par mois, sans engagement ».
- Aucun fichier binaire ajouté.

## 6. Hors périmètre (non fait, volontairement)

- Aucune modification de code, de tests, de `plans.ts`, des pages légales.
- Pas de publication réelle (les comptes réseaux et l'URL de prod appartiennent à l'utilisateur).
- Les e-mails E1–E5 existent déjà (`EMAILS.MD`) — le calendrier les référence sans les réécrire.

## 7. Liens

- Branche : `vibe/projecteur-reseaux` (poussée, 3 commits : inscription MISSIONS.md seule → kit + journal → « PR #50 ouverte »).
- PR : **#50** — https://github.com/User313MSI/Centeryou/pull/50 (brouillon, base `main`, ouverte le 23/11 à 07:27 UTC ; CI bloquante verte après 1 relance de faux échec `next/font`). Inscription MISSIONS.md section M-30 : « PR #50 ouverte ».
