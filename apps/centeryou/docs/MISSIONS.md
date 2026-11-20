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

Ordre décidé par Vibe Work le 2026-11-20 après lecture du rapport Sentinelle (M-03 ✅) : **M-06 Réalisateur → M-08 Bouclier → M-04 rappels + notifications → M-07 export/import ICS**.

### M-06 — Réalisateur · Film de lancement cinématique personnalisé (demande utilisateur du 20/11)
- **État : À LANCER MAINTENANT** (M-03 et M-05 sont ✅ fusionnées ; c'est la mission favorite de l'utilisateur).
- Objectif : à chaque ouverture de l'app par un utilisateur, un film cinématique personnalisé se joue : ses données réelles du jour, son prénom, le moment de la journée, une narration par la voix, et un niveau visuel « cinéma » (pas des petits blocs — « vraiment, vraiment beau »). Prototype de référence construit par Vibe Work (canvas « centeryou-le-film-du-projet », prototype HTML avec voix de démonstration) : l'agent doit l'égaler puis le dépasser. Le prompt complet est fourni dans la session de l'Adjudant.
- Détail : sublimer la séquence d'accueil existante (WelcomeSequence + brief du matin « vu ») en un film de lancement in-app : plein écran, fond nuit animé (halos, particules), ouvertures en fondu flouté, compteurs animés, anneau de progression hebdo, scène « magie » (la phrase dictée devient l'événement), signature d'ondes vocales, tout personnalisé au prénom + moment de la journée (bon matin / bon après-midi / bonsoir) + chiffres réels du jour (événements, tâches, heures planifiées, prochaine étape, série). Narration par la voix de l'app (texte du brief déjà calculé, aucun surcoût de quota premium), sous-titres permanents, passable instantanément (bouton « Passer » + Échap, jamais bloquante), réglages « Film de lancement » (À chaque ouverture / Une fois par jour (défaut) / Jamais + bascule voix du film). Zéro nouvelle dépendance (CSS + SVG + requestAnimationFrame), prefers-reduced-motion → version sobre statique avec sous-titres, tokens et marque « brief vu à la 1re ouverture du jour » inchangés, interface 100 % FR, tests intacts, mobile 360 px impeccable. Journal `docs/journal/realisateur.md`, PR base main.
- PR : — · Dernière nouvelle : 2026-11-20 ~09:30 UTC — Vibe Work a fusionné M-05 (PR #25) : feux vert pour Réalisateur.

### M-08 — Bouclier · Correctifs pré-lancement issus de l'audit Sentinelle ( décision Vibe Work 20/11)
- **État : À LANCER juste après M-06, AVANT le 31/12** — le rapport Sentinelle (docs/journal/sentinelle.md, M-03 ✅ fusionnée) liste 4 risques à corriger avant le lancement du 01/01/2027 + 2 gains rapides. Le prompt complet sera fourni par Vibe Work dans la session de l'Adjudant.
- Les 4 risques bloquants (effort faible à moyen) : 1) `/api/sync` sans authentification (lecture/écrasement du snapshot par `customerId` devinable) ; 2) `/api/compte/suppression` sans auth (DELETE par e-mail via clé service si Supabase configuré) ; 3) crash parseur « dans 999999999 jours » (date NaN → RangeError Intl → écran d'erreur) ; 4) hooks conditionnels `event-block.tsx:43-61` (return null avant les hooks → crash React « fewer hooks ») — **vérifier si le refonte Paillette de ce fichier a déjà corrigé le point 4**.
- Les 2 gains rapides (si temps) : `repeat: 'mois'` sur un 31 (saut des mois courts, clamp comme addMonthsISO) ; sanitation item par item des payloads distants Supabase/Stripe (`sync.ts:85-95,213-220`).
- Contraintes : chaque correctif avec son test (le rapport liste les tests manquants : NaN parseur, hooks event-block, auth /api/sync et /api/compte/suppression), aucun comportement produit changé, tokens intacts, interface 100 % FR, zéro nouvelle dépendance, tests intacts + ajoutés. Journal `docs/journal/bouclier.md`, PR base main.
- PR : — · Dernière nouvelle : inscrite par Vibe Work le 20/11.

### M-04 — Rappels & notifications (pressenti, après M-06 et M-08)
- **État : EN ATTENTE** — mission prioritaire n°1 de l'étude marché (chaînon manquant de l'app, notifications = rétention ×2) ; à lancer après Réalisateur et Bouclier.
- PR : — · Dernière nouvelle : —.

