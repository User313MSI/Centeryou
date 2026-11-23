# Fugueur — Journal de mission M-29 · Audit désengagement : pourquoi les gens partiraient, et comment les garder (LECTURE SEULE)

- **Agent** : Fugueur (session Vibe dédiée). Branche : `vibe/fugueur-desengagement` (base `main` `c8e3491`, inscription M-29 publiée en commit `2f78c5a` le 23/11 à 07:17 UTC : « branche créée, audit en cours »). PR : voir lien en bas (brouillon, base `main`, **uniquement ce journal + l'inscription MISSIONS.md**).
- **Zone tenue** : `apps/centeryou/docs/journal/fugueur.md` + `apps/centeryou/docs/MISSIONS.md` (inscription M-29). **Aucun fichier de code modifié** : `git diff --name-only origin/main..HEAD` le prouve (2 fichiers docs uniquement). Build et tests rejoués mais rien touché.
- **Sources lues avant de commencer** : `AGENTS.md`, `docs/MISSIONS.md` (section M-29), **tout `docs/journal/`** (43 fichiers) — en particulier **cactus.md** (M-28, client râleur : je ne refais PAS l'audit d'utilisabilité — dates absolues, film, jargon sont déjà chez lui), **banquier.md** (M-26, verdict marché/différenciation : je ne refais PAS l'analyse business — mon angle est la rétention, pourquoi on revient ou pas), **nord.md** (M-17, choix d'expérience **déjà tranchés, non rouverts** : règle « une heure = événement », états vides, confirmations douces, « compte local » vs « compte en ligne », tutoiement…), plus nuage.md, almanach.md, chrono.md, radar.md, sigma.md, cloche.md, pont.md, coffre.md pour savoir ce qui existe déjà.
- **Heures UTC (23/11/2026)** : inscription 07:17 · build/tests 07:18–07:19 · parcours 1 (1re minute) 07:19–07:21 · parcours 2 (1er jour) 07:23–07:26 · parcours 3 (2e semaine) 07:27–07:29 · recherche marché 07:29–07:31 · rédaction 07:32+.

## Méthode et preuves (tout vérifié dans l'app réelle, pas dans le code seul)

- Branche tracée sur `main` `c8e3491`. `npm ci` puis **`npm run build` ✅** (Next 14.2.35, 23 routes, 0 erreur) — **premier essai, pas de faux échec** ; **`npm test` ✅ 621/621** (32 fichiers) rejoué par moi-même.
- App servie en **production** : `next start` sur `http://127.0.0.1:3129`.
- **Chrome 157 headless piloté en CDP** (WebSocket natif Node 24, zéro dépendance ajoutée — scripts hors dépôt), 1440×900 et 320×700, **vrais clics, vrais champs, `localStorage` inspecté après chaque action**, console surveillée : **zéro erreur, zéro exception** sur tous les parcours. ~20 captures d'écran conservées **hors dépôt** (`C:\Users\stark\Documents\fugueur-audit\shots\`), scripts dans `fugueur-audit/`.
- Parcours joués comme trois vraies personnes : ① la première minute (profil neuf, comparaison mentale à Google Agenda), ② le premier jour (5 ajouts réels via la barre, exploration soir + lendemain matin simulé par reset des drapeaux du jour), ③ la deuxième semaine (profil de 13 jours **semé dans `localStorage`** : 8 événements dont récurrents, 7 tâches dont 2 faites et 2 en retard, puis navigation réelle).
- Recherche publique (web) sur les gratuits du marché 2026 : Google Agenda, Notion Calendar, TickTick, Fantastical, Motion/Reclaim/Sunsama + littérature rétention (voir §5).

---

## Réponse à la question de l'utilisateur, en une phrase

> « Il n'y a pas grand-chose à y faire, elle ennuie » = **une appli d'agenda jolie mais muette et vide : elle ne rappelle jamais personne quand on ne l'ouvre pas, elle démarre à zéro sans rien importer, et au-delà du CRUD (ajouter/cocher/déplacer) il n'y a presque rien qui donne envie de revenir demain** — la voix et les stats existent mais restent cachées, et tout ce qui est répétitif (récurrences, tâches hebdo) doit être refait à la main.

---

## 1. Parcours 1 — LA PREMIÈRE MINUTE (Camille, écran neuf, 1440×900, compare à Google Agenda)

| Moment | Ce qu'elle voit/vit | Accroche ou décrochage |
|---|---|---|
| t+0s `/` | « Ton planning qui te parle », exemple NL « ajoute sport demain 14h », « 100 % en français, gratuit, tes données restent sur ton appareil », aperçu semaine fictive de « Sofia » lisible et jolie | ✅ **Accroche** : la promesse est claire en 5 s, le NL français est le vrai différenciateur vs Google |
| t+8s « Voir la démo » | `/demo` = semaine de Sofia **en lecture seule** : « Données fictives : aucune donnée réelle, aucun compte requis, **rien n'est enregistré** » — on ne peut rien toucher | 🟡 Décrochage doux : on admire, on ne joue pas ; le seul CTA actif renvoie à « Créer mon compte » |
| t+15s inscription | 1 champ « Comment t'appelles-tu ? » → submit → **`/aujourdhui` direct** (la page `/onboarding` existe mais la redirection concurrente l'évince — déjà signalé par Cactus, confirmé) | ✅ Rapide : 1 champ, 1 clic |
| t+20s | **Le film de lancement se lance tout seul en plein écran** (« Bonjour, Camille… », boutons « Activer le son » / « Passer ») | 🔴 **Décrochage n°1** : avant toute action, elle doit cliquer « Passer ». Google Agenda, lui, ouvre directement sur son agenda. La 1re minute est un écran noir cinématique, pas son planning |
| t+30s | Barre « Ajoute vite : sport demain 14h… » → saisie → toast « Événement ajouté : « Sport » — mar. 24 nov. à 14h00. » | ✅ **Accroche forte** : le NL marche du premier coup, le toast confirme avec date+heure |
| t+40s | Mais l'agenda autour est **vide** : « Journée libre côté agenda », « Aucune tâche aujourd'hui », stats à « — / 0 h » | 🔴 **Décrochage n°2** : la 1re minute se termine sur une **belle boîte vide**. Aucun bouton « Importer mon Google Agenda / un .ics » sur l'accueil ni sur Aujourd'hui — l'import ICS n'existe que dans Réglages (carte « Agendas »). Celui qui a déjà un agenda chez Google repart chez Google |
| t+50s | Si elle tape une récurrence naturelle « réunion équipe chaque lundi 9h » | 🔴 **Décrochage confiance** (mesuré) : créé comme événement **« Réunion équipe chaque » aujourd'hui 23/11 à 09h00, répétition « jamais »** — « chaque lundi » n'est PAS compris, « chaque » reste collé au titre, aucune alerte. La récurrence n'existe qu'en manuel (select « Ne se répète pas / Chaque jour / Chaque semaine / Chaque mois » dans le dialogue) |

