# Journal — Plume

## Mission M-22 — Des titres écrits par elle, pas des phrases répétées

- **Agent** : Plume (session Vibe Code dédiée). Branche : `vibe/plume-titres-propres` (base `main` `d56f14b`, dernier état tiré avant de commencer).
- **PR** : **https://github.com/User313MSI/Centeryou/pull/41** (brouillon, base `main`, ouverte le 2026-11-22 à 04:44 UTC).
- **Inscription** : MISSIONS.md section M-22 commitée seule avant de coder (`af6d39d` « branche créée, en cours »), puis à nouveau seule à l'ouverture de la PR (`abeb9cf` « PR #41 ouverte »).
- **Date/heure** : 2026-11-22, 04:43 → 06:00 UTC.
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (règles 1–8, notamment règle 8 sur les dates de test), tout `docs/journal/` — en particulier **compris.md** (M-19, dernier état de `parser.ts`/`voice-commands.ts` et ses titres verrouillés) et **accord.md** (M-20, zone voix interdite à l'époque, depuis fusionnée). Aucun chevauchement : M-21 Cinéaste travaille sur le film (`launch-film.tsx` + bloc `.film-*`), zone étanche disjointe de la mienne.

## Zone tenue (étanche)

`src/lib/parser.ts`, `src/lib/voice-commands.ts`, `tests/parser.test.ts`, `tests/voice-commands.test.ts` (les fichiers de tests de ces deux modules), ce journal, `docs/MISSIONS.md` (inscription). Vérifié en fin de mission : `git diff --name-only d56f14b..HEAD` = ces 6 fichiers uniquement. Aucune nouvelle dépendance (`package.json`/lock inchangés), aucun service d'IA externe — tout se règle en local avec des règles.

## Diagnostic (reproduit sur main `d56f14b`)

`parseInput("euh bah non justement c'est plutôt aujourd'hui réunion à 14h", '2025-01-06')` donnait le titre **« Euh bah non justement c'est plutôt réunion »** : la date et l'heure étaient bien comprises, mais le bavardage restait dans le titre. Idem à la voix : la confirmation répétait la phrase entière.

## Changements

### `src/lib/parser.ts` — une seule usine à titres : `cleanTitle` (exportée)

- `cleanTitle(raw)` est **la seule fonction** de fabrication du titre. `parseInputDetailed` l'appelle sur les mots restants une fois dates/heures/catégories consommées ; `parseInput` (saisie rapide clavier : `quick-add.tsx`, `bienvenue/page.tsx`) passe par `parseInputDetailed`, et la voix par `parseInput`/`parseInputDetailed` — **mêmes règles partout, aucun doublon**.
- **Lexique FR de bavardage et d'auto-correction** (`LEXIQUE_BAVARDAGE`, exporté, formes normalisées, motifs longs d'abord, retirés n'importe où dans la phrase) :
  - hésitations : `euh, euuh, euhh, euhm, euh-euh, heu, bah, ben, hum, hm, mmm, mmh, hein, ah, oh` ;
  - corrections : `non, justement, plutôt (que), disons (que), en fait, en réalité, je veux dire, je voulais dire, c'est-à-dire (cest-a-dire / cest a dire), c'est (cest), enfin, bref, attends, finalement` ;
  - ventilation : `du coup, en vrai, voilà`, + `quoi` uniquement en **dernier mot**.
- **Mots de liaison orphelins** (`le, la, les, de, à, que, pour`) : jamais seuls en début ni en fin de titre (taille des bords en boucle), et au milieu seulement s'ils sont collés à un mot du lexique retiré. Au cœur d'une activité ils restent : « laver la voiture », « acheter du pain », « il y a le dentiste » (tests M-19 verrouillés, toujours verts).
- **Jamais de date ni d'heure dans le titre** : consommées avant (parseur existant) ; la ponctuation des jetons est désormais tolérée pour la reconnaissance (« aujourd'hui, », « 14h, » → `normToken`).
- **Troncature propre** à `TITRE_MAX = 40` caractères, au dernier mot complet, **sans « … »** (coupe sèche à 40 seulement si un seul mot dépasse) ; les bords sont re-nettoyés après troncature.
- **Majuscule initiale** ; **repli clair `TITRE_REPLI = 'Nouvelle tâche'`** si le nettoyage a tout vidé — jamais un mur vide.
- `parseInput` garde exactement sa forme historique à 5 champs ; `parseInputDetailed` inchangé côté drapeaux `hasDate`/`hasTime`.

### `src/lib/voice-commands.ts`

- `createFromParsed` applique explicitement `cleanTitle(parsed.title)` (idempotente) : la commande vocale passe par **la même usine** que le clavier, et le message de confirmation affiche le titre propre, ex. « Ajouté : Réunion, aujourd'hui à 14h00. » (idem pour le refus de créneau pris et pour « Ajouté à tes tâches : … »).
- Branche « aujourd'hui / mon programme / agenda / … » : une phrase qui contient une **heure reconnue** est désormais une **création** (et non une lecture du programme) — c'est le cas réel dicté « euh bah non justement c'est plutôt aujourd'hui réunion à 14h ». Les commandes protégées ne changent pas : « mon programme », « agenda », « quoi de prévu demain ? », « ajoute », « c'est fait », « ! » (tests existants + nouveaux, tous verts). « quoi de prévu demain ? » reste une requête de programme (branche inchangée, prioritaire).

## Lexique retenu (résumé)

Hésitations + corrections + ventilation ci-dessus (~35 motifs). Choix délibérés : `bon` et `alors` NON retirés (« bon anniversaire » doit rester intact) ; `du`/`des` non orphelins (« acheter du pain ») ; `sur`, `avec`, `chez` conservés (« Stream sur Red Dead 2 » — régression M-19 interdite).

