# Nord — Journal de mission M-17 · Expérience utilisateur (campagne « Grand V », VAGUE 2)

- **Agent** : Nord (session Vibe Code dédiée). Branche : `vibe/nord-ux` (base `main` `2e52ebd`, inscription publiée sur main à 05:33 UTC). PR : brouillon, base `main` (lien en bas).
- **Zone étanche tenue** : `src/components/**` (microcopy, états, interactions — **aucun `className` modifié**, réservé à Pinceau M-18) + textes des pages `src/app/**` (fichiers page uniquement). **INTERDIT tenu** : `src/app/api/**`, `src/app/globals.css` (lu seulement), fichiers ICS (`src/lib/ics.ts`, `agendas-card.tsx`, tests ICS), `src/components/today/launch-film.tsx` et la carte « Sons » de `reglages/page.tsx` (laissés à Diapason M-16), `package.json` (zéro dépendance ajoutée), aucun test modifié.
- **Sources lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md`, tout `docs/journal/` — en particulier **apollon.md** (M-01 : textes FR, états vides déjà posés, parcours A/B/C/D), **cloche.md** (M-04 : rappels, toasts, réglages), **sourire.md** (M-10 : contrastes, aria — ne pas refaire), **realisateur.md** (M-06 : film = séquence d'accueil), **paillette.md** (M-05), **pont.md** (M-07 : import ICS = ajout uniquement, zone non touchée). Rien de déjà fait n'a été refait.
- **Baseline mesurée** (main `2e52ebd`, 2026-11-21 ~05:35 UTC) : `npm test` ✅ **457/457** (30 fichiers) · `npx tsc --noEmit` ✅.
- **Heures UTC** : ouverture 05:33 · corrections 05:35–06:30 · validation build/smoke ~06:30–06:50.

## Méthode

Audit « œil neuf » des 5 axes de la mission en lisant tout `src/components/**` et toutes les pages `src/app/**` (hors api), rejoué des parcours (vitrine → démo sans compte → inscription → onboarding → aujourd’hui + film → première action), grep systématiques (anglicismes, codes HTTP, « vous », jargon technique, toasts sans ponctuation, actions destructrices sans confirmation). Chaque correction ci-dessous est chirurgicale : **endroit, avant, après, pourquoi**.

## Corrections

### 1. Première fois — une seule règle pour « ajoute » (terminologie + parcours)

- **Endroit** : `src/components/tasks/quick-add.tsx` (`submitText`).
- **Avant** : toute saisie de la barre d’ajout rapide créait une **tâche**, même avec une heure (« sport demain 14h » → tâche à 14h00) — alors que la commande vocale et `/bienvenue` créent un **événement** dès qu’il y a une heure (règle posée par Apollon M-01). Toast : « Tâche ajoutée : … ». aria-label : « Ajout rapide de tâche en langage naturel ».
- **Après** : même règle partout — **une heure = événement, sinon tâche** (identique à `voice-commands.ts` et `bienvenue/page.tsx`) ; toast « Événement ajouté : « … » — … à …​. » ou « Tâche ajoutée : …​. ». aria-label : « Ajout rapide de tâche ou d’événement en langage naturel » (le test `/Ajout rapide de tâche/` passe toujours).
- **Pourquoi** : la vitrine promet « Dis “ajoute sport demain 14h” et Centeryou range ton agenda » ; un nouvel arrivant qui tape exactement cette phrase dans la grande barre obtenait une tâche, pas un créneau à l’agenda. Un concept = un comportement, une seule façon de le dire.

- **Endroit** : `src/components/help-dialog.tsx` (raccourci `T`).
- **Avant** : « Saisie rapide de tâche » · **Après** : « Saisie rapide (tâche ou événement) ».
- **Pourquoi** : même règle, même mot.

- **Endroit** : `src/app/taches/page.tsx` (astuce sous la barre).
- **Avant** : « Astuce : “sport demain 14h” · “médecin mardi 10h30 santé” · “rapport vendredi” · “!lundi réunion” » (exemples mélangés, sans explication).
- **Après** : « Astuce : “rapport vendredi” ou “!lundi réunion” créent une tâche · “sport demain 14h” crée un événement à l’agenda. »
- **Pourquoi** : on enseigne la règle en 10 secondes au lieu de laisser deviner.

- **Endroit** : `src/components/tasks/quick-add.tsx` (`DEFAULT_PLACEHOLDER`).
- **Avant** : « Ajoute vite : “sport demain 14h”, “médecin mardi 10h30 santé”, “!lundi réunion”… » · **Après** : « Ajoute vite : “rapport vendredi” ou “sport demain 14h”… ».
- **Pourquoi** : un exemple de chaque sorte, pas quatre exemples dont trois avec heure.

### 2. États vides — jamais un grand blanc

- **Endroit** : `src/app/planning/page.tsx`.
- **Avant** : si la période affichée (jour / semaine / mois) ne contient rien, la grille s’affiche vide, sans aucun message (l’état vide global n’existe que quand il n’y a zéro donnée du tout).
- **Après** : une note douce au-dessus de la grille, qui reste cliquable : « Journée libre — clique sur un créneau de la grille pour créer un événement. » / « Semaine libre — clique sur un créneau pour créer un événement. » / « Rien de prévu ce mois-ci — clique sur un jour pour créer un événement. » (calcul via `calendarOnDate` en vues Jour/Semaine, `calendarMonthOnDate` en vue Mois pour compter aussi les tâches sans heure).
- **Pourquoi** : la mission cite explicitement la « semaine déserte » ; un nouvel arrivant qui navigue à une semaine vide comprenait « cassé » au lieu de « libre ».

- **Endroit** : `src/components/today/aujourdhui-view.tsx` (carte « Tâches du jour » vide).
- **Avant** : `EmptyState` avec titre + description seulement, et un exemple « sport demain 14h » qui créait… une tâche à heure (faux depuis la règle ci-dessus).
- **Après** : `example="!lundi réunion"` (vraie tâche) + `action={{ label: 'Ajouter une tâche', onClick: focus quick-add }}`.
- **Pourquoi** : chaque vue vide propose la prochaine action concrète (mission §2) et l’exemple correspond au concept « tâche ».

- **Endroit** : `src/app/taches/page.tsx` (état vide des filtres Actives/Terminées).
- **Avant** : `action` seulement quand filtre = « Toutes » · **Après** : bouton « Ajouter une tâche » (focus barre) pour tous les filtres ; libellé « Ajouter ma première tâche » conservé pour « Toutes ».
- **Pourquoi** : un filtre vide proposait « change de filtre » mais aucune action directe.

(Déjà solides, laissés tels quels — Apollon M-01 : état vide global du planning, `/stats` vierge, compteur « Aucune tâche pour l’instant », note « Journée libre côté agenda » sur Aujourd’hui, démo en lecture seule.)

### 3. Erreurs humaines — quoi, pourquoi, action suivante

- **Endroit** : `src/app/reglages/page.tsx` (`onFilePicked`, deux toasts de repli).
- **Avant** : « Impossible de lire ce fichier. » / « Fichier de sauvegarde invalide. » (quoi, mais pas l’action suivante).
- **Après** : « Impossible de lire ce fichier — choisis le fichier .json téléchargé depuis Centeryou (“Sauvegarder mes données”). Rien n’a été modifié. » / « Ce fichier ne ressemble pas à une sauvegarde Centeryou — rien n’a été modifié. Choisis le fichier .json téléchargé depuis Centeryou. »
- **Pourquoi** : jamais de code technique ni de blâme ; on dit que rien n’a changé et quel fichier choisir. (Les messages détaillés de `BackupError` viennent de `src/lib/backup.ts`, hors zone, laissés tels quels.)

- **Endroit** : `src/components/account/account-section.tsx` + `sync-offer-dialog.tsx` (toasts de synchro).
- **Avant** : « Enregistrement en ligne impossible pour le moment » (sans dire que les données sont sauves) · « Enregistrement reporté (hors ligne ou erreur réseau) » (jargon « erreur réseau »).
- **Après** : « Enregistrement en ligne impossible pour le moment — tes données restent dans ce navigateur. » · « Enregistrement reporté : hors ligne pour le moment, réessayé à la reconnexion. »
- **Pourquoi** : l’erreur explique la conséquence rassurante (rien n’est perdu, c’est local) et la prochaine étape (réessai auto), sans jargon.

(Déjà humains et FR, laissés tels quels : erreurs du dialogue événement, `frenchAuthError` pour Supabase, écran `ErrorScreen`, toast de stockage plein/corrompu réparé, messages ICS de Pont.)

### 4. Sûreté — confirmation douce ou « Annuler » partout (audit + 1 renforcement)

- **Vérifié sans changement** : suppression d’événement (`event-dialog.tsx`) et de tâche (`task-item.tsx`, `task-actions-menu.tsx`) → sortie douce + toast **« Annuler »** qui restaure ; « Effacer toutes mes données » → double clic « Cliquer encore pour confirmer la suppression » (fenêtre 4 s) ; « Supprimer mon compte et mes données » → panneau « Es-tu sûr de vouloir continuer ? … définitive » + **Annuler** ; import `.ics` → aperçu + **Annuler**, ajout sans jamais écraser (zone Pont, non touchée) ; déconnexion → toast explicite « tes données restent dans ce navigateur ».
- **Endroit** : `src/app/reglages/page.tsx` (bloc de confirmation de la **restauration** d’une sauvegarde).
- **Avant** : « Confirmer la restauration (X événements, Y tâches) » + « Annuler », sans avertir que les données actuelles sont remplacées (seul le toast d’après le disait).
- **Après** : panneau d’avertissement « **Attention :** tes événements, tâches et réglages actuels seront **remplacés** par ceux du fichier (…) » + « Confirmer la restauration » + « Annuler ».
- **Pourquoi** : la mission demande explicitement que l’import qui écrase soit précédé d’une confirmation explicite ; le bouton garde son nom (test `/confirmer la restauration/i` intact).

### 5. Terminologie — un seul mot par concept, tutoiement, ponctuation

- **Compte local vs compte en ligne** (deux concepts, un seul mot « compte » avant) :
  - `src/components/account/account-section.tsx` : « Sans compte, tout reste… » → « Sans **compte en ligne**, tout reste dans ce navigateur. Avec un **compte en ligne** gratuit (e-mail + mot de passe)… » ; bouton « Créer un compte » → « Créer un compte **en ligne** ».
  - `src/components/account/auth-dialog.tsx` : titre inscription → « Créer un compte en ligne » ; bouton → « Créer mon compte en ligne » ; lien → « Pas encore de compte en ligne ? Créer un compte en ligne » ; note de bas → « Sans compte en ligne, Centeryou fonctionne exactement comme avant… ».
  - **Pourquoi** : la vitrine mène à « Créer mon compte » (profil **local**, inscription-card : « Ton compte, sur cet appareil ») tandis que Réglages proposait aussi « Créer un compte » (Supabase, e-mail + mot de passe) : un nouvel arrivant pensait ne pas avoir de compte. Désormais « compte » = local (le compte principal), « compte en ligne » = la sauvegarde facultative.
- **« notification » → « rappel »** : `src/components/events/event-dialog.tsx`, explication du champ « Me rappeler » : « Notification locale envoyée par ton navigateur… » → « **Rappel** envoyé par ton navigateur… » (le concept s’appelle « rappel » partout : réglages, service, toasts).
- **Tutoiement** : `src/app/legal/page.tsx` était la seule page en « vous » (CGU et confidentialité tutoient) : « votre navigateur » → « ton navigateur », « si vous les activez » → « si tu les actives », « sauvegarde de vos données » → « de tes données », « votre carte » → « ta carte », « Vous pouvez » → « Tu peux », « toutes vos données » → « toutes tes données », « si vous en avez un » → « si tu en as un », « action de l’utilisateur » → « action de ta part » (+ méta-description). **Pourquoi** : tutoiement cohérent sur 100 % de l’interface.
- **Ponctuation homogène des toasts** (toute phrase se termine par un point) : `event-dialog.tsx` « Événement ajouté/modifié : « … » » et « « … » supprimé » ; `use-event-actions.ts` « « … » déplacé au … » ; `task-item.tsx` / `task-actions-menu.tsx` « « … » supprimée » ; `reglages/page.tsx` « Toutes les données ont été effacées. » et « Ton compte et tes données ont été supprimés. » ; `account-section.tsx` « Déconnecté — … navigateur. ».
- **Deux cartes pour un seul réglage** : `src/app/reglages/page.tsx`, carte « Séquence d’accueil » : note « Réglage **historique** … repris par le film de lancement **ci-dessus** » (faux : la carte film est **ci-dessous**, et « historique » ne veut rien dire pour un nouvel arrivant) → « La séquence d’accueil est devenue le film de lancement (carte ci-dessous) : les deux réglages restent synchronisés, choisis l’un ou l’autre. La voix se règle avec la bascule “Voix du film”. » ; option « Désactivée » → « Jamais » (identique à la carte « Film de lancement » : une valeur = un libellé). Labels des deux selects inchangés (tests `/séquence d’accueil/i` et `/film de lancement/i` intacts).
- **Jargon retiré de la page publique** : `src/app/voix/page.tsx` : « (ElevenLabs, côté serveur via `/api/voix`, quota serveur de 300 caractères/jour) » → « (hébergée par nos soins, jamais exposée dans ton navigateur) ». **Pourquoi** : un inconnu le 1er janvier ne doit voir aucun nom de fournisseur ni de route API.

## Hors périmètre (constaté, documenté, PAS codé)

- `src/lib/backup.ts` : messages `BackupError` détaillés mais techniques (« JSON invalide », etc.) — hors zone (src/lib), signalé ici pour une future mission.
- Indicateur de synchro (`sync-indicator.tsx`) : libellés d’état sans point (« Enregistré ✓ ») — laissés tels quels : ce sont des étiquettes, pas des phrases (cohérence retenue : phrase = point, étiquette = pas de point).
- `launch-film.tsx` et carte « Sons » de `reglages/page.tsx` : zone Diapason (M-16) cette vague — non touchés.
- Chevauchement `reglages/page.tsx` avec Diapason : mes seules retouches y sont textuelles (carte « Données locales » + notes des cartes film), aucune classe — fusion propre en régions distinctes.

## Validation

- `npx tsc --noEmit` ✅ · `npm test` ✅ **457/457** (30 fichiers, **aucun test modifié**) · `npm run test:parser` ✅ · `npm run build` ✅ (voir log de build).
- Smoke `next start` : 19/19 routes en 200 (`/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages`, `/voix`, `/bienvenue`, `/demo`, `/offres`, `/cgu`, `/inscription`, `/contact`, `/presse`, `/legal`, `/confidentialite`, `/onboarding`, `/robots.txt`, `/sitemap.xml`, `/opengraph-image`).
- Parcours rejoués sur le build local : vitrine → « Voir la démo » (lecture seule) → « Créer mon compte » → prénom → onboarding → aujourd’hui (film « Lancer le film ») → saisie « sport demain 14h » dans la grande barre → **événement** créé à l’agenda (règle unique) → toast « Événement ajouté : « sport » — … » ; planning sur une semaine vide → note « Semaine libre — … » ; restauration de sauvegarde → panneau « Attention : … remplacés … » + Annuler ; suppression de compte → double confirmation + Annuler.
- Zéro dépendance (`package.json`/lockfile intacts), tokens intacts, interface 100 % FR, aucun `className` modifié dans `src/components/**`, aucun fichier hors zone.

## Liens

- Branche : `vibe/nord-ux` (poussée, commit `2981476`) · PR : **https://github.com/User313MSI/Centeryou/pull/37** (brouillon, base `main`).
- Inscription M-17 publiée sur `main` à 05:33 UTC (commit `2e52ebd`).
