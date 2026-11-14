# Hugo — 2026-11-14 — Mission : tests & fiabilité

Mission « que plus rien ne casse » sur **Centeryou** (`apps/centeryou/`, Next.js 14 App Router + TypeScript + Zustand + localStorage).

> Note de cadrage : dans ce dépôt, l'application Centeryou vit sur la branche par défaut
> `vibe/novaloom-suite-fe60b6` (les PR #3, #4, #5 y ont été mergées) — la branche `main`
> ne contient pas `apps/centeryou/`. La PR de cette mission cible donc la branche par
> défaut du dépôt, seule base contenant l'app.

## 1. Suite de tests automatisés (Vitest + Testing Library)

- `npm test` lance **Vitest** (jsdom + @testing-library/react), 11 fichiers, **123 tests**.
- `tests/parser.test.ts` : **36 cas réels** de saisie naturelle (« sport demain 14h », « !lundi réunion », « dentist mardi 10h30 santé », « après-demain », « dans 3 jours », « ce soir », « midi », « à 20h », heures invalides `25h`/`10h70`, entrée vide…).
- `tests/store.test.ts` : store Zustand — création/modification/suppression d'événements et de tâches, `moveEvent` borné, récurrence (`jamais`/`jour`/`semaine`/`mois`), réglages, persistance.
- `tests/events.test.ts` : conflits, chevauchements, vues Jour/Semaine/Mois.
- `tests/welcome-sequence.test.tsx` : séquence d'accueil — modes `always` / `daily` (défaut) / `off`, marquage du jour, fermeture « Passer », voix jamais auto-démarrée.
- `tests/voice-commands.test.ts` + `tests/voice.test.ts` : commandes vocales (« ajoute… », « c'est fait… », « mon programme », « quoi de prévu demain ? »), **activation/quota voix** (réglage « Assistant vocal » : `speak()` jamais appelé quand désactivé, bips coupés quand « sons » off), bascule ElevenLabs → Web Speech sans erreur bloquante. *Aucun quota numérique n'existe dans l'app : les tests couvrent le gating voix existant, sans changer de comportement.*
- `tests/reglages.test.tsx` : page Réglages — export/import avec confirmation, réglages.
- `tests/backup.test.ts`, `tests/safe-storage.test.ts`, `tests/error-boundary.test.tsx`, `tests/dates.test.ts`.
- L'ancien `npm run test:parser` (sans dépendance) continue de passer.

## 2. Résilience des données

- `src/lib/safe-storage.ts` : `PersistStorage` localStorage protégé, branché dans le `persist` du store.
  - **JSON corrompu** → copie de secours sous `centeryou-v1__corrupt-<horodatage>` (aucune perte), état neuf, **aucun crash**, statut exposé via `getStorageReport()` et toast clair au démarrage (`app-shell.tsx`).
  - **Quota plein** (`QuotaExceededError`) → aucun crash, message clair en français (« Le stockage de ce navigateur est plein… »), dernière valeur conservée en mémoire pour la session.
  - Toutes les lectures/écritures/suppressions passent par des try/catch.
- `src/lib/sanitize.ts` : le `merge` du persist ne garde que les événements/tâches bien formés (les valides sont conservés = réparation douce sans perte) et complète les réglages manquants avec les défauts (`src/lib/defaults.ts`).

## 3. Sauvegarde manuelle

- `src/lib/backup.ts` : `serializeBackup` / `parseBackup` (validation + messages d'erreur français clairs) / `downloadBackup` / `readBackupFile`.
- Réglages → « Données locales » : **« Sauvegarder mes données »** (export JSON `centeryou-sauvegarde-AAAA-MM-JJ.json`) et **« Restaurer une sauvegarde… »** (import JSON) — l'application n'a lieu **qu'après un clic sur « Confirmer la restauration »**.
- Action `restoreBackup` ajoutée au store (sanitise avant d'appliquer).

## 4. Écran d'erreur élégant

- `src/components/error/error-screen.tsx` + `error-boundary.tsx` : si une vue plante, écran français apaisé (« Oups… une petite panne — tes données restent en sécurité dans ce navigateur ») avec **« Recharger »** (et « Réessayer ») — jamais de page blanche. Le boundary enveloppe le contenu dans `app-shell.tsx`.
- `src/app/error.tsx` et `src/app/global-error.tsx` pour les erreurs de route/racine Next.js.

## 5. CI

- `.github/workflows/centeryou-ci.yml` : sur chaque PR touchant `apps/centeryou/**` (et push sur les branches du dépôt), exécute `npm ci` → `npm test` → `npm run test:parser` → `npm run build`. Un test en échec fait échouer le job et bloque la PR.

## Bugs corrigés

Aucun. Aucun test n'a fait échouer une fonctionnalité existante : aucun comportement attendu n'a été modifié, aucun changement de design. Seuls des ajouts (tests, libs, écrans, CI) et un refactor interne sans changement de comportement (`defaultSettings` déplacé dans `src/lib/defaults.ts`, logique d'affichage de la séquence d'accueil extraite dans `src/lib/welcome.ts`).

## Vérification locale (2026-11-14)

- `npm test` → 123/123 ✅
- `npx tsc --noEmit` → ✅
- `npm run build` → ✅ (8 pages statiques)
- `npm run test:parser` → ✅
