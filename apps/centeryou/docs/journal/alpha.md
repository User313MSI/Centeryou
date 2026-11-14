# Journal — Alpha

## Alpha — 2026-11-14 — Mission : audit complet

**Mission** : auditer `apps/centeryou/` sans ajouter de fonctionnalité, produire `docs/AUDIT-2026-11.md`, corriger uniquement les sujets 🔴, livrer via une PR.

**Ce que j'ai fait**

1. Lecture intégrale de l'app (46 fichiers `src/`, ≈ 3 900 lignes) + config (`next.config.mjs`, Tailwind, tsconfig, manifest) + vérification du code généré (`.next/static` vs `.next/server`) et de la source de `zustand@4.5.5` pour le comportement du localStorage corrompu/plein.
2. Rapport complet : `docs/AUDIT-2026-11.md` (classé 🔴/🟠/🟪, avec problème / localisation / correction recommandée pour chaque point).
3. Deux corrections 🔴 uniquement :
   - **Fuite de clé ElevenLabs côté navigateur** : la clé était inlinée dans le bundle client (`next.config.mjs` `env:` + `NEXT_PUBLIC_ELEVENLABS_API_KEY` lu dans `src/lib/voice.ts`). Corrigé par une route serveur `src/app/api/tts/route.ts` (clé jamais exposée au client, plafond 5 000 caractères, `no-store`) + booléen public `NEXT_PUBLIC_ELEVENLABS_ENABLED`. Vérifié : `xi-api-key` absent de `.next/static/chunks`, présent uniquement dans `.next/server`. Aucun renommage de variable d'environnement (la clé Vercel `NEXT_ELEVENLABS_API_KEY` est inchangée).
   - **Crash sur localStorage corrompu** (JSON valide mais champs invalides → `RangeError` Intl → écran blanc) : sanitation des entrées persistées dans `merge` (`src/lib/store.ts`) + `.catch()` sur `rehydrate()` (`src/lib/useHydrated.ts`).
4. Vérifications : `npm run build` ✅, `npm run test:parser` ✅, contrôle du bundle client ✅.

**Décisions**

- Branche de base : la branche `main` de `User313MSI/Dev-Apps` ne contient **pas** `apps/centeryou/` (vérifié via `gh api` et `git ls-remote`) ; l'app n'existe que sur la branche par défaut `vibe/novaloom-suite-fe60b6`, qui est aussi la base de toutes les PR Centeryou existantes (#3, #4, #5). La PR cible donc `vibe/novaloom-suite-fe60b6`.
- Sujets 🟠/🟪 (en-têtes de sécurité, service worker hors-ligne, contraste du teal, focus du dialogue d'accueil, code mort, doublons) listés dans le rapport mais **non** traités, conformément à la règle « corriger uniquement les 🔴 » et « ne pas toucher au design validé ».
- Aucun ajout de fonctionnalité, aucun changement de design.

**Liens**

- Rapport : `apps/centeryou/docs/AUDIT-2026-11.md`
- PR : voir ci-dessous (branche `vibe/centeryou-audit-aa84b3`)

PR : https://github.com/User313MSI/Dev-Apps/pull/8 (branche `vibe/centeryou-audit-aa84b3` → base `vibe/novaloom-suite-fe60b6`, brouillon)