## Avant / après — phrases réelles capturées (parseur, référence fixe lundi 2025-01-06, règle 8)

| Phrase dictée | Avant (main `d56f14b`) | Après (branche) | Date/heure reconnues |
|---|---|---|---|
| « euh bah non justement c'est plutôt aujourd'hui réunion à 14h » | Euh bah non justement c'est plutôt réunion | **Réunion** | 2025-01-06 14:00 |
| « ah non, justement, plutôt aujourd'hui, réunion à 14h » | Ah non, justement, plutôt aujourd'hui, réunion | **Réunion** | 2025-01-06 14:00 |
| « écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2 » | Stream sur Red Dead 2 | **Stream sur Red Dead 2** (régression M-19 : inchangé) | 2025-01-07 18:00 |
| « euh, hum, dîner avec les parents demain à 20h » | Euh, hum, dîner avec les parents | **Dîner avec les parents** | 2025-01-07 20:00 |
| « bah en fait voilà appel du dentiste demain à 9h » | Bah en fait voilà appel du dentiste | **Appel du dentiste** | 2025-01-07 09:00 |
| « euh bah je veux dire que stream Red Dead 2 demain 21h » | Euh bah je veux dire que stream Red Dead 2 | **Stream Red Dead 2** | 2025-01-07 21:00 |
| « du coup sport demain 14h » | Du coup sport | **Sport** | 2025-01-07 14:00 |
| « réunion avec Paul demain 15h quoi » | Réunion avec Paul quoi | **Réunion avec Paul** | 2025-01-07 15:00 |
| « en vrai c'est-à-dire que j'ai un rdv dentiste vendredi 10h30 » | En vrai c'est-à-dire que rdv dentiste | **Rdv dentiste** | 2025-01-10 10:30 |
| « réunion avec toute l'équipe projet Phoenix demain à 14h » | Réunion avec toute l'équipe projet Phoenix (43 car.) | **Réunion avec toute l'équipe projet** (34 car., troncature propre, sans « … ») | 2025-01-07 14:00 |
| « euh bah non en fait voilà aujourd'hui à 14h » | Euh bah non en fait voilà | **Nouvelle tâche** (repli clair, jamais vide) | 2025-01-06 14:00 |
| « stream sur Red Dead Redemption 2 avec les copains demain à 21h » | Stream sur Red Dead Redemption 2 avec les copains (48 car.) | **Stream sur Red Dead Redemption 2 avec** (39 car.) | 2025-01-07 21:00 |

À la voix, la confirmation pour la phrase réelle est désormais : « **Ajouté : Réunion, aujourd'hui à 14h00.** » (événement créé aujourd'hui 14h00–15h00, titre « Réunion »).

## Tests

- **+32 nouveaux tests, aucun supprimé ni modifié** (la seule ligne « modifiée » des fichiers de tests est l'import, élargi). `tests/parser.test.ts` 70 → 91, `tests/voice-commands.test.ts` 31 → 40.
- Couvre tous les cas obligatoires : la phrase réelle avec auto-correction (parseur + voix + branche « ajoute »), trois phrases à hésitations naturelles, la régression M-19 « écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2 » → « Stream sur Red Dead 2 », « jamais de date/heure dans le titre », « pas de mot de liaison orphelin en début/fin/milieu », troncature ~40 au dernier mot complet sans « … », majuscule initiale, repli « Nouvelle tâche » si tout est vidé, idempotence de `cleanTitle`, chaque motif du lexique, et le verrou des commandes existantes (ajoute, c'est fait, mon programme, agenda, quoi de prévu demain, « ! »).
- **Règle 8 respectée** : dates de test recalculées à l'exécution (`todayISO()`, `addDaysISO`, `nextWeekdayISO`) côté voix ; horloge figée `2025-01-06` côté parseur. Aucune date littérale comparée au jour réel.

## Validations (2026-11-22, ~05:55 UTC)

- `npx vitest run` → **571/571 verts** (32 fichiers ; base 539 intacte + 32 nouveaux).
- `npx tsc --noEmit` → ✅ (regex sans flag `/u`, cible ES5 respectée).
- `npm run test:parser` → ✅ tous les tests passent.
- `npm run build` → ✅ (23 routes, First Load JS 87,5 kO inchangé).

## Décisions

- Une seule usine (`cleanTitle` dans `parser.ts`) ; la voix la réapplique dans `createFromParsed` (idempotente) pour un câblage explicite et sans doublon de logique.
- « quoi » retiré seulement en fin de phrase ; « bon »/« alors » jamais retirés ; `du`/`des`/`sur`/`avec` jamais orphelins — pour ne rien casser aux titres M-19 verrouillés.
- Dans la branche programme, le critère « contient une heure reconnue » distingue création et requête (les requêtes type « quoi de prévu demain ? » restent prioritaires et inchangées).
- Ponctuation des jetons tolérée à la reconnaissance (`normToken`) : « aujourd'hui, » avec virgule est bien une date et ne fuit plus dans le titre.

## Liens

- Branche : `vibe/plume-titres-propres` · PR : **#41** https://github.com/User313MSI/Centeryou/pull/41 (brouillon, base `main`) · MISSIONS.md : section M-22.
- Pushs : inscription branche (`af6d39d`), inscription PR (`abeb9cf`), livraison code+tests+journal (`f62210d`), merge de `origin/main` (`b488ed5`, conflit MISSIONS.md M-22 résolu : objectif reformulé de main + PR #41 conservés ; main n'apportait que MISSIONS.md) — 2026-11-22 ~06:00 UTC. Après merge : 571/571 tests verts, tsc ✅, test:parser ✅, build ✅ (First Load 87,5 kO).