**Verdict parcours 1** : accroche réelle (NL + démo + local), mais deux décrochages nets : le film auto-lancé qui bloque, et le démarrage à vide sans import — la comparaison mentale à Google Agenda se fait à l'avantage de Google (qui ouvre sur *son* agenda plein, sur tous ses appareils, avec ses rappels).

## 2. Parcours 2 — LE PREMIER JOUR (5 ajouts réels, le soir, le lendemain matin)

Ajouts réels faits dans l'app (toasts vérifiés) : « sport demain 14h » → événement mar. 24/11 14h00 ✅ · « dentiste jeudi 10h30 santé » → jeu. 26/11 10h30 · Santé ✅ · « rapport vendredi !travail » → tâche ven. 27/11, priorité haute · Travail ✅ · « courses samedi matin » → tâche sam. 28/11 ✅ · « réunion équipe chaque lundi 9h » → **mauvais parsing** (voir §1).

- **Le soir du jour 1** : `/aujourdhui` montre « Programme du jour » (vide le lundi, puisque tout est à partir de demain), « Ma progression 0 % », carte stats « Ton temps, en clair ». `/stats` au jour 1 : barres à « — / 0 h », insight « Aucune tâche sur les 7 derniers jours » — **rien ne donne envie de revenir le soir** : pas de bilan du jour, pas de « prépare demain », pas de suggestion. 🟡
- **Le lendemain matin (simulé : reset des drapeaux `briefShownDate`/`welcomeShownDate`/`launchFilmShownDate` + rechargement)** : la carte « Ton brief du matin » réapparaît, **proposée mais jamais auto-lue** (« ne se lance jamais tout seul ») ; le film peut réapparaître. Mesuré : **`Notification.permission === "default"`** — la permission n'est demandée que si l'utilisateur pose un rappel ou touche au réglage ; le store rappels `centeryou-rappels-v1` est vide `{"notifies":[],…}`. 🔴 **Décrochage n°3 (le plus grave pour la rétention)** : par défaut, **rien ne la rappelle**. Le moteur de rappels (`rappels-service.ts`) tourne toutes les 30 s **uniquement quand un onglet de l'app est ouvert ou en arrière-plan** (`if (settings.reminders && permission === 'granted')`), et le service worker ne gère que `notificationclick` — aucune planification. **App fermée = Centeryou muette.** Google Agenda, lui, envoie des push même app fermée.
- **Pourquoi elle OUVRIRAIT l'app le lendemain** (et pas la notif Google) : aujourd'hui, la seule réponse honnête est « son habitude + le brief/film du matin » — la voix marche bien en texte (« mon programme » → « Camille, aujourd'hui, 1 événement prévu : … », « quoi de prévu demain ? » → réponse correcte, « c'est fait rapport » → « Bravo ! « Rapport » est cochée. » ✅) mais elle ne la prévient pas, elle lui répond seulement.
- `/voix` propose 4 boutons de commandes — bien, mais la page entière tient en un champ + 4 boutons : **peu de « matière »** pour quelqu'un qui cherche « pas grand-chose à faire ».

