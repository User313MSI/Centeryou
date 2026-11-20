# Apollon — 2026-11-20 — Mission M-01 : expérience parfaite (audit + corrections)

Agent : **Apollon** (expérience parfaite). Branche : `vibe/apollon-son-dossier` (base : `main`).
PR : **https://github.com/User313MSI/Centeryou/pull/22** (brouillon ouvert à 03:18 UTC, base `main`).

Mission confiée par l'Adjudant : rejouer 4 parcours réels sur https://dev-apps-centeryou.vercel.app
(A : découverte Camille 28 ans — vitrine → « Essayer » → compte → 1er événement en < 2 min ;
B : utilisatrice fidèle — 12 événements sur une journée dense, vues journée/mois ;
C : mobile 360 px iPhone SE ; D : voix — cas limites : voix désactivée, pas de clé ElevenLabs,
quota épuisé, passage navigateur ↔ Premium), puis corriger dans l'ordre :
1. bugs réels, 2. textes FR, 3. états vides, 4. cohérence visuelle, 5. accessibilité, 6. performance.

Contraintes : interface 100 % FR, tests jamais supprimés/affaiblis, tokens inchangés
(#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E), pas de renommage de variables
d'env, pas de sidebar, voix et mode sombre jamais gated Premium, rien de cassé (comptes,
paiement, mobile, stats, hors-ligne), pas de nouvelle fonctionnalité.

## Journal des étapes

- 2026-11-20 03:15 UTC — Lecture de AGENTS.md, MISSIONS.md et des 14 journaux (héritage campagne v4 + polish Lynx/Sécure/Sigma : voix sécurisée, comptes, paiement, mobile, stats /stats, 176 tests). Branche créée depuis `origin/main`, PR brouillon #22 ouverte.
- 2026-11-20 03:17 UTC — Environnement : `npm ci` échoue sous Windows (npm 11.19.1 exige toutes les variantes optionnelles `@next/swc-*` dans le lockfile, généré sous Linux). Correctif : `npm install` → ajout pur de 118 lignes (7 entrées swc multi-plateformes, aucune version modifiée), commité et poussé. esbuild 0.21.5 et next 14.2.35 OK.
- 2026-11-20 03:2x UTC — Exploration du code (routes, composants) puis audit des 4 parcours en navigation réelle. *(à compléter)*
- 2026-11-20 04:30 UTC — Socle de validation réparé pour Windows (sans toucher au comportement) : lockfile (entrées swc manquantes), `scripts/test-parser.mjs` (`spawnSync('npx')` → ENOENT sous Windows ; maintenant `process.execPath node_modules/typescript/bin/tsc`, mêmes assertions), `opengraph-image.tsx` passé en `runtime = 'edge'` (le runtime node de next/og plante au prerender sous Windows : `fileURLToPath(join(import.meta.url,…))` produit une URL invalide avec les antislashs Windows ; la version edge embarque police+wasm, c'est aussi le runtime recommandé par Vercel). Baseline après correctifs : build ✅ (24 routes), `npm test` ✅ 176/176, `test:parser` ✅, `tsc --noEmit` ✅, `next start` local : 22/22 routes en 200, `/opengraph-image` renvoie bien un PNG (21 873 o). Commité et poussé.
- 2026-11-20 04:3x UTC — Audit lecture du code + parcours rejoués (voir ci-dessous). Premiers constats : « Mobile-first »/« local-first »/« to-do »/« email »/« dentist »/« Stats » (anglicismes UI + métadonnées) ; « © 2025 NovaLoom Studio » en dur dans la vitrine (contre `LEGAL.copyrightYear = 2026` utilisé par le pied de page) ; liens vers l'ancien dépôt Dev-Apps et auteur « NovaLoom Studio » dans les métadonnées ; doublon export JSON (deux cartes « Export des données » / « Sauvegarder mes données ») ; libellé « Focus » ; boutons « Stop » et « ▶ Écouter… » ; « dentist » dans les exemples d'UI ; bascule « Écouter le résumé » sans aucun retour quand la voix est désactivée ; libellés aria en ISO brut (« le 2026-11-20 ») ; bascule Toggle dont le curseur dépasse du bouton (44 px vs 46 px) ; compteur « 0 active sur 0 » ; « essai(s) gratuit(s) restant(s) » ; « Mode sombre » listé comme fonctionnalité Premium alors qu'il est gratuit ; page /offres « aucune offre payante aujourd'hui » contradictoire avec la carte Abonnement ; événement hors grille (avant dayStart / après 22h) rendu hors de la grille ; fin « 00:00 » affichée « 00h00 » ; blocs d'événements qui se recouvrent intégralement en jour/semaine ; zones cliquables de la grille sans role clavier ; démo en lecture seule mais avec des libellés « Créer un événement » cliquables à vide. *(liste consolidée ci-dessous)*

## Corrections (avant → après)

*(à compléter au fil des corrections)*

## Sujets repérés mais laissés de côté

*(à compléter)*

## Validation finale

*(à compléter : npx tsc --noEmit, npm test, npm run test:parser, npm run build, rejeu des 4 parcours sur build local)*
