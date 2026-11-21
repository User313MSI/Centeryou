# Journal — Trompette

## Mission M-15 — Marketing & plan de lancement (campagne « Grand V », vague 1)

- **Agent** : Trompette (session Vibe Code dédiée). Branche : `vibe/trompette-marketing` (base `main`).
- **Zone étanche** : `apps/centeryou/docs/marketing/**` UNIQUEMENT + ce journal. **Aucun fichier de code touché** — mission docs uniquement.
- **PR** : **https://github.com/User313MSI/Centeryou/pull/31** (brouillon, base `main`, ouverte le 2026-11-21 à 03:31 UTC, head `vibe/trompette-marketing` @ `4cdb6fd`). Fusion réservée à Vibe Work.

### Références lues avant d'écrire
- `AGENTS.md`, `apps/centeryou/docs/MISSIONS.md` (règles Grand V : publier MISSIONS.md sur main à l'ouverture de la branche et à la PR, pull d'abord), tous les journaux de `docs/journal/` (pas de chevauchement : personne d'autre n'écrit dans `docs/marketing/`).
- Produit vérifié **dans le code de `main`** (règle d'or « tout doit être vrai aujourd'hui ») : `src/lib/plans.ts` (Découverte 0 € / Premium 4,99 €/mois, 3 essais voix premium/mois gratuits), `src/lib/parser.ts` (« sport demain 14h », « !lundi réunion », catégories, priorités), `src/lib/voice-commands.ts` + `src/app/voix/page.tsx` (« ajoute… », « mon programme », « quoi de prévu demain ? », « c'est fait sport »), `src/lib/launch-film.ts` + `src/lib/brief.ts` (film 5 scènes ~38 s, salutation selon l'heure réelle + prénom, voix = brief du matin), `src/lib/rappels.ts` (notifications **locales**, app ouverte/arrière-plan — limite honnête documentée), `src/lib/celebrate.ts` (confettis/vibration/onde), `src/app/reglages/page.tsx` (mode sombre, effacement des données), `apps/centeryou-desktop/README.md` (installateur NSIS Windows, release `bureau-v1.0`), `src/app/legal` + `confidentialite` (localStorage par défaut, compte facultatif Supabase, voix premium via ElevenLabs, aucun traceur), `src/app/presse/page.tsx` (fiche de presse prête), `src/components/landing/home-gate.tsx` (textes actuels de `/` pour COPY-VITRINE), `brand.config.json` (palette, slogan « Ton planning qui te parle »).
- **Fonctionnalités volontairement NON citées** (pas encore fusionnées sur main au 21/11) : export/import .ics (M-07, PR #29 en brouillon), créneaux suggérés (M-12, branche ouverte). Règle d'or : on ne promet que ce qui est vrai aujourd'hui.

### Étapes (heure UTC)
- 2026-11-21 03:26 — `git fetch origin` (main à `d3c67e9`), worktree temporaire sur `origin/main` pour la publication.
- 2026-11-21 03:27 — **MISSIONS.md publié sur main** (commit `e84c7cc`, poussé sur `main`, fichier `apps/centeryou/docs/MISSIONS.md` uniquement, pull fait d'abord) : entrée M-15 passée à « EN COURS, EN PARALLÈLE — branche `vibe/trompette-marketing` ouverte le 21/11 à 03:27 UTC ».
- 2026-11-21 03:27 — branche `vibe/trompette-marketing` créée depuis `origin/main`, worktree `Centeryou-wt-trompette`.
- 2026-11-21 03:30–03:50 — rédaction des 5 livrables dans `apps/centeryou/docs/marketing/` :
  - `POSITIONNEMENT.MD` — phrase d'or « Le seul planning qui te souhaite bon matin. » (9 mots), 3 promesses avec preuves vérifiées dans le code, portrait de l'utilisateur idéal (Camille, actif débordé + portraits secondaires étudiant/famille), positions concurrentes (Google Agenda froid / Fantastical cher et mal traduit / Notion pas un agenda), différenciation « ton planning te parle » + « le seul qui te souhaite bon matin ».
  - `COPY-VITRINE.MD` — refonte proposée des textes de `/` : titre, sous-titre, 3 blocs, CTA « Essayer sans compte » (vrai : profil local sans serveur, aucun e-mail), section réassurance (données privées / 100 % français / gratuit), FAQ de vente avec objections prix répondues honnêtement (gratuit suffisant sur un appareil ; limite honnête des rappels ; voix premium = ElevenLabs, documenté). Textes proposés uniquement, aucun code.
  - `PLAN-LANCEMENT.MD` — countdown 21/11 (J-41) → 1/01/2027 (J-0) en 6 phases (teasing, coulisses, démo vidéo du film, preuves/bêta, fêtes, compte à rebours final, jour J), 5 plateformes FR (Reddit r/antitaff + r/etudiants, presse tech FR via `/presse`, LinkedIn FR, Discords étude/routine FR, TikTok/Reels/Shorts), message de jour J mot pour mot + variante courte.
  - `POSTS-RESEAUX.MD` — 10 posts prêts à copier (accroche + texte + visuel) : 3 LinkedIn, 2 Instagram, 2 TikTok/Shorts (scripts vidéo 9:16 du film et du parseur), 2 Reddit (r/antitaff, r/etudiants), 1 X.
  - `EMAILS.MD` — 5 e-mails prêts : E1 annonce (21/11), E2 veille du jour J (31/12 20h), E3 jour J (1/01 8h), E4 bienvenue nouvel utilisateur, E5 relance douce J+7 (zéro culpabilité, désinscription facile).
- 2026-11-21 03:31 — commit `4cdb6fd` + push `vibe/trompette-marketing`, **PR #31 ouverte en brouillon** (base `main`) : https://github.com/User313MSI/Centeryou/pull/31
- 2026-11-21 03:32 — **MISSIONS.md publié sur main à la PR** (pull d'abord : main passé à `9e25108`, commit `ff5e176`, fichier `apps/centeryou/docs/MISSIONS.md` uniquement) : entrée M-15 mise à jour avec le lien PR #31 et le détail des livrables.
- 2026-11-21 03:33 — journal finalisé (ce commit) + push.

### Décisions importantes
- **Règle d'or appliquée à la lettre** : chaque promesse marketing est adossée à une preuve vérifiable dans le code de `main` au 21/11 (parseur, film, voix, rappels, mode sombre, local-first, plans 0 €/4,99 €). Les fonctions en cours (ICS M-07, créneaux M-12) ne sont **pas** mentionnées. La limite des rappels (app ouverte/arrière-plan seulement) est dite telle quelle, dans la FAQ et l'e-mail de bienvenue.
- **« Essayer sans compte » est honnête** : l'inscription ne crée qu'un profil local (prénom dans le navigateur), aucun compte serveur ni e-mail — documenté dans COPY-VITRINE pour que l'équipe produit ne soit pas surprise.
- **Ton** : chaleureux, direct, jamais corporate, jamais hype — aucun superlatif vide, aucune promesse « révolutionnaire ».
- Aucun test à écrire (mission docs) ; validation = qualité d'écriture + véracité des promesses. `npm run build` non concerné (aucun fichier de code modifié).