## 3. Parcours 3 — LA DEUXIÈME SEMAINE (profil 13 jours : récurrences, tâches faites/en retard, navigation)

- `/aujourdhui` (lundi 23/11, semaine 2) : « Bonjour Camille », grille avec Stand-up 09h30 + Cours de piano 18h00, « Ma progression 0/1 », carte stats « 9 h 45 cette semaine », tâches du jour. Correct — mais **aucune carte « brief » ce jour-là** (déjà vu), et rien ne pointe vers la semaine : la nav = **Aujourd'hui / Planning / Tâches / Voix** (+ roue Réglages). 🔴 **`/stats` n'est dans aucune nav** : on ne la trouve que par la petite carte sur Aujourd'hui. Or c'est la surface la plus « habit-forming » (insight « Ta journée la plus chargée : mardi… 50 % de tes tâches accomplies sur 7 jours », habitudes, série de jours organisés).
- `/planning` semaine/mois : la semaine passée se retrouve (flèche arrière OK), le mois affiche les événements — **mais on ne peut marquer aucune occurrence d'événement « faite » depuis le planning** (le check n'existe que sur les tâches ; « Terminé » n'existe que comme action de la notification de rappel). Un événement récurrent reste éternellement « à venir » : **aucun sentiment d'avancement sur l'agenda**. Voix : « c'est fait sport » ne coche que des **tâches** (`candidates = s.tasks.filter(!done)`) — confirmé en code et en test.
- `/taches` : filtres Toutes/Actives/Terminées. Mesuré : **aucun champ de recherche nulle part** dans l'app (grep `Rechercher` = 0 résultat UI ; la seule input est la barre d'ajout). Avec 6 tâches, « Rapport mensuel ven. 20 nov. » (en retard) s'affiche sous Actives **avec sa simple date, sans badge « en retard », sans action « repousser »** en un clic. 🔴 Tâches **sans aucune récurrence** possible (`TaskItem` n'a pas de champ `repeat`) : « courses chaque samedi » est impossible en tâche — il faut la recréer chaque semaine à la main. C'est exactement le « répétitif » qui use.
- Voix semaine 2 : « mon programme » → « …2 événements prévus : Stand-up à 09h30, Cours de piano à 18h00. Et . 1 tâche à faire : Sport. » (petit bug de formulation « Et . » constaté) ; « ajoute réunion lundi prochain 9h chaque semaine » → **« Ajouté : Réunion prochain chaque semaine, aujourd'hui à 09h00 »** — « chaque semaine » non compris, « prochain » ignoré, event posé aujourd'hui, `repeat: "jamais"` (lu dans le store). 🔴 Le parseur comprend les dates (M-31) mais **pas les récurrence en langage naturel**.
- 320×700 : aucun débordement horizontal ✅, contenu lisible — le « mobile d'abord » tient.
- Console : **0 erreur** sur tous les parcours.

