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
- **État : EN COURS** (lancée par l'Adjudant le 2026-11-20 à 07:33 UTC, après « on y go » de l'utilisateur — M-01 et M-02 sont ✅ fusionnées)
- Objectif : audit technique complet SANS aucun correctif de code, sur 7 axes (sécurité, robustesse métier/parseur/récurrences/fuseaux, performance, dette code, accessibilité, tests/CI, cohérence des données), chaque axe noté 0-5 avec preuves. Livrable : journal `docs/journal/sentinelle.md` (contrat + top 15 des risques restants classés impact/effort + verdict « prêt pour le lancement du 1/01/2027 ? ») + PR base main contenant uniquement le rapport. Le prompt complet est fourni dans la session de l'Adjudant.
- Contexte venant de l'étude (Vibe Work, 20/11) : à confirmer précisément pendant l'audit — niveau exact du champ `repeat` (récurrences), comportement des fuseaux horaires, ce que les 176 tests ne couvrent pas (restore corrompu, offline, webhook Stripe), vulnérabilités next 14.2.35 / vitest 2.x (CVE réelles), contraste token voix en mode sombre.
- PR : — · Dernière nouvelle : 2026-11-20 07:33 UTC — mission déléguée à l'agent Sentinelle (branche `vibe/sentinelle-audit-complet`) : audit EN LECTURE SEULE sur 7 axes notés 0-5 avec preuves, top 15 des risques, verdict lancement 01/01/2027, puis PR base `main` contenant UNIQUEMENT le rapport (`docs/journal/sentinelle.md`). En attente de sa PR. Ordre après M-03 (demandes utilisateur du 20/11, sauf alerte grave dans le rapport Sentinelle) : **M-05 Paillette** (animations & célébrations), puis **M-06 Réalisateur** (film de lancement cinématique personnalisé, avec voix), puis **M-04 rappels + notifications** (priorité n°1 de l'étude marché), puis **M-07 export/import ICS**.

### M-05 — Paillette · Animations & célébrations (demande utilisateur du 20/11)
- **État : À LANCER juste après M-03** (l'utilisateur a demandé : « animations quand un événement se crée » + petites joies d'usage ; le prompt complet est fourni dans la session de l'Adjudant)
- Objectif : rendre les moments clés vivants et joyeux, avec goût (jamais de carnival) : création d'événement (apparition élastique + halo + onde violette depuis le point de création), coche de tâche (micro-confettis sobres au niveau du bloc, jamais plein écran, vibration mobile légère si activée), nouveau record dans les statistiques (petit feu d'artifice discret), transitions douces entre vues, sortie douce à la suppression. Un réglage « Animations & célébrations » (activé par défaut) dans les Réglages, et respect total de prefers-reduced-motion (tout devient statique si l'utilisateur le demande au système).
- Contraintes : aucune nouvelle dépendance (CSS + requestAnimationFrame uniquement), animations en transform/opacity uniquement (pas de re-layout), aucune régression de la vitrine ni du premier chargement, le glisser-déposer et les cibles tactiles restent parfaits pendant et après les animations, tokens inchangés, 176/176 tests intacts, interface 100 % FR. Journal docs/journal/paillette.md, PR base main.
- PR : — · Dernière nouvelle : inscrite par Vibe Work le 20/11.

### M-06 — Réalisateur · Film de lancement cinématique personnalisé (demande utilisateur du 20/11)
- **État : À LANCER après M-05** — l'utilisateur veut qu'à chaque ouverture de l'app par un utilisateur, une expérience cinématique personnalisée se joue : ses données réelles du jour, son prénom, le moment de la journée, une narration par la voix, et un niveau visuel « cinéma » (pas des petits blocs — « vraiment, vraiment beau »). Prototype de référence construit par Vibe Work (canvas « centeryou-le-film-du-projet », prototype HTML avec voix de démonstration) : l'agent doit l'égaler puis le dépasser. Le prompt complet est fourni dans la session de l'Adjudant.
- Objectif : sublimer la séquence d'accueil existante (WelcomeSequence + brief du matin « vu ») en un film de lancement in-app : plein écran, fond nuit animé (halos, particules), ouvertures en fondu flouté, compteurs animés, anneau de progression hebdo, scène « magie » (la phrase dictée devient l'événement), signature d'ondes vocales, tout personnalisé au prénom + moment de la journée (bon matin / bon après-midi / bonsoir) + chiffres réels du jour (événements, tâches, heures planifiées, prochaine étape, série). Narration par la voix de l'app (texte du brief déjà calculé, aucun surcoût de quota premium), sous-titres permanents, passable instantanément (bouton « Passer » + Échap, jamais bloquante), réglages « Film de lancement » (À chaque ouverture / Une fois par jour (défaut) / Jamais + bascule voix du film). Zéro nouvelle dépendance (CSS + SVG + requestAnimationFrame), prefers-reduced-motion → version sobre statique avec sous-titres, tokens et marque « brief vu à la 1re ouverture du jour » inchangés, interface 100 % FR, tests intacts, mobile 360 px impeccable. Journal `docs/journal/realisateur.md`, PR base main.
- PR : — · Dernière nouvelle : inscrite par Vibe Work le 20/11 (mission née de la clarification de l'utilisateur : le film s'adresse à chaque utilisateur final, pas au créateur).

