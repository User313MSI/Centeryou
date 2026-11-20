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

_(aucune — l'Adjudant se met en attente : c'est l'utilisateur qui mène. Prochain horizon validé : Supabase/Stripe, usage quotidien, point 30-31/12, puis la vraie app mobile native après le 1/01/2027. Des missions pourront être déléguées à la demande de l'utilisateur.)_

## Missions terminées (mémoire)

- **M-02 — Bâtisseur · Installateur Windows — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #23, squash commit `2943109`, 8 fichiers texte, configuration uniquement, aucun binaire dans le dépôt). Installateur `Centeryou-Setup-1.0.0.exe` (78 Mio) : assistant NSIS x64 100 % FR, installation sans admin, menu Démarrer obligatoire + bureau en option, « Lancer Centeryou » à la fin, désinstallation propre qui **conserve les données utilisateur**. Testé sur machine Windows réelle par Bâtisseur (install, connexion prod, voix avec repli, mode sombre, réglages persistés, désinstall). Vibe Work a vérifié la Release et le lien de téléchargement (200) : https://github.com/User313MSI/Centeryou/releases/tag/bureau-v1.0. Journal : `journal/batisseur.md`. Lien de mise à jour de l'app corrigé vers le dépôt Centeryou.
- **M-01 — Apollon · Expérience parfaite — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #22, squash commit `89e4120`, 43 fichiers, ~30 corrections : bugs Windows/render, chevauchements en colonnes, textes FR 100 %, accessibilité clavier + contrastes, pages légales alignées sur la réalité Premium). Revue Vibe Work : conforme aux règles (tokens inchangés, aucun test supprimé — 176/176, pas de sidebar, aucune variable d'env renommée, CI verte + build ✅). Déploiement Vercel automatique lancé. Journal : `journal/apollon.md`. Sujet à garder sous le coude pour plus tard (noté par Apollon) : montée de version majeure next/vitest pour les vulnérabilités connues.
- Campagne v4 (17 PR fusionnées 13-15/11) : voix sécurisée, comptes, paiement, mobile, bureau-web, conformité, lancement — voir `journal/omega.md`.
- Polish 15-20/11 : fluidité (Lynx, −31 % de poids), sécurité (Sécure, CSP nonce + rate-limit), stats (Sigma, page /stats en ligne — fusionnée par Vibe Work le 20/11).
