# Journal — Almanach

## Mission M-31 — Les dates absolues comprises par le parseur (le défaut n°1 de Cactus)

- **Agent** : Almanach (session Vibe dédiée). Branche : `vibe/almanach-dates-absolues` (base `main` `d9ab63f`, dernier état tiré avant de commencer).
- **Inscription** : MISSIONS.md section M-31 commitée seule avant de coder (`6c88b46` « branche créée, en cours »), poussée le 2026-11-23 ~06:31 UTC.
- **PR** : **#48** https://github.com/User313MSI/Centeryou/pull/48 (brouillon, base `main`, ouverte le 2026-11-23 ~05:41 UTC).
- **Date/heure** : 2026-11-23, 05:30 → 05:40 UTC.
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (règles 1–8, notamment règle 8 sur les dates de test), tout `docs/journal/` — en particulier **cactus.md §3** (cahier des charges : les 5 phrases mesurées le 22/11/2026 + le classement gain/pain rang 1) et **plume.md** (M-22 : l'usine `cleanTitle` unique à préserver telle quelle, les 91 tests verrouillés, la forme à 5 champs de `parseInput`). Aucun chevauchement avec M-23 Nuage (zone visuelle, jamais touchée).

## Zone tenue (étanche)

`src/lib/parser.ts`, `src/lib/voice-commands.ts`, `tests/parser.test.ts`, `tests/voice-commands.test.ts`, ce journal, `docs/MISSIONS.md` (inscription). Vérifié en fin de mission : `git diff --name-only origin/main..HEAD` = ces 6 fichiers uniquement. Aucune nouvelle dépendance (`package.json`/lock inchangés), aucun service d'IA — tout en règles locales.

## Diagnostic (mesuré par Cactus, M-28 §3, le 22/11/2026)

Avant : le parseur ne connaissait que les dates relatives. « dentiste 14/12/2026 10h » → événement **aujourd'hui** 10h00, titre « Dentiste 14/12/2026 », aucun avertissement (vérifié dans `localStorage` : `{"t":"Dentiste 14/12/2026","d":"2026-11-22","s":"10:00"}`).

## Changements

### `src/lib/parser.ts` — reconnaissance des dates absolues FR (M-31)

- Nouveau bloc de règles locales, inséré dans la boucle de `parseInputDetailed` (après « dans N jours », avant les catégories) : `MONTHS_FR` (12 mois, formes pleines + abréviations janv./févr./avr./juil./sept./oct./nov./déc.), `matchAbsoluteDate`, `makeISODate`, `nextOccurrenceISO`.
- Formats reconnus : « 14 décembre », « le 3 janvier », « 1er mai », « 14 décembre 2026 », « 25/12 », « 14/12 », « 14/12/2026 » (et « 14/12/26 » → 2026), article « le » facultatif, ponctuation de bordure tolérée (« 14/12/2026, »).
- **Année absente → prochaine occurrence à venir, aujourd'hui inclus** (cohérent avec `nextWeekdayISO`) : en novembre 2026, « 14 janvier » = 2027-01-14 ; en janvier 2027, « 14 décembre » = 2027-12-14 ; « 14 décembre » dit le 14 décembre = ce jour-là. Le 29 février sans année balaye jusqu'à 8 ans pour trouver l'année bissextile (« 29 février » en 2026 → 2028-02-29).
- **Année explicite → telle quelle, même passée** (règle simple, cohérente, testée : « 14/12/2025 » dit en 2026 → 2025-12-14). Une année écrite est une année voulue : jamais modifiée silencieusement.
- **Années bissextiles respectées** : validation stricte via `new Date(y, m-1, d)` + contrôle des composants (aucun débordement) : « 29/02/2028 » valide, « 29/02/2026 », « 31 avril », « 32/13 » invalides.
- **La date consommée ne va JAMAIS dans le titre** : elle est consommée dans la boucle, avant `cleanTitle` — l'usine à titres de Plume (M-22) n'est PAS modifiée et continue de fonctionner telle quelle (test : aucun chiffre ni nom de mois dans les titres).
- **Garde-fou** : un fragment qui ressemble à une date mais n'est pas valide (« 32/13/2026 », « le 30 février », « 00/12/2026 ») n'est PAS consommé : il reste visible dans le titre ET part dans le nouveau champ `dateWarning` de `ParsedInputDetails`. `dateWarningMessage(warning, hasDate)` fabrique l'avertissement clair : « Date non comprise (« … »), mise à aujourd'hui — corrige-la si besoin. » (le « mise à aujourd'hui » n'est dit que si aucune date n'a été reconnue). `parseInput` garde exactement sa forme historique à 5 champs (test verrouillé intact) : `dateWarning` n'est exposé que par `parseInputDetailed`.
- Pas de fausses alertes : une heure invalide (« 25h »), une année seule (« en 2026 »), un nombre sans « / » (« code 2512 ») ne sont PAS des dates → `dateWarning` reste `null`. Les dates numériques exigent le séparateur « / » avec jour et mois sur 2 chiffres sur le token BRUT (sinon « 2026 » ou « 1.2 » seraient pris pour des dates).

### `src/lib/voice-commands.ts` — l'avertissement remonte à la voix

- `createFromParsed` prend désormais `ParsedInputDetails` et suffixe la réponse (écrite ET parlée) par `⚠️ ${dateWarningMessage(...)}` quand un fragment date-like n'a pas été reconnu. La branche « ajoute » passe par `parseInputDetailed` pour porter cet avertissement. Aucun changement de routage : « ajoute », « c'est fait », « mon programme », « quoi de prévu demain ? », « ! » inchangés.
- Côté saisie rapide clavier (`quick-add.tsx`, hors zone étanche) : le fragment non reconnu reste dans le titre, donc visible dans le toast avec la date du jour affichée à côté — jamais totalement silencieux ; l'avertissement textuel complet est exposé par le parseur (`dateWarning` / `dateWarningMessage`) et porté par la voix.

## Avant / après — phrases réelles mesurées par Cactus (parseur, aujourd'hui = 2026-11-22, règle 8 : horloge figée dans les tests)

| Phrase tapée | Avant (main `d9ab63f`, mesuré par Cactus le 22/11) | Après (branche) | Date/heure reconnues |
|---|---|---|---|
| « dentiste 14/12/2026 10h » | Événement **aujourd'hui** 10h00, titre « Dentiste 14/12/2026 » | **Événement 2026-12-14 10h00**, titre « Dentiste » | 2026-12-14 10:00 |
| « réunion le 3 janvier 9h » | Aujourd'hui 09h00, titre « Réunion le 3 janvier » | **2027-01-03 09h00**, titre « Réunion » | 2027-01-03 09:00 |
| « 14 décembre 10h » | Aujourd'hui 10h00, titre « 14 décembre » | **2026-12-14 10h00**, titre « Nouvelle tâche » | 2026-12-14 10:00 |
| « anniversaires maman 14 décembre » | Tâche aujourd'hui, titre « Anniversaires maman 14 décembre » | **Tâche 2026-12-14**, titre « Anniversaires maman » | 2026-12-14 |
| « noël 25 décembre » | Tâche aujourd'hui, titre « Noël 25 décembre » | **Tâche 2026-12-25**, titre « Noël » | 2026-12-25 |
| « 1er mai » | Aujourd'hui, titre « 1er mai » | **2027-05-01** (depuis le 22/11/2026) | prochaine occurrence |
| « 25/12 » | Aujourd'hui, titre « 25/12 » | **2026-12-25** | prochaine occurrence |
| « dentiste 32/13/2026 10h » (garde-fou) | Aujourd'hui 10h00, aucun avertissement | Aujourd'hui 10h00, titre « Dentiste 32/13/2026 » **+ dateWarning « 32/13/2026 »**, à la voix : « ⚠️ Date non comprise (« 32/13/2026 »), mise à aujourd'hui — corrige-la si besoin. » | aucune (avertie) |
| « écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2 » | « Stream sur Red Dead 2 », demain 18h00 | **inchangé** (régression M-19/M-22 verrouillée) | 2025-01-07 18:00 (test) |

## Tests

- **+42 nouveaux tests parseur** (89 → 131), **+7 nouveaux tests voix** (40 → 47), aucun test existant supprimé ni modifié (la seule ligne « modifiée » des fichiers de tests est l'import élargi, comme pour Plume).
- Couvre : les 5 phrases réelles de Cactus (avec aujourd'hui = 2026-11-22 figé), tous les formats demandés (« 14 décembre », « le 3 janvier », « 1er mai », « 25/12 », « 14/12 », « 14/12/2026 », abréviations janv./févr./sept./oct./déc.), prochaine occurrence (novembre→janvier 2027, janvier→décembre 2027, même année si à venir, aujourd'hui inclus), années bissextiles (29/02/2028 OK, 29/02/2026 non, « 29 février » → 2028), année explicite passée conservée, la date jamais dans le titre, `hasDate` levé (la voix crée bien l'élément), `parseInput` à 5 champs, le garde-fou (dateWarning + date = aujourd'hui + fragment visible dans le titre + message d'avertissement), l'absence de fausse alerte (« 25h », « en 2026 », « code 2512 »), et les régressions (demain/jeudi/dans 2 semaines/« ! »/Red Dead 2/auto-correction « plutôt aujourd'hui »).
- **Règle 8 respectée** : côté parseur, horloge figée (`TODAY = '2025-01-06'`, `CACTUS = '2026-11-22'` passés en paramètre) ; côté voix, dates recalculées à l'exécution (`todayISO()`, prochaine occurrence du 14 décembre calculée, année explicite 2099 toujours future). Aucune date littérale comparée au jour réel.

## Validations (2026-11-23, ~05:35 UTC)

- `npx vitest run` → **621/621 verts** (32 fichiers ; base 571 intacte + 49 nouveaux + 1 ajustement de counting).
- `npx tsc --noEmit` → ✅ (zéro erreur).
- `npm run test:parser` → ✅ tous les tests passent.
- `npm run build` → ✅ (First Load JS 87,5 kO inchangé).

## Décisions (résumé)

- Année absente = prochaine occurrence **≥ aujourd'hui** (aujourd'hui inclus, comme `nextWeekdayISO`) ; année explicite = telle quelle, même passée (jamais de modification silencieuse d'une date écrite).
- Dates numériques : séparateur « / » exigé, jour/mois sur 2 chiffres, sur le token brut → zéro fausse alerte sur « 2026 », « 1.2 », « 10-12 ».
- Un fragment date-like non valide reste dans le titre (visible partout) + `dateWarning` dans le détail + avertissement à la voix. Jamais de création silencieuse au mauvais jour.
- `cleanTitle` (Plume) untouché ; `parseInput` à 5 champs inchangé (test verrouillé vert).

## Liens

- Branche : `vibe/almanach-dates-absolues` · PR : **#48** https://github.com/User313MSI/Centeryou/pull/48 (brouillon, base `main`, 6 fichiers = la zone étanche exactement).
- Pushs : inscription branche (`6c88b46`), livraison code+tests+journal (`2ea8cbb`), inscription PR #48 (`436c9d8`), merge de `origin/main` `876f700` (commit M-23 Nuage, aucun conflit — MISSIONS.md sections disjointes) `6a1bcbf` — 2026-11-23 ~05:45 UTC. Après merge : 621/621 tests verts, branche à jour de `main`.
