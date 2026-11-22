# Cactus — Journal de mission M-28 · Le client râleur, test d'utilisabilité impitoyable (lecture seule)

- **Agent** : Cactus (session Vibe dédiée). Branche : `vibe/cactus-raleur` (base `main` `0a34c9a`, inscription publiée sur main à 04:46 UTC).
- **Méthode** : AUCUN fichier de code modifié. App lancée en local depuis `main` (`npm run build` ✅ puis `next start` sur `http://127.0.0.1:3129`) et pilotée comme un vrai client dans Chrome headless (CDP) : vraies pages, vrais clics, vrais champs, captures d'écran à chaque étape, `localStorage` inspecté après chaque action, console surveillée (zéro erreur en production). Parcours joués de bout en bout : accueil, inscription, /bienvenue, saisie rapide, voix (écrite + micro), planning jour/semaine/mois, rappels, stats, film de lancement, tous les réglages basculés un par un, 320 px, mode sombre, offres/abonnement, suppression. Heures UTC : ouverture 04:46 · tests 04:50–05:15 · rapport 05:17.
- **Ce sur quoi je ne râle PAS (déjà tranché, vu dans `journal/nord.md` et MISSIONS.md)** : la règle « une heure = événement, sinon tâche » (M-01/Nord), les états vides (« Semaine libre — clique sur un créneau… »), les confirmations douces avec « Annuler », la terminologie « compte local » vs « compte en ligne », le tutoiement, la double carte film/séquence synchronisée, la voix « robotique » (premium pas encore activée = normal), le film qui « s'affiche mal » (déjà signalé au 2e test utilisateur, mission M-21 Cinéaste EN COURS — je confirme juste la gravité, je ne la re-signale pas comme découverte).

---

## Mon parcours de client, et ce qui m'a fait râler

### 1. Première arrivée sur la page d'accueil (1440 px, écran neuf)

J'arrive sur `/`. En 5 secondes je comprends : « Ton planning qui te parle », deux boutons « Créer mon compte » / « Voir la démo », trois arguments, un aperçu. C'est clair. ✅

Mais dans le 3e argument : « Aucun compte serveur : tout reste dans ce navigateur **(localStorage)**. »
🟡 **« localStorage, c'est quoi ? Moi je veux savoir que mes données restent CHEZ MOI, pas dans un mot d'informaticien. »** — écran : accueil `/`, 3e carte « Tes données restent les tiennes ».

Autre détail : le logo + « Centeryou » apparaît DEUX fois (barre du haut + hero). À 320 px le bouton « Créer mon compte » du haut est collé au logo, ça fait tassé.
🟡 « Pourquoi le logo deux fois ? »

### 2. Inscription / démarrage — combien d'étapes avant mon premier événement ?

**Parcours A — par le bouton « Créer mon compte » :** `/inscription` → un seul champ « Comment t'appelles-tu ? » → je tape « Camille » → « Créer mon compte » → **je tombe directement sur /aujourd'hui, avec le film qui se lance tout seul par-dessus** (voir §7). Je clique « Passer », je tape « sport demain 14h » dans la grande barre → Entrée → toast « Événement ajouté : « Sport » — lun. 23 nov. à 14h00. » ✅. **Total : 1 champ + 1 clic « Passer » + 1 saisie.** plutôt bien.

🟠 Mais : la page `/onboarding` (« Trois choses à savoir », 3 étapes) existe… **et n'est jamais montrée** : le code pousse vers `/onboarding` mais une redirection concurrente renvoie sur `/aujourdhui`. « Il y a une page d'onboarding dans le code, personne ne la verra jamais. »