**Ce qui manque pour qu'elle revienne d'elle-même (semaine 2+)** : un canal de retour fiable (rappels app fermée), une raison d'ouvrir (brief/stats visibles + rituel), une preuve d'avancement (check des événements, tâches en retard traitées), et moins de ressaisie (récurrences NL + tâches récurrentes + import).

---

## 4. Ce que fait de « répétitif » l'app aujourd'hui (mesuré)

1. **Récurrence manuelle obligatoire** : « chaque lundi » en NL → event faux silencieux (2 mesures). Seul le select manuel du dialogue marche (jour/semaine/mois, pas de « chaque mardi » au choix du jour).
2. **Tâches non récurrentes** : aucune récurrence possible sur une tâche.
3. **Pas de recherche** : retrouver « ce rendez-vous chez le dentiste » = scroller planning/mois ou filtres tâches.
4. **Rappels muets app fermée** (permission `default`, moteur 30 s lié à l'onglet, SW sans planification).
5. **Démarrage à vide** : pas d'import visible au 1er contact (ICS enfoui dans Réglages).

## 5. Comparaison honnête avec les gratuits du marché (recherche publique, 23/11/2026)

| Offre | Ce qu'ils ont que Centeryou n'a pas (et qui retient) | Ce que Centeryou a qu'ils n'ont pas |
|---|---|---|
| **Google Agenda** (gratuit, ~500 M MAU) | Synchro multi-appareils temps réel ; **rappels push même app fermée** ; partage de calendriers ; visioconf Meet auto ; événements auto extraits de Gmail ; Tasks intégré ; recherche globale ; fonctionne hors-ligne partout. C'est le « toujours là, partout » qui retient | Rien côté réseau — mais un **NL français nettement meilleur que celui de Google** (seul Fantastical fait mieux, payant et Apple-only), **100 % local sans compte** (vraie diff privacy), voix + brief en FR, stats locales gratuites |
| **Notion Calendar** (gratuit) | Liens de réservation type Calendly (page de dispo partageable, Meet/Zoom auto) | Compte obligatoire, anglais d'abord, zéro voix |
| **TickTick** (gratuit limité) | Synchro + rappels gratuits, calendrier ; habits/Pomodoro/stats en premium 4,99 $ | Stats et rappels **gratuits et locaux** chez Centeryou ; NL FR ; pas de compte |
| **Fantastical** (~4,75 $/mois, Apple only) | **Le meilleur NL du marché** (« lunch with mom every other Tuesday ») | Centeryou approche en FR gratuit et multi-plateforme ; Fantastical = payant + écosystème Apple |
| **Motion / Reclaim / Sunsama** (8–28 $/mois) | Auto-scheduling KI, défense du temps de focus, rituel de planification (Sunsama) | RIEN côté auto-planif — mais Centeryou a déjà le Radar (créneaux suggérés) caché dans le dialogue événement, à rendre visible |

**Verdict sans complaisance** : le marché gratuit gagne la rétention par la **présence** (sync + push même fermé + partage + import auto Gmail) — pas par la beauté. Centeryou gagne sur l'**entrée** (NL FR, privacy, voix) mais perd sur la **permanence** : tant que l'app est muette quand on la ferme et qu'elle démarre vide, l'utilisateur garde Google comme agenda de vérité et Centeryou devient un jouet qu'on ouvre par hasard. Littérature rétention (Lifecycle Architect, 2026) : **3+ fonctionnalités utilisées dans les 14 premiers jours** séparent nettement la rétention à 90 jours — aujourd'hui Centeryou propose du CRUD + un film + une page stats cachée : la « profondeur » est faible. Banquier avait déjà noté : zéro métrique d'usage dans le produit (Coffre M-14 a tranché « pas de traceur » — donc on pilote la rétention à l'aveugle, par design privacy).

