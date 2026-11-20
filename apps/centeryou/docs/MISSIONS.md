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

### M-03 — Sentinelle · Audit technique complet (lecture seule, rapport)
- **État : À LANCER** (inscrite par Vibe Work le 20/11 après l'étude produit/marché — l'utilisateur va dire « on y go » à l'Adjudant)
- Objectif : audit technique complet SANS aucun correctif de code, sur 7 axes (sécurité, robustesse métier/parseur/récurrences/fuseaux, performance, dette code, accessibilité, tests/CI, cohérence des données), chaque axe noté 0-5 avec preuves. Livrable : journal `docs/journal/sentinelle.md` (contrat + top 15 des risques restants classés impact/effort + verdict « prêt pour le lancement du 1/01/2027 ? ») + PR base main contenant uniquement le rapport. Le prompt complet est fourni dans la session de l'Adjudant (section « Mission M-03 » du rapport d'étude de Vibe Work).
- Contexte venant de l'étude (Vibe Work, 20/11) : à confirmer précisément pendant l'audit — niveau exact du champ `repeat` (récurrences), comportement des fuseaux horaires, ce que les 176 tests ne couvrent pas (restore corrompu, offline, webhook Stripe), vulnérabilités next 14.2.35 / vitest 2.x (CVE réelles), contraste token voix en mode sombre.
- PR : — · Dernière nouvelle : attente de lancement. Après M-03, les prochains chantiers pressentis (ordre à confirmer avec l'utilisateur après lecture du rapport) : M-04 rappels + notifications, M-05 export/import ICS.

### M-04 — Rappels & notifications (pressenti, après M-03)
- **État : EN ATTENTE** — à spécifier avec l'utilisateur après la lecture du rapport M-03 (priorité n°1 de l'étude marché : chaînon manquant de l'app, notifications = rétention ×2).
- PR : — · Dernière nouvelle : —.

## Missions terminées (mémoire)

- **M-02 — Bâtisseur · Installateur Windows — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #23, squash commit `2943109`, 8 fichiers texte, configuration uniquement, aucun binaire dans le dépôt). Installateur `Centeryou-Setup-1.0.0.exe` (78 Mio) : assistant NSIS x64 100 % FR, installation sans admin, menu Démarrer obligatoire + bureau en option, « Lancer Centeryou » à la fin, désinstallation propre qui **conserve les données utilisateur**. Testé sur machine Windows réelle par Bâtisseur (install, connexion prod, voix avec repli, mode sombre, réglages persistés, désinstall). Vibe Work a vérifié la Release et le lien de téléchargement (200) : https://github.com/User313MSI/Centeryou/releases/tag/bureau-v1.0. Journal : `journal/batisseur.md`. Lien de mise à jour de l'app corrigé vers le dépôt Centeryou.
- **M-01 — Apollon · Expérience parfaite — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #22, squash commit `89e4120`, 43 fichiers, ~30 corrections : bugs Windows/render, chevauchements en colonnes, textes FR 100 %, accessibilité clavier + contrastes, pages légales alignées sur la réalité Premium). Revue Vibe Work : conforme aux règles (tokens inchangés, aucun test supprimé — 176/176, pas de sidebar, aucune variable d'env renommée, CI verte + build ✅). Déploiement Vercel automatique vérifié. Journal : `journal/apollon.md`. Sujet à garder sous le coude pour plus tard (noté par Apollon) : montée de version majeure next/vitest pour les vulnérabilités connues.
- Campagne v4 (17 PR fusionnées 13-15/11) : voix sécurisée, comptes, paiement, mobile, bureau-web, conformité, lancement — voir `journal/omega.md`.
- Polish 15-20/11 : fluidité (Lynx, −31 % de poids), sécurité (Sécure, CSP nonce + rate-limit), stats (Sigma, page /stats — fusionnée par Vibe Work le 20/11).
