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

### M-02 — Bâtisseur · Installateur Windows (.exe)
- **État : PR OUVERTE + RELEASE PUBLIÉE — EN ATTENTE DU VERDICT DE VIBE WORK** (lancée par l'Adjudant le 2026-11-20 à 04:48 UTC, après le « on y go » de l'utilisateur et le feu vert de Vibe Work : M-01 fusionnée, commit `89e4120`)
- Objectif : configurer electron-builder (NSIS x64), compiler `Centeryou-Setup-1.0.0.exe` 100 % français, le tester (installation, connexion, voix, mode sombre), publier la Release GitHub « Centeryou Bureau v1.0 » (tag `bureau-v1.0`), journal dans `docs/journal/batisseur.md`, PR base `main` (configuration seulement, jamais le .exe dans le dépôt).
- PR : https://github.com/User313MSI/Centeryou/pull/23 (base `main`, branche `vibe/batisseur-son-dossier`, 9 fichiers texte, config seule — 0 binaire tracké) · Release : https://github.com/User313MSI/Centeryou/releases/tag/bureau-v1.0 (« Centeryou Bureau v1.0 », asset `Centeryou-Setup-1.0.0.exe` = 82 001 315 octets ≈ 78 Mio) · Dernière nouvelle : 2026-11-20 05:14 UTC — PR #23 ouverte par Bâtisseur, CI verte (tests Vitest + build ✅), installateur NSIS x64 100 % FR testé sur machine Windows réelle (install /S, connexion, planning, voix, mode sombre, réglages persistés, désinstall /S avec données conservées), journal `docs/journal/batisseur.md`. **En attente de vérification et fusion par Vibe Work** — l'Adjudant ne fusionne pas.

## Missions terminées (mémoire)

- **M-01 — Apollon · Expérience parfaite — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #22, squash commit `89e4120`, 43 fichiers, ~30 corrections : bugs Windows/render, chevauchements en colonnes, textes FR 100 %, accessibilité clavier + contrastes, pages légales alignées sur la réalité Premium). Revue Vibe Work : conforme aux règles (tokens inchangés, aucun test supprimé — 176/176, pas de sidebar, aucune variable d'env renommée, CI verte + build ✅). Déploiement Vercel automatique lancé. Journal : `journal/apollon.md`. Sujet à garder sous le coude pour plus tard (noté par Apollon) : montée de version majeure next/vitest pour les vulnérabilités connues.
- Campagne v4 (17 PR fusionnées 13-15/11) : voix sécurisée, comptes, paiement, mobile, bureau-web, conformité, lancement — voir `journal/omega.md`.
- Polish 15-20/11 : fluidité (Lynx, −31 % de poids), sécurité (Sécure, CSP nonce + rate-limit), stats (Sigma, page /stats en ligne — fusionnée par Vibe Work le 20/11).