---

## 6. Les manques pour « donner envie de rester », classés gain/pain (impact rétention ÷ coût)

### 🔴 Indispensable avant le 1/01 (sinon on perd les gens avant le lancement)

| # | Manque | Gain rétention | Coût | Preuve |
|---|---|---|---|---|
| 1 | **Rappels effectifs app fermée** : demander la permission des notifications de façon contextuelle + planifier les rappels dans le service worker (PWA installée, `showNotification` programmé, Periodic Background Sync là où dispo) | 🔴🔴🔴 canal de retour n°1 — sans ça, chaque ouverture dépend de la mémoire de l'utilisateur, et Google gagne ce canal par défaut | moyen (SW + permission UX) | `Notification.permission === "default"` mesuré ; moteur 30 s lié à l'onglet (`rappels-service.ts`) ; SW = `notificationclick` seul |
| 2 | **Démarrage non vide** : bouton « Importer mon agenda » (Google/.ics) visible dès l'accueil ou l'onboarding, pas enfoui dans Réglages | 🔴🔴🔴 tue le « 1re minute = boîte vide » qui renvoie chez Google | faible-moyen (Pont M-07 existe déjà, il s'agit d'exposer) | parcours 1 : accueil/Aujourd'hui sans aucun CTA d'import |
| 3 | **Récurrence en langage naturel** (« chaque lundi 9h », « tous les vendredis », « le 15 du mois ») dans le parseur, avec avertissement si non compris | 🔴🔴 tue la ressaisie hebdomadaire + la défiance du parsing silencieux | moyen (parser + tests, comme M-31) | 2 mesures : « chaque lundi 9h » → event aujourd'hui, titre pollué, `repeat:"jamais"` |

### 🟠 À faire le premier mois (rétention installée)

| # | Manque | Gain | Coût |
|---|---|---|---|
| 4 | Tâches récurrentes + section « en retard » + « repousser à demain » en 1 clic | 🔴🔴 | moyen (schéma tâche + UI) |
| 5 | Recherche globale (événements + tâches) | 🔴🔴 dès ~20 entrées | faible-moyen |
| 6 | Check-off des occurrences d'événements depuis le planning (« fait ✓ » sobre) — aujourd'hui seulement via la notif | 🔴🔴 sentiment d'avancement sur l'agenda | faible (le tampon `fait` existe déjà dans `rappels.ts`) |
| 7 | **Stats dans la navigation** (ou carte plus visible) + « revue de la semaine » | 🔴🔴 la surface habit-forming est cachée hors nav aujourd'hui | faible |
| 8 | Sauvegarde en ligne / multi-appareils (déjà prévu M-09 + Supabase) — sinon « je change de téléphone = tout perdu » empêche d'y confier sa vie | 🔴🔴 | déjà budgété |
| 9 | Rendre visible le Radar (créneaux suggérés) ailleurs que dans le dialogue d'édition | 🟠 | faible |

### 🟢 À NE PAS faire (et pourquoi)

