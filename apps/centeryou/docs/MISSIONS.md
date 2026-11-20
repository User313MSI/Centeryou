# MISSIONS.md — Le tableau des missions Centeryou

**Canal partagé entre :**
- **l'Adjudant** (session Vibe Code, bras technique — met à jour ce fichier après chaque étape)
- **Vibe Work** (chef d'orchestre — vérifie, fusionne les PR, déploie, annote ici)

## Règles du canal

1. Chaque mission = une entrée : agent, objectif, état, lien PR, dernière nouvelle (heure UTC).
2. L'Adjudant met à jour ce fichier après chaque étape — c'est le **seul** fichier qu'il commite directement sur `main`.
3. Les agents travaillent chacun sur SA branche et ouvrent leur PR (base `main`). **La fusion des PR reste le rôle exclusif de Vibe Work** (double contrôle : les agents codent, l'Adjudant supervise, Vibe vérifie et fusionne).
4. Quand Vibe Work annote « ✅ fusionnée » : la mission côté code est close. « ❌ refusée (raison) » : l'Adjudant corrige le tir.
5. Conflit entre agents : l'Adjudant arbitre et documente le choix ici.
6. Avant toute nouvelle mission : lire `AGENTS.md`, ce fichier et `apps/centeryou/docs/journal/` — ne jamais refaire ce qui est déjà fait.

## Missions en cours

### M-01 — Apollon · Expérience parfaite (audit + corrections)
- **État : EN COURS** (lancée par l'Adjudant le 2026-11-20 à 03:14 UTC)
- Objectif : parcours réels de l'app complète (découverte, fidèle, mobile 360 px, voix), corriger tout : bugs, textes FR, états vides, cohérence visuelle, accessibilité, performance. Le prompt complet est fourni dans la session de l'Adjudant.
- PR : — · Dernière nouvelle : 2026-11-20 03:14 UTC — mission déléguée à l'agent Apollon (branche `vibe/apollon-son-dossier`) : audit des 4 parcours sur https://dev-apps-centeryou.vercel.app, corrections (bugs → textes FR → états vides → cohérence → accessibilité → performance), puis PR base `main`. En attente de sa PR.

### M-02 — Bâtisseur · Installateur Windows (.exe)
- **État : EN ATTENTE DE M-01** (le .exe doit embarquer la version parfaite)
- Objectif : configurer electron-builder (NSIS x64), compiler `Centeryou-Setup-1.0.0.exe` 100 % français, le tester, publier la Release GitHub « Centeryou Bureau v1.0 ». Le prompt complet est fourni dans la session de l'Adjudant.
- PR : — · Dernière nouvelle : —.

## Missions terminées (mémoire)

- Campagne v4 (17 PR fusionnées 13-15/11) : voix sécurisée, comptes, paiement, mobile, bureau-web, conformité, lancement — voir `journal/omega.md`.
- Polish 15-20/11 : fluidité (Lynx, −31 % de poids), sécurité (Sécure, CSP nonce + rate-limit), stats (Sigma, page /stats en ligne — fusionnée par Vibe Work le 20/11).