**Parcours B — par « Ouvrir mon aujourd'hui → » (ou n'importe quel lien app) sans compte :** je suis renvoyé sur `/bienvenue`, **3 étapes** : ① « Comment tu t'appelles ? » ② « Raconte-moi ta vie — ton premier événement ? » ③ « Tout est prêt — C'est parti ! ». Là, la saisie « sport demain 14h » marche aussi (toast « C'est noté : « Sport » — … »).

🟠 **« Deux parcours d'accueil différents selon le bouton sur lequel j'ai cliqué. »** Le parcours A fait 1 étape, le parcours B en fait 3. Et pire :

🟠 **Le prénom de l'étape 1 n'est enregistré qu'à la toute fin.** J'ai fait étape 1 → étape 2, je clique sur « Planning » dans le menu en haut → **je suis renvoyé à /bienvenue ÉTAPE 1 avec le champ prénom VIDE** (`localStorage` : `settings.prenom = ""`). « J'ai déjà répondu à cette question, pourquoi on me la repose, et pourquoi j'ai perdu ma réponse ? » Si je ferme l'onglet à l'étape 2, tout est perdu.

🟠 **Deux formulations pour la même action** : barre d'ajout → « Événement ajouté : « Sport » — lun. 23 nov. à 14h00. » ; bienvenue/voix → « C'est noté : « Sport »… » ; commande vocale écrite → « Ajouté à tes tâches : … ». « L'app se contredit d'un écran à l'autre. »

### 3. Saisie rapide au clavier — là où ça coince vraiment

La barre « Ajoute vite : sport demain 14h… » comprend très bien les dates relatives : `demain`, `jeudi 18h`, `dans 3 jours 18h`, `dans 2 semaines`, `ce soir` (→ 19h), `midi`, `!lundi` (priorité haute), les catégories (`santé`). Titres propres (« Sport », pas ma phrase entière — M-22 ✅).

🔴 **Mais AUCUNE date absolue n'est reconnue, et c'est mis à aujourd'hui SANS prévenir.** Tests réels, barre d'ajout sur /aujourd'hui, champ `#quick-add-input`, touche Entrée :

| Je tape | Ce que l'app fait | Le toast exact |
|---|---|---|
| `dentiste 14/12/2026 10h` | **Événement AUJOURD'HUI 10h00**, titre « Dentiste 14/12/2026 » | « Événement ajouté : « Dentiste 14/12/2026 » — dim. 22 nov. à 10h00. » |
| `réunion le 3 janvier 9h` | **Événement AUJOURD'HUI 09h00** | « Événement ajouté : « Réunion le 3 janvier » — dim. 22 nov. à 09h00. » |
| `14 décembre 10h` | **Événement AUJOURD'HUI 10h00**, titre « 14 décembre » | « Événement ajouté : « 14 décembre » — dim. 22 nov. à 10h00. » |
| `anniversaires maman 14 décembre` | **Tâche AUJOURD'HUI**, titre « Anniversaires maman 14 décembre » | « Tâche ajoutée : « Anniversaires maman 14 décembre » — dim. 22 nov. » |
| `noël 25 décembre` | Tâche aujourd'hui, « 25 décembre » reste dans le titre | « Tâche ajoutée : « Noël 25 décembre » — dim. 22 nov. » |

**« J'ai dit 14 décembre à 10h, l'app m'a mis aujourd'hui à 10h. Si je relis pas le toast, je rate mon dentiste. C'est INSUPPORTABLE, je quitte l'app à cet instant. »** 🔴 — vérifié dans `localStorage` (`centeryou-v1`) : `{"t":"Dentiste 14/12/2026","d":"2026-11-22","s":"10:00"}`. Le parseur (`src/lib/parser.ts`) ne connaît que aujourd'hui/demain/après-demain/jours de semaine/dans N jours — aucun « 14 décembre », aucun « 14/12 », aucun « 14/12/2026 ».

### 4. Dictée vocale

Page `/voix` : gros bouton micro, champ texte « secours », 4 boutons d'exemples, liste des commandes comprises. Le texte tapé marche très bien : « quoi de prévu demain ? » → « Camille, demain, 1 événement prévu : Sport à 14h00. » ; « mon programme » → « Camille, aujourd'hui est complètement libre… » ✅.

🟠 **Clic sur le gros bouton micro (sans micro / permission refusée dans mon navigateur) : RIEN ne se passe, aucun message.** Le bandeau « La reconnaissance vocale n'est pas disponible sur ce navigateur » existe mais ne s'affiche que si l'API manque entièrement — si c'est juste le micro qui échoue, retour silencieux à l'état initial. « J'ai cliqué sur le gros bouton violet, il ne s'est rien passé, aucune explication. » (La doc de la page promet « il comprend le français et te répond à voix haute » — la promesse tient en texte, pas au micro quand ça coince.)

🟡 « c'est fait sport » après avoir créé « sport demain 14h » → « Je n'ai pas trouvé de tâche correspondante à cocher. » — la commande ne cherche que dans les tâches, pas dans les événements. « Je viens de mettre sport dans mon agenda, pourquoi elle le trouve pas ? »

### 5. Le planning (jour / semaine / mois, déplacements)

`/planning` : boutons Jour / Semaine / Mois, flèches période précédente/suivante, « Aujourd'hui », « + Nouvel événement ». La semaine vide affiche « Semaine libre — clique sur un créneau pour créer un événement. » ✅ (choix Nord, je valide). Clic sur un créneau ou « Nouvel événement » → dialogue propre : Titre, Date, Début/Fin, « Suggérer un créneau » (met 08h00–09h00 ✅), Catégorie (Travail/Perso/Santé/Focus/Autre), Répéter, Me rappeler, « Créer l'événement ». Le mois montre bien les événements (« Sport », « Réunion équipe », « Rapport »).

🟡 **Casse bizarre** : le titre dit « Semaine Du Lundi 16 Novembre » et le header « Dimanche 22 Novembre » — majuscules au milieu de la phrase. En français ça s'écrit « Semaine du lundi 16 novembre ».

🟡 **Le glisser-déposer n'est pas discoverable** : le curseur ne devient « main » (grab) qu'au survol direct du bloc événement ; aucun indice visuel sinon, et le parcours /onboarding qui l'explique n'est jamais montré (§2). « J'ai dû deviner qu'on pouvait tirer les événements. »

### 6. Les rappels

Dans le dialogue événement, « Me rappeler » : Sans rappel / 5 min / 10 min avant (défaut) / 30 min / 1 h / 1 jour, avec une phrase honnête : « pas si l'application est complètement fermée ». ✅ J'ai créé un événement avec rappel alors que les notifications étaient bloquées par le navigateur → toast clair : « Notifications bloquées par ton navigateur : réactive-les dans les réglages du site (icône cadenas…), puis « Notifications » → « Autoriser ». » ✅ bien.

🟡 Dans Réglages, le « Rappel par défaut des nouveaux événements » propose « 5 min avant … 1 jour avant » mais PAS « Sans rappel » (qui existe pourtant dans le dialogue). « Pourquoi je peux plus dire 'sans rappel' dans les réglages ? »

### 7. Le film de lancement

🔴 **(déjà connu — M-21 en cours, je confirme juste)** : à la première arrivée sur /aujourd'hui après inscription, le film se lance TOUT SEUL en plein écran : un **grand rectangle sombre complètement VIDE**, seuls « Activer le son » et « Passer » visibles. J'ai cliqué 5 fois dans le noir, les textes des scènes existent dans le DOM mais restent invisibles (scènes « Bonjour Camille », « Ta journée : 0 événement… »). « Premier écran de l'app = écran noir géant, j'ai cru que c'était cassé. » Le réglage « À chaque ouverture » relance bien le film à chaque fois (testé ✅), et « Jamais » le coupe.

🟡 **Aucun bouton pour revoir le film** après « Passer » : il faut aller dans Réglages → Film de lancement → « À chaque ouverture » puis rouvrir la page. « Comment je le relance, moi ? »

### 8. La page de statistiques

🟠 **Toute en zéros au début.** Avec 6 éléments créés (tous futurs : demain, mardi, vendredi…) : « Temps prévu par semaine : 0 h, 0 h, 0 h, 0 h », « Cette semaine : 0 h au planning », « Aucune tâche sur les 7 derniers jours », « Rien de prévu sur les 4 dernières semaines ». La page ne regarde que le PASSÉ (4 dernières semaines + tâches des 7/30 derniers jours). « Mes stats sont cassées ou quoi ? » Une fois une tâche cochée et 1 h posée aujourd'hui, tout s'allume correctement (« 100 % de tes tâches accomplies », « 1 jour de suite », « Ta journée la plus chargée : dimanche, 1 h ») ✅ — mais un nouvel utilisateur voit une page de zéros et pense que ça ne marche pas.

### 9. Tous les réglages, un par un (basculés un par un, aucun plantage, console propre ✅)

Profil (prénom), Mode sombre ✅ (beau, mémorisé), Animations & célébrations, Début de journée (6h–10h), Séquence d'accueil + Film de lancement (synchronisés — choix Nord ✅), Voix du film, Effets sonores + volume (60 % → 20 % ✅), Nappe du film, Assistant vocal (bandeau « réponses en texte » ✅), Tous les rappels, Rappel par défaut, Rappel des tâches du jour + heure, Sauvegarder/Restaurer, Effacer toutes mes données, Exporter/Importer .ics, Supprimer mon compte. Tous répondent, `localStorage` bien mis à jour. ✅

🟠 **Jargon exposé au client** : carte « Compte & sauvegarde en ligne » : « La sauvegarde en ligne n'est pas activée sur ce déploiement **(variables Supabase non renseignées)**. » ; carte Données locales : « …dans ce navigateur **(localStorage)** ». « C'est du chinois, je suis pas développeur. »

🟡 « Effacer toutes mes données » fonctionne par **double-clic temporisé** (« Cliquer encore pour confirmer », fenêtre de 4 s) au lieu d'une vraie boîte « Oui / Annuler » — surprenant la première fois. (La suppression de compte, elle, a bien un panneau « Es-tu sûr… ? » + Annuler ✅.)

### 10. Écran étroit 320 px (vieux téléphone)

Pas de débordement horizontal (`scrollWidth = 320`) sur accueil, aujourd'hui, planning, réglages, stats, voix, tâches, démo ✅. Barre de navigation du bas propre (Aujourd'hui / Planning / Tâches / Voix) ✅.

