# Journal — Compris

## Mission M-19 — Saisie vocale & rapide VRAIMENT naturelle (dictée en production)

- **Agent** : Compris (session Vibe Code dédiée). Branche : `vibe/compris-voix-naturelle` (base `main` 68d8a4d, après inscription M-19 dans MISSIONS.md poussée sur main le 2026-11-21 à 22:38 UTC).
- **PR** : **https://github.com/User313MSI/Centeryou/pull/39** (brouillon, base `main`, commit `c677dd0`, ouvert le 2026-11-21 à ~23:55 UTC) — voir MISSIONS.md.
- **Zone étanche tenue** : `src/lib/voice-commands.ts`, `src/lib/parser.ts`, `tests/parser.test.ts`, `tests/voice-commands.test.ts`, ce journal. **Aucun autre fichier touché** (`git diff --name-only` à la livraison = ces 5 fichiers). INTERDIT respecté : pas de `src/lib/sons.ts`, `launch-film.tsx`, `globals.css`, `src/app/api/**`, `src/app/stats/**`, `package.json`, aucun fichier ICS. Zéro nouvelle dépendance. Interface 100 % FR. Aucune fusion (réservé à Vibe Work).
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (règles 1–8, notamment règle 8 sur les dates de test), tout `docs/journal/` (rien de refait : M-08 Bouclier a déjà sécurisé le parseur, M-07 Pont les ICS — zones voisines non touchées).

## Diagnostic (vérifié moi-même, 2026-11-21 ~23:40 UTC)

- `parseInput("stream sur Red Dead 2 demain à 18h", jour)` → `{ title: "Stream sur Red Dead 2", date: demain, time: "18:00" }` ✅ le moteur comprend.
- `handleVoiceCommand("écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2")` → « Je n’ai pas compris » ❌ car la création ne se déclenchait que si `norm.startsWith('ajoute')`.
- Le parseur laissait aussi les mots de remplissage dans le titre : phrase entière → titre « Écris-moi que j'ai un stream sur Red Dead 2 ».

## Changements

### `src/lib/parser.ts`
- Nouvelle exportation `parseInputDetailed(raw, today)` qui rend `ParsedInputDetails` = `ParsedInput` + `hasDate`/`hasTime` (une date ou une heure a-t-elle été **reconnue** dans la phrase — la date par défaut « aujourd’hui » ne compte pas). `parseInput` garde **exactement** sa forme historique à 5 champs (test `Object.keys` à l’appui) : aucun test existant modifié.
- Masque de mots de remplissage retirés du titre (`fillerSkipMask`) : « j’ai » (normalisé `jai`) disparaît **partout** dans la phrase, l’article « un/une » collé à « j’ai » part avec ; en tête de phrase : « écris-moi que », « écris moi que », « dis-moi que », « note que », « ajoute », « mets », « met », « rappelle-moi (que) » ; puis article « un/une » en tête du cœur de phrase.
- « à » ignoré devant `18h`, `18:00`, mais aussi `midi`/`minuit` (le « à » ne reste jamais dans le titre devant une heure).
- « ce matin » = aujourd’hui (aucune heure inventée, contrairement à « ce soir » → 19:00, inchangé).
- « soir »/« matin » seuls : retirés du titre **si une heure explicite existe** dans la phrase (« demain soir 21h » → 21:00, titre sans « soir ») ; sinon ils **restent** dans le titre et la date reste « demain » (« dîner demain soir » → tâche « Dîner soir » demain, aucune heure inventée).

### `src/lib/voice-commands.ts`
- La logique de création (heure = événement d’1 h avec refus poli si créneau déjà pris exactement, sinon tâche) est factorisée dans `createFromParsed`, utilisée **à l’identique** par la branche « ajoute » et par le nouveau repli.
- **Repli M-19** : dans le `else` final, `parseInputDetailed` est toujours tenté sur la phrase entière ; si `hasDate || hasTime`, la tâche/l’événement est créé et la confirmation habituelle est répondue. « Je n’ai pas compris » n’intervient que si la phrase ne contient vraiment aucune date ni heure.
- Ordre des branches inchangé : « ajoute », « c’est fait », « quoi de prévu demain », « mon programme / agenda / aujourd’hui / que dois-je faire » continuent de répondre exactement comme avant (test « agenda » ajouté pour le verrouiller).
- Message d’aide amélioré (`HELP_REPLY`) : « Je n’ai pas compris. Dis ce que tu veux dans les mots que tu veux : “stream Red Dead 2 demain soir 21h” ou “rdv dentiste vendredi 10h30” seront compris. Formules sûres : “ajoute sport demain 14h”, “mon programme”, “quoi de prévu demain ?”, “c’est fait sport”. »

