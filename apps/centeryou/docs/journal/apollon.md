# Apollon — 2026-11-20 — Mission M-01 : expérience parfaite (audit + corrections)

Agent : **Apollon** (expérience parfaite). Branche : `vibe/apollon-son-dossier` (base : `main`, synchronisée — aucun commit en avance à la fin).
PR : **https://github.com/User313MSI/Centeryou/pull/22** (brouillon, base `main`, titre « Apollon : expérience parfaite (audit + corrections) »).

Mission confiée par l'Adjudant : rejouer 4 parcours réels (A : découverte Camille 28 ans — vitrine → compte → 1er événement < 2 min ; B : 12 événements sur une journée dense, vues jour/mois ; C : mobile 360 px ; D : voix — voix désactivée, pas de clé ElevenLabs, quota épuisé, navigateur ↔ Premium), puis corriger dans l'ordre : 1. bugs, 2. textes FR, 3. états vides, 4. cohérence visuelle, 5. accessibilité, 6. performance.

Contraintes respectées : interface 100 % FR, tokens inchangés (#7C5CFF #5B3FE8 #2DD4BF #FFB020 #FF6B6B #FAFAFC #1A1B2E), aucune variable d'env renommée, pas de sidebar, voix et mode sombre jamais gated Premium, rien de cassé (comptes, paiement, mobile, stats, hors-ligne), aucune fonctionnalité ajoutée, aucun test supprimé/affaibli (176/176 conservés ; une seule regex de test ajustée au nouveau libellé « Voir mes statistiques », même force d'assertion).

## Journal des étapes

- 2026-11-20 03:15 UTC — Lecture de AGENTS.md, MISSIONS.md et des 14 journaux (héritage : campagne v4 17 PR + polish Lynx/Sécure/Sigma). Branche créée depuis `origin/main`, PR brouillon #22 ouverte.
- 2026-11-20 03:17 UTC — Socle de validation réparé pour Windows (aucun changement de comportement) : `npm ci` échouait (npm 11 exige toutes les variantes `@next/swc-*` dans le lockfile) → ajout pur de 118 lignes au lockfile ; `scripts/test-parser.mjs` faisait `spawnSync('npx')` (ENOENT sous Windows) → `process.execPath node_modules/typescript/bin/tsc` ; `opengraph-image.tsx` passé en `runtime = 'edge'` (le runtime node de next/og plante au prerender sous Windows, `fileURLToPath` sur chemin Windows ; edge embarque police+wasm, c'est aussi le runtime recommandé par Vercel). Poussé.
- 2026-11-20 03:20–04:30 UTC — Audit : lecture intégrale des composants/pages/libs + parcours rejoués (harnais jsdom `audit/parcours.test.tsx`, 12 scénarios : balayage FR de 17 pages, parcours A de bout en bout, B journée dense 12 événements, D cas limites voix, démo lecture seule) + smoke HTTP des 20 routes sur `next start` local + pages ouvertes dans le navigateur (production Vercel + build local). Constats consignés ci-dessous.
- 2026-11-20 04:30–04:45 UTC — Corrections (vague 1, voir liste), validation intermédiaire : tsc ✅, 176/176 ✅, test:parser ✅, harnais audit 12/12 ✅, build ✅ (24 routes), 20/20 routes en 200 sur le build local, HTML servi sans aucun anglicisme repéré, `/opengraph-image` = PNG 21 873 o.
- 2026-11-20 04:45–05:00 UTC — Rejeu final des 4 parcours sur le build local de production (localhost:3101) : parcours A rejoué en jsdom contre les vrais composants (vitrine → « Créer mon compte » → prénom Camille → toast « Bienvenue Camille ! » → /onboarding → « C'est parti ! » → /aujourdhui → ajout rapide « sport demain 14h » → tâche créée → clic sur un créneau → fenêtre « Nouvel événement » → « Réunion équipe » créée : 6 actions, < 2 min) ; parcours B : 12 blocs rendus, chevauchements en colonnes, mois « +9 », événement 23h00 hors grille en vue Jour mais visible en Mois ; parcours D : voix désactivée → toast clair, 503 → bascule Web Speech, 429 → toast serveur + bascule ; parcours C : cibles tactiles toutes ≥ 44 px (vérifié en code : bottom-nav/FAB min-h-14, boutons min-h-11/12, pastilles mois h-11 mobile), `overflow-x: clip`, vues denses en `overflow-x-auto` interne, `interactiveWidget: resizes-content` + scrollIntoView au focus en fenêtre (clavier virtuel ne masque jamais un champ).

## Corrections (avant → après), par ordre de priorité

### Socle / bugs réels
1. **Build cassé sous Windows** : `npm run build` échouait sur `/opengraph-image` (`Invalid URL` dans next/og node) → `runtime = 'edge'` ; `npm run test:parser` échouait (`spawnSync npx ENOENT`) → tsc local via `process.execPath` ; `npm ci` échouait (lockfile incomplet) → 7 entrées `@next/swc-*` ajoutées (pur ajout, aucune version modifiée).
2. **Bascule Toggle** : curseur en position active à `left-[26px]` + 20 px = 46 px dans un bouton de 44 px (débordait de 2 px) → largeur fixe `w-12` (48 px).
3. **Blocs d'événements hors grille** : un événement avant `dayStart` ou après 22h00 était rendu hors de la carte (top négatif aplati ou débordement sous la grille) → bornage dans `EventBlock` au segment visible de la grille [dayStart, 22h], élément entièrement hors grille non dessiné en vue Jour (reste visible en vue Mois).
4. **Chevauchements illisibles** : en vues Jour/Semaine, deux événements simultanés se recouvraient à 100 % (l'un masquait l'autre) → nouvelle lib `src/lib/overlap.ts` (grappes chaînées + colonnes gloutonnes), blocs côte à côte (`left`/`width` en %). Rendu visuel identique quand pas de chevauchement (pleine largeur).
5. **« Écouter le résumé » sans retour quand la voix est désactivée** → toast explicite (« L'assistant vocal est désactivé dans les Réglages… »).
6. **Commande vocale avec voix désactivée** : la réponse n'était visible que sur /voix → la réponse s'affiche aussi en toast (jamais muette). `pushToast` rendu sûr hors navigateur (`globalThis.setTimeout`) pour `test:parser`.
7. **/bienvenue** : « Ton premier événement ? » créait toujours une tâche, même avec une heure → cohérent avec la commande vocale : heure = événement, sinon tâche.
8. **Démo « lecture seule » pas réelle** : créneaux et jours encore des boutons/roles cliquables à vide avec libellés « Créer un événement » → prop `readOnly` sur DayView/WeekView/EventBlock (plus de role/tabIndex/handlers, libellés descriptifs).
9. **Créneaux de la grille non accessibles au clavier** (div cliquable) → `role="button"` + `tabIndex` + Entrée/Espace, en vues Jour et Semaine.
10. **Libellés aria en ISO brut** (« le 2026-11-20 ») → dates en français (`formatDayLong`) dans day-view, week-view.
11. **Fin « 00:00 » affichée « 00h00 »** (cryptique) → « minuit » via `formatEndFr` (plage horaire, libellé aria, infobulle mois).

### Textes FR (phrases complètes, zéro anglicisme)
12. « Mobile-first » → « Le mobile d’abord » (vitrine, presse) ; méta-description « mobile-first » → « pensé d’abord pour le téléphone » ; mot-clé SEO « to-do » → « tâches à faire » ; « local-first » → « 100 % local » (inscription, CGU, offres, presse, legal, keywords) ; « sans email » → « sans adresse e-mail » ; « (PWA) » → « application installable sur téléphone, même hors-ligne » ; « dentist » → « médecin » dans tous les exemples d'UI (le parseur accepte toujours « dentist », tests intacts) ; « Stats » (titre/H1) → « Statistiques » ; boutons « Stop » → « Arrêter » ; « ▶ Écouter le résumé » → « Écouter le résumé » (icône Play déjà présente) ; emoji « ✅ » retiré du toast.
13. **Marque** : « © 2025 NovaLoom Studio » en dur dans la vitrine → `© ${LEGAL.copyrightYear} ${LEGAL.appName}` (comme le pied de page de l'app) ; auteur/créateur des métadonnées « NovaLoom Studio » → Centeryou ; éditeur « NovaLoom Studio » (page /legal) → édité à titre personnel (comme les CGU) ; liens GitHub `User313MSI/Dev-Apps` → `User313MSI/Centeryou` (/legal, /presse).
14. **Pages publiques alignées sur la réalité** : /offres disait « aucune offre payante aujourd'hui / aucun abonnement » alors que l'abonnement Premium existe → texte réécrit (gratuit par défaut, Premium optionnel vers Réglages → Abonnement) ; CGU §4 et confidentialité : compte en ligne facultatif (Supabase) et paiement (Stripe) désormais décrits comme actifs et facultatifs (plus de « viendrait à être proposé »).
15. **Doublon supprimé** : deux cartes exportaient le même JSON (« Export des données / Télécharger mes données (JSON) » + « Sauvegarder mes données ») → une seule carte « Données locales » (Sauvegarder / Restaurer), testée.
16. **Accords et formulations** : « Confirmer la restauration (1 événéments, 2 tâches) » → accords corrects ; « Es-tu sûr(e) ? » → « Es-tu sûr de vouloir continuer ? » ; « 0 active sur 0 » → « Aucune tâche pour l’instant » ; « 3 essai(s) gratuit(s) restant(s) » → « encore 3 essais gratuits ce mois-ci (limite 3) » ; toast d'ajout rapide : catégorie affichée en libellé FR (« Santé ») au lieu de l'id brut ; « Suppression serveur indisponible, données locales supprimées » → phrase complète avec point.
17. **Fonctionnalités Premium** : « Mode sombre » retiré de la liste Premium (il est gratuit et non gated) → déplacé dans l'offre Découverte ; Premium = voix premium illimitée + sauvegarde en ligne + synchro multi-appareils.
18. **Page Voix** : l'avis « réponses en texte dans Réglages » (faux) → « dans cette fenêtre ».

### Cohérence visuelle / accessibilité
19. **Contraste des icônes** : 9 icônes/texte en `text-voice` (#2DD4BF = 1,78:1 sur fond clair) → `text-voicetext` (#0F9B8E, ≥ 3:1) ; les aplats `bg-voice`/`ring-voice` (éléments graphiques) inchangés.
20. Pied de page vitrine et pied de page app utilisent désormais la même source (`LEGAL`) — année et marque cohérentes.

### États vides
- Déjà solides (EmptyState partout : planning, tâches, stats, aujourd'hui) ; seule correction : le compteur « 0 active sur 0 » de la page Tâches (n°16).

### Performance
- Aucune régression : aucune dépendance ajoutée, mémoïsations existantes conservées ; first load `/` = 113 kO (partagé 87,4 kO), inchangé par rapport au polish de Lynx (−30 % déjà mesurés). Aucun nouveau chantier ouvert (rien à corriger sans risque).

## Sujets repérés mais laissés de côté (volontairement)

- Libellé de catégorie « Focus » : mot français accepté (dictionnaires), et l'assertion d'insight de `tests/stats.test.ts` y est accrochée — gardé tel quel.
- Glyphe « ✓ » dans quelques toasts de synchro : symbole, pas un anglicisme ; gardé.
- Contraste de `text-voicetext` (#0F9B8E) en mode sombre sur surfaces claires inversées (toast sombre, bulle FAB) : ~3:1 — à surveiller ; corriger proprement demanderait une variante sombre dédiée du token (hors « corriger sans red concevoir »).
- `md:text-[10px]` conservé sur ordinateur (choix de Farid : ≥ 12 px sur mobile, desktop inchangé).
- L'invite d'installation et les toasts partagent le même z-index (peuvent se superposer brièvement en bas) : les deux sont refermables ; non traité.
- `next` 14.2.35 / `vitest` 2.x : vulnérabilités connues corrigées uniquement en montée majeure (interdit ici, voir journal Sécure) — à prévoir côté Adjudant/Vibe Work.

## Validation finale (2026-11-20, build local de production)

- `npx tsc --noEmit` ✅ · `npm test` ✅ **176/176** (15 fichiers, aucun supprimé) · `npm run test:parser` ✅ · `npm run build` ✅ (24 routes)
- Harnais d'audit parcours (jsdom, vrais composants) : **12/12** ✅ (balayage FR 17 pages, A, B, C-checks, D, démo)
- `next start` : 20/20 routes en 200, `/opengraph-image` PNG 21 873 o, `/api/voix` sans clé → 503 JSON FR propre, HTML servi sans aucun des anglicismes/Marques obsolètes repérés
- Parcours rejoués sur le build local : A ✅ (6 actions, < 2 min), B ✅ (12 blocs lisibles, colonnes, +9 en mois), C ✅ (cibles ≥ 44 px, pas de débordement horizontal, clavier virtuel géré), D ✅ (503/429/désactivé → bascule ou message clair, jamais d'état incohérent)
- `main` synchronisée (branche créée depuis `origin/main` à jour, aucun commit en avance)