🟠 **La bannière « Installer Centeryou » (Installer / Plus tard) couvre un quart de l'écran à 320 px** et masque la grille du planning ; la croix la ferme mais elle **réapparaît à la page suivante**. « Elle me gâche mon écran, je veux qu'elle dégage. »
🟡 Header tassé à 320 px (bouton « Créer mon compte » collé au logo) + logo doublé avec le hero.

### 11. Mode sombre

Bascule « Mode sombre » dans Réglages → tout devient sombre, planning compris, c'est propre et lisible ✅. Mémorisé dans `localStorage` (`theme: "sombre"`) ✅. Rien à redire.

### 12. La page d'abonnement et son prix — est-ce que ça donne envie de payer ?

🟠 **La page `/offres` ne montre AUCUN prix.** Elle liste l'offre gratuite et dit « une offre Premium optionnelle existe » en renvoyant vers Réglages → Abonnement. Le « 4,99 €/mois » n'apparaît que là-bas, sur le bouton « Passer Premium — 4,99 €/mois », avec « Voix premium : encore 3 essais gratuits ce mois-ci (limite 3) ». « Pourquoi le prix est caché dans les réglages ? Une page Offres sans prix, c'est bizarre. » Et le contenu Premium (« voix premium illimitée, sauvegarde en ligne, synchro multi-appareils ») ne dit pas concrètement ce que ça change pour moi.