### M-04 — Rappels & notifications (pressenti, après M-06)
- **État : EN ATTENTE** — mission prioritaire n°1 de l'étude marché (chaînon manquant de l'app, notifications = rétention ×2) ; à lancer après Paillette et Réalisateur, sauf alerte grave dans le rapport Sentinelle qui passerait avant.
- PR : — · Dernière nouvelle : —.

### M-07 — Export / import ICS
- **État : EN ATTENTE** (inscrite le 20/11 — à lancer après M-04 ; le prompt sera fourni par l'utilisateur le moment venu).
- PR : — · Dernière nouvelle : —.

## Missions terminées (mémoire)

- **M-02 — Bâtisseur · Installateur Windows — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #23, squash commit `2943109`, 8 fichiers texte, configuration uniquement, aucun binaire dans le dépôt). Installateur `Centeryou-Setup-1.0.0.exe` (78 Mio) : assistant NSIS x64 100 % FR, installation sans admin, menu Démarrer obligatoire + bureau en option, « Lancer Centeryou » à la fin, désinstallation propre qui **conserve les données utilisateur**. Testé sur machine Windows réelle par Bâtisseur (install, connexion prod, voix avec repli, mode sombre, réglages persistés, désinstall). Vibe Work a vérifié la Release et le lien de téléchargement (200) : https://github.com/User313MSI/Centeryou/releases/tag/bureau-v1.0. Journal : `journal/batisseur.md`. Lien de mise à jour de l'app corrigé vers le dépôt Centeryou.
- **M-01 — Apollon · Expérience parfaite — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #22, squash commit `89e4120`, 43 fichiers, ~30 corrections : bugs Windows/render, chevauchements en colonnes, textes FR 100 %, accessibilité clavier + contrastes, pages légales alignées sur la réalité Premium). Revue Vibe Work : conforme aux règles (tokens inchangés, aucun test supprimé — 176/176, pas de sidebar, aucune variable d'env renommée, CI verte + build ✅). Déploiement Vercel automatique vérifié. Journal : `journal/apollon.md`. Sujet à garder sous le coude pour plus tard (noté par Apollon) : montée de version majeure next/vitest pour les vulnérabilités connues.
- Campagne v4 (17 PR fusionnées 13-15/11) : voix sécurisée, comptes, paiement, mobile, bureau-web, conformité, lancement — voir `journal/omega.md`.
- Polish 15-20/11 : fluidité (Lynx, −31 % de poids), sécurité (Sécure, CSP nonce + rate-limit), stats (Sigma, page /stats — fusionnée par Vibe Work le 20/11).