- **Pas de gamification points/badges/niveaux** : l'utilisateur ne l'a jamais demandée ; l'esprit est sobre, doux, aérien (Nuage). La « série de jours organisés » sobre de `/stats` suffit. Des streaks tape-à-l'œil casseraient la confiance plus qu'autre chose.
- **Pas de compte obligatoire ni de synchro forcée** : ce serait tuer la seule vraie différenciation (100 % local, zéro compte — argument privacy contre Google).
- **Pas de 5e onglet, pas de barre latérale** (règles AGENTS.md + Nord) : ajouter de la surface ne retiendrait personne, ça noierait.
- **Pas de notifications façon réseau social** (spam = désinstallation immédiate) : un rappel par événement, sobre, avec « Reporter » — rien de plus.
- **Ne pas rouvrir les choix tranchés de Nord** (double parcours d'accueil, terminologie, tutoiement) ni refaire l'audit Cactus (dates absolues — en cours via M-31 fusionné — film, jargon) : zones déjà prises.

## 7. LE premier handicap à lever — un seul

> **L'app est muette quand on ne l'ouvre pas.** Permission de notification jamais demandée par défaut (`"default"` mesuré), rappels déclenchés toutes les 30 s seulement si un onglet tourne, service worker sans aucune planification : **une fois l'onglet fermé, plus rien ne rappelle l'utilisateur — alors que Google Agenda envoie des push, app fermée.** Tant que ce canal n'existe pas, chaque retour dans Centeryou dépend uniquement de la mémoire de l'utilisateur, et c'est Google qui occupe ce créneau par défaut. C'est le levier n°1 de rétention (le « pourquoi rouvrir l'app demain matin »), pour un coût contenu côté client (PWA + permission contextuelle + rappels planifiés dans le SW). Le second handicap (démarrage à vide, pas d'import) arrive juste derrière.

## 8. Ce que l'app pourrait faire de « vivant » — sans gamification futile

Rester dans l'esprit sobre, doux et aérien (pas de points, pas de niveaux, pas de confettis forcés — ceux-là existent déjà et sont désactivables, ne pas les amplifier) :

1. **Un rituel du matin qui existe déjà, à rendre visible** : le brief du matin (3 phrases, proposé une fois par jour, jamais auto-lu) + le film sobre — les valoriser en les rendant *fiables* (rappel du lendemain inclus), pas plus fréquents.
2. **Une revue de la semaine douce** (le dimanche soir ou dans /stats rendu visible) : « Ta semaine en 3 phrases » (déjà calculé par Sigma) + 2–3 créneaux suggérés pour la semaine prochaine (le Radar existe, le sortir du dialogue). C'est le rituel Sunsama-like, sobre, qui donne une raison d'ouvrir le dimanche soir.
3. **Le « fait ✓ » des événements du jour** : cocher une occurrence dans le planning, avec la petite série sobre déjà existante — le sentiment d'avancer sans compteur de points.
4. **La page Aujourd'hui qui « respire » avec ses vrais chiffres** (prochain événement dans X h, progression du jour, « 9 h 45 cette semaine ») — déjà là, c'est le bon ton : le vivant vient de la reconnaissance de *sa* vie réelle, pas d'une récompense artificielle.

---

## 9. Faits vérifiés dans l'app réelle vs non vérifiés

**Vérifiés en production locale (build main `c8e3491`, Chrome 157 headless CDP)** : build ✅ 23 routes ; tests 621/621 ✅ ; 0 erreur console sur tous les parcours ; toasts d'ajout exacts ; store `centeryou-v1` inspecté (events/tasks/settings) ; « chaque lundi 9h » mal parsé (2×) ; `Notification.permission === "default"` ; store rappels vide ; voix « mon programme » / « quoi de prévu demain ? » / « c'est fait rapport » → réponses exactes citées ; aucune recherche dans l'UI ; stats hors nav ; tâches sans récurrence ni traitement « en retard » ; check des événements impossible depuis le planning ; 320 px sans débordement ; démo en lecture seule.
**Non vérifiables ici (notés honnêtement)** : rappels réels hors-ligne (headless sans permission accordée — mais le code est formel : le tick n'existe que dans une page ouverte) ; le paiement Premium en prod (pas de clés Stripe en local → le bouton répond « paiement indisponible » en FR, message déjà soigné par Nuage) ; la synchro multi-appareils (« pas encore activée ») ; aucune métrique d'usage n'existe dans le produit (Coffre M-14), donc aucune donnée de churn réelle — ce rapport est un audit de parcours, pas une mesure.

## Liens

- Branche : `vibe/fugueur-desengagement` (poussée). Base : `main` `c8e3491`.
- Inscription M-29 publiée en commit `2f78c5a` (23/11 07:17 UTC) : « branche créée, audit en cours ».
- PR : **brouillon, base `main`**, contient UNIQUEMENT `apps/centeryou/docs/journal/fugueur.md` + l'inscription `MISSIONS.md` → lien en mise à jour ci-dessous.
- Captures et scripts de parcours : hors dépôt, `C:\Users\stark\Documents\fugueur-audit\`.

*Mise à jour finale : PR #XX ouverte (voir ci-dessus).*