🟠 **Clic sur « Passer Premium — 4,99 €/mois » (déploiement local sans Stripe) : toast « Paiement non configuré (STRIPE_SECRET_KEY manquante côté serveur) ».** Nom de variable d'environnement dans la bouche du client. 🔴-potentiel / 🟠 ici : « C'est quoi cette erreur de geek ? » (En prod avec Stripe, le bouton redirige — mais le message d'erreur technique reste un trou.)

Verdict : à 4,99 €/mois pour de la voix premium + synchro, **non, ça ne me donne pas envie de payer aujourd'hui** — surtout quand la sauvegarde en ligne affiche « pas activée sur ce déploiement ».

### 13. Désinscription / suppression — facile de partir ?

✅ **Oui, et c'est bien fait** : Réglages → « Supprimer mon compte et mes données » → panneau « Es-tu sûr de vouloir continuer ? … définitive » + « Oui, supprimer définitivement » / « Annuler » → exécution : `localStorage` vidé, toast « Ton compte et tes données ont été supprimés. », retour sur /bienvenue. « Effacer toutes mes données » : double-clic « Cliquer encore… » puis toast « Toutes les données ont été effacées. » Suppression d'événement : toast avec **« Annuler »** qui restaure ✅. Partir est facile et réversible quand c'est prévu. ✅

---

## Les 3 trucs qui me feraient désinstaller

1. **Les dates absolues silently mises à aujourd'hui** (« dentiste 14/12 10h » → aujourd'hui 10h) — je ne peux plus faire confiance à mon agenda, c'est la fonction PREMIÈRE d'un agenda.
2. **Le film de lancement en écran noir à la première ouverture** (si M-21 ne corrige pas) — « l'app est cassée » au premier contact.
3. **Le jargon technique en pleine figure** (« STRIPE_SECRET_KEY manquante », « variables Supabase non renseignées », « localStorage ») — je me sens visé comme un hacker, pas traité comme un client.