### M-07 — Export / import ICS
- **État : EN ATTENTE** (inscrite le 20/11 — à lancer après M-04 ; le prompt sera fourni par l'utilisateur le moment venu).
- PR : — · Dernière nouvelle : —.

## Missions terminées (mémoire)

- **M-05 — Paillette · Animations & célébrations — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #25, squash commit `89936d3`, 18 fichiers, +1496/−69). Création d'événement : apparition élastique + halo + onde violette depuis le point de création ; coche de tâche : 12 micro-confettis contenus dans le bloc (jamais plein écran) + vibration mobile courte ; record /stats : petit feu d'artifice discret (une fois par record) ; transitions de vues en fondu + translate (260 ms) ; sortie douce à la suppression (Annuler du toast annule à temps). Réglage « Animations & célébrations » (activé par défaut) : si désactivé ou prefers-reduced-motion → tout statique instantané (classe `animations-off` + aucun effet JS créé). Zéro nouvelle dépendance (`package.json` inchangé), transform/opacity uniquement, glisser-déposer et cibles tactiles intacts, tokens inchangés, chunk célébrations en import dynamique (HTML initial inchangé, `= 113 kO). Revue Vibe Work : conforme aux règles — 209/209 tests (176 existants intacts + 33 nouveaux), CI verte (tests bloquants + build ✅), interface 100 % FR. Journal : `journal/paillette.md`.
- **M-03 — Sentinelle · Audit technique — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #24, squash commit `b1a9ead`, 1 seul fichier : le rapport `journal/sentinelle.md`, 151 lignes, 0 fichier fonctionnel touché, la PR a été passée de brouillon à prête par Vibe Work avant fusion). Notes du rapport : sécurité 4/5 (clé ElevenLabs jamais côté client prouvée, CSP nonce en prod, webhook Stripe signé anti-rejeu), robustesse métier 3/5 (fuseaux/DST/bissextile impeccable ; parseur : « dans 999999999 jours » → crash NaN, « dans 2 mois » non supporté, événement de nuit impossible), performance 4/5 (Supabase en lazy, SW hors-ligne réel, toutes les pages en rendu dynamique à surveiller), dette 3/5 (nextSlot défini 3 fois, code mort design tokens), a11y 3/5 (contraste voix sombre 9,1:1 ✅ mais danger 2,66:1 et warning 1,75:1 sous AA), tests/CI 4/5 (176 tests + harnais audit hors CI), cohérence données 3/5 (localStorage résilient, payloads distants non sanités, synchro Stripe mémoire-only sans KV). Verdict : **prêt pour le 01/01/2027 conditionnellement** — 4 risques à corriger avant lancement (→ mission M-08 Bouclier), 15 attaques de pentest recommandées après lancement. Journal : `journal/sentinelle.md`.
- **M-02 — Bâtisseur · Installateur Windows — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #23, squash commit `2943109`, 8 fichiers texte, configuration uniquement, aucun binaire dans le dépôt). Installateur `Centeryou-Setup-1.0.0.exe` (78 Mio) : assistant NSIS x64 100 % FR, installation sans admin, menu Démarrer obligatoire + bureau en option, « Lancer Centeryou » à la fin, désinstallation propre qui **conserve les données utilisateur**. Testé sur machine Windows réelle par Bâtisseur (install, connexion prod, voix avec repli, mode sombre, réglages persistés, désinstall). Vibe Work a vérifié la Release et le lien de téléchargement (200) : https://github.com/User313MSI/Centeryou/releases/tag/bureau-v1.0. Journal : `journal/batisseur.md`. Lien de mise à jour de l'app corrigé vers le dépôt Centeryou.
- **M-01 — Apollon · Expérience parfaite — ✅ fusionnée par Vibe Work le 2026-11-20** (PR #22, squash commit `89e4120`, 43 fichiers, ~30 corrections : bugs Windows/render, chevauchements en colonnes, textes FR 100 %, accessibilité clavier + contrastes, pages légales alignées sur la réalité Premium). Revue Vibe Work : conforme aux règles (tokens inchangés, aucun test supprimé — 176/176, pas de sidebar, aucune variable d'env renommée, CI verte + build ✅). Déploiement Vercel automatique vérifié. Journal : `journal/apollon.md`. Sujet à garder sous le coude pour plus tard (noté par Apollon) : montée de version majeure next/vitest pour les vulnérabilités connues.
- Campagne v4 (17 PR fusionnées 13-15/11) : voix sécurisée, comptes, paiement, mobile, bureau-web, conformité, lancement — voir `journal/omega.md`.
- Polish 15-20/11 : fluidité (Lynx, −31 % de poids), sécurité (Sécure, CSP nonce + rate-limit), stats (Sigma, page /stats — fusionnée par Vibe Work le 20/11).