## Avant / après — 10 phrases exemples (capturées réellement, 2026-11-21, jour réel = 2026-11-21, demain = 2026-11-22, vendredi = 2026-11-27)

| Phrase dictée | Avant (voix) | Après (voix) |
|---|---|---|
| « écris-moi que demain à 18:00 j'ai un stream sur Red Dead 2 » | « Je n’ai pas compris… » (rien créé) | « Ajouté : Stream sur Red Dead 2, demain à 18h00. » → événement 2026-11-22 18:00–19:00 |
| « note que vendredi j’ai rdv dentiste 10h30 » | « Je n’ai pas compris… » | « Ajouté : Rdv dentiste, vendredi 27 novembre à 10h30. » → événement 2026-11-27 10:30–11:30 |
| « stream Red Dead 2 demain soir 21h » | « Je n’ai pas compris… » (titre parseur pollué « … demain soir ») | « Ajouté : Stream Red Dead 2, demain à 21h00. » → 21:00–22:00, « soir » retiré |
| « j'ai une réunion demain matin à 9h » | « Je n’ai pas compris… » | « Ajouté : Réunion, demain à 09h00. » → 09:00–10:00 |
| « rappelle-moi d'acheter du pain demain » | « Je n’ai pas compris… » | « Ajouté à tes tâches : D'acheter du pain, pour demain. » → tâche 2026-11-22 |
| « appel paul à 15h » | « Je n’ai pas compris… » | « Ajouté : Appel paul, aujourd'hui à 15h00. » → 15:00–16:00 |
| « dîner demain soir » | « Je n’ai pas compris… » | « Ajouté à tes tâches : Dîner soir, pour demain. » (« soir » gardé, aucune heure inventée) |
| « laver la voiture samedi » | « Je n’ai pas compris… » | « Ajouté à tes tâches : Laver la voiture, pour samedi. » |
| « ! demain je dois finir le rapport » | « Je n’ai pas compris… » | « Ajouté à tes tâches : Je dois finir le rapport, pour demain. » prio **haute** |
| « blabla incompris » | « Je n’ai pas compris. Essaie : « ajoute sport demain 14h »… » | « Je n’ai pas compris. Dis ce que tu veux dans les mots que tu veux : « stream Red Dead 2 demain soir 21h »… » + formules figées (rien créé) |

Avant, la saisie rapide avait le même défaut de titres : `parseInput` de la phrase entière donnait « Écris-moi que j'ai un stream sur Red Dead 2 » ; après : « Stream sur Red Dead 2 ».

## Tests

- **+44 nouveaux tests, aucun supprimé ni modifié** : `tests/parser.test.ts` 46 → 70 (24 nouveaux : 20 phrases naturelles en `it.each` + « à » jamais dans le titre + « j’ai » au milieu + 2 blocs `parseInputDetailed`), `tests/voice-commands.test.ts` 11 → 31 (20 nouveaux : la phrase de l’utilisateur en premier, créations naturelles, conflit en phrase naturelle, aide améliorée, verrou « agenda »).
- **Règle 8 respectée** : dans `voice-commands.test.ts`, toutes les dates attendues sont recalculées à l’exécution (`todayISO()`, `addDaysISO(todayISO(), n)`, `nextWeekdayISO(idx, todayISO())`) — aucune date littérale comparée au jour réel. Dans `parser.test.ts`, l’horloge est figée par le paramètre `today` (« 2025-01-06 », comme les tests existants).
- **Validation 2026-11-21 ~23:51 UTC** : `npx vitest run` → **539/539 verts** (32 fichiers) · `npx tsc --noEmit` → ✅ · `npm run test:parser` → ✅ · `npm run build` → ✅ (23 routes, First Load JS 87,5 kO inchangé).

## Décisions

- Le repli `parseInput` ne s’applique qu’avant le « Je n’ai pas compris » (dernier `else`) : l’ordre des commandes existantes est strictement conservé (« ajoute », « c’est fait », « quoi de prévu demain », « mon programme », « agenda », « aujourd’hui », « ! » prioritaire) — une phrase contenant « aujourd’hui » continue de lire le programme, comme avant (règle 5 « ne rien casser »).
- `ParsedInput` inchangé (5 champs) pour ne casser aucun consommateur (`quick-add.tsx`, `bienvenue/page.tsx`) ni aucun test existant ; `parseInputDetailed` n’est utilisée que par la voix.
- Aucun appel réseau, aucune dépendance ajoutée (`package.json` inchangé).

## Liens

- Inscription M-19 sur `main` : commit `68d8a4d` (2026-11-21 22:38 UTC).
- Branche : `vibe/compris-voix-naturelle` · PR : voir MISSIONS.md (base `main`).