## Les 3 trucs qui me feraient payer 4,99 €

1. **Une démo écoutable de la voix premium** + voix premium vraiment illimitée (aujourd'hui la voix du navigateur suffit pour mes 3 essais gratuits).
2. **La sauvegarde en ligne + synchro multi-appareils qui marchent VRAIMENT** (téléphone + ordi) — le 100 % local me fait peur pour perdre mes données.
3. **Un prix et un contenu Premium clairs sur la page Offres** (quoi, combien, pourquoi) — pas un bouton qui répond une erreur technique.

## Ce que je raconterais à un ami en une phrase

« C'est une appli d'agenda française où tu écris « sport demain 14h » et ça se met tout seul, plutôt joli — mais fais gaffe aux dates absolues qui partent à aujourd'hui, et le premier écran est un film noir. »

## Note globale d'utilisabilité : **6/10**

L'essentiel marche et c'est joli (saisie relative impeccable, titres propres, planning propre, sombre OK, 320 px OK, suppression propre, zéro erreur console en prod). Mais la CONFIANCE est cassée par deux trucs graves : le parseur qui avale les dates absolues en les mettant à aujourd'hui sans prévenir, et l'écran noir inaugural. 6/10, sans complaisance : un agenda où on ne peut pas faire confiance aux dates, c'est un agenda que je désinstalle.

## Classement des corrections par rapport gain/pain (le sourire le plus vite)

| Rang | Correction | Gain client | Douleur (dev) |
|---|---|---|---|
| 1 | Parseur : reconnaître « 14 décembre », « 14/12 », « 14/12/2026 », « le 3 janvier » ; et si une date n'est PAS reconnue, le dire dans le toast (« date non comprise, mise à aujourd'hui — corrige-la ») | 🔴→😊 énorme (confiance agenda) | moyenne (`src/lib/parser.ts` + tests) |
| 2 | Film : scènes réellement visibles à l'écran (déjà budgété en M-21) + ne pas auto-lancer le film à la toute première ouverture | 🔴→😊 énorme | déjà en cours (M-21) |
| 3 | Messages humains à la place du jargon : « paiement indisponible pour le moment, réessaie plus tard », « sauvegarde en ligne pas encore active », « sur cet appareil » au lieu de « localStorage » | 🟠→😊 confiance, immédiat | faible (quelques chaînes) |
| 4 | Prix 4,99 € + contenu Premium affichés sur `/offres` | 🟠→😊 conversion | faible |
| 5 | Un seul parcours d'accueil (garder /bienvenue 3 étapes OU /inscription 1 champ) + prénom sauvegardé dès l'étape 1 | 🟠→🙂 | moyenne |
| 6 | Stats : afficher aussi la semaine en cours / les prévisions, pas que le passé | 🟠→🙂 | moyenne |
| 7 | Détails : casse « Semaine du lundi 16 novembre », logo doublé, toast uniforme (« Ajouté » partout), « Sans rappel » dans les réglages, bouton « Revoir le film », bannière Installer moins encombrante à 320 px, « c'est fait X » cherche aussi dans les événements | 🟡→🙂 | faible |

## Liens

- Branche : `vibe/cactus-raleur` (base `main` `0a34c9a`) · PR : brouillon, base `main`, un seul fichier (celui-ci).
- Inscription M-28 publiée sur `main` à 04:46 UTC (commit `0a34c9a`).
- Tests : build `next build` ✅ (0 erreur), `next start` local, Chrome headless piloté en CDP, captures d'écran conservées hors dépôt ; zéro fichier de code modifié ; `git status` propre hors ce journal.
