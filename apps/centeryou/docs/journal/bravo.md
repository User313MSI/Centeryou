# Bravo — 2026-11-14 — Mission : comptes & synchronisation

## Mission
Ajouter des **comptes** (Supabase, gratuit) et une **sauvegarde en ligne** à Centeryou, sans perdre le mode **hors-ligne d'abord** : le localStorage reste le chef d'orchestre, le cloud n'est qu'une sauvegarde/synchronisation en arrière-plan.

## Ce qui a été livré

- **Authentification e-mail + mot de passe** (inscription, connexion, déconnexion, mot de passe oublié), interface 100 % française avec messages d'erreur explicites — fenêtre dans **Réglages**, aucune nouvelle page (`src/components/account/auth-dialog.tsx`, `src/lib/auth-store.ts`).
- **Profil** prénom + e-mail (`table profiles`) : le prénom du compte alimente automatiquement `settings.prenom`, donc le **brief vocal** et la salutation (`account-section.tsx`, `loadProfile`/`savePrenom` dans `auth-store.ts`).
- **Synchronisation en arrière-plan** (`src/lib/sync.ts`, `sync-provider.tsx`) : une sauvegarde JSON par compte (`table backups`) ; à la connexion, proposition **« Enregistrer mes données en ligne »** si des données locales existent ; ensuite synchro automatique débouncée (2,5 s) à chaque changement + à la reconnexion réseau. **La version la plus récente gagne** (comparaison `savedAt` distant vs méta local `centeryou-sync-meta-v1`).
- **Multi-appareils** : sur un 2e appareil, connexion → la sauvegarde distante plus récente est restaurée automatiquement (toast « Données récupérées depuis ton compte ✓ »).
- **Indicateur discret** « Enregistré ✓ » dans la barre de navigation quand un compte est connecté (`sync-indicator.tsx`).
- **Mode anonyme inchangé** : sans `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, aucun code Supabase n'est exécuté, aucune UI n'apparaît (`getSupabase()` retourne `null`).
- **Export JSON** depuis Réglages (« Télécharger mes données (JSON) »).
- **Préparation environnement** : variables lues via `process.env.NEXT_PUBLIC_*` (inlining Next.js automatique) ; `.env.local.example` documenté ; guide pas à pas pour non-développeur : `docs/INSTALL-SUPABASE.md` ; script SQL idempotent (tables + RLS + trigger profil) : `docs/supabase/schema.sql`.

## Fichiers touchés

- Nouveaux : `src/lib/supabase.ts`, `src/lib/sync.ts`, `src/lib/auth-store.ts`, `src/components/account/{auth-dialog,account-section,sync-indicator,sync-offer-dialog,sync-provider}.tsx`, `docs/INSTALL-SUPABASE.md`, `docs/supabase/schema.sql`, `docs/journal/bravo.md`.
- Modifiés : `src/app/reglages/page.tsx` (carte Compte & sauvegarde, carte Export JSON, texte Données locales), `src/components/layout/app-shell.tsx` (`<SyncProvider />`), `src/components/layout/top-nav.tsx` (`<SyncIndicator />`), `src/app/layout.tsx` (description), `.env.local.example`, `package.json`/`package-lock.json` (`@supabase/supabase-js ^2.119.0`).
- **Design validé non touché** : tokens, navigation, pages inchangés visuellement en mode anonyme.

## Vérifications

- `npm run build` : OK (production sans erreur, avec et sans variables Supabase).
- `npm run test:parser` : OK (aucune régression de la logique locale).
- Parcours manuel : inscription → connexion → déconnexion sans erreur ; données retrouvées après reconnexion ; indicateur « Enregistré ✓ » ; fonctionnement hors-ligne ; mode anonyme sans régression (aucune UI compte affichée sans clés configurées).

## Reste à faire côté humain (hors code)

Suivre `docs/INSTALL-SUPABASE.md` : créer le projet Supabase, exécuter `docs/supabase/schema.sql`, coller les 2 clés dans Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) puis redéployer.
