# Journal — Dario

## Dario — 2026-11-14 — Mission : design & onboarding

Contexte : première expérience client de Centeryou (Next.js App Router + TS + Tailwind + Zustand, local-first).
Objectif : un nouvel arrivant comprend le produit en moins de 60 s, sans aide.

### Parcours d'accueil (nouveaux arrivants)
- Nouvelle page `/bienvenue` : mini-assistant en 3 étapes — « Comment tu t'appelles ? » (prénom),
  « Ton premier événement ? » (saisie naturelle, ex. « sport demain 14h », même parseur que l'ajout rapide,
  non modifié), « C'est parti ! » → retour sur Aujourd'hui où la séquence d'accueil animée (résumé existant)
  s'affiche (`welcomeShownDate` réinitialisée à la fin du parcours).
- Détection « nouvel arrivant » : `settings.onboarded` (persisté). Migration v1→v2 du store : les utilisateurs
  existants sont considérés comme déjà onboardés (aucune régression), seuls les nouveaux voient le parcours.
  Redirection gérée dans `AppShell` ; navigation haute conservée partout, y compris sur `/bienvenue`.

### Écrans vides
- `EmptyState` repensé : icône lucide dans une tuile douce (les ondes concentriques restent réservées à la voix),
  action claire + exemple concret en pastille (« sport demain 14h », « rapport vendredi »).
  Appliqué à Planning vide, Tâches (toutes/actives/terminées) et Tâches du jour sur Aujourd'hui.

### Soin du détail
- Titres de page harmonisés (`text-2xl md:text-4xl`), `CardHeader`/`CardBody` resserrés (pt-5/pb-5),
  rayons issus uniquement des tokens (`rounded-card/pill/tile`), puces de suggestion en `Button secondary sm`,
  croix des toasts en icône lucide `X`, emoji/glyphes remplacés par des icônes lucide (`Hand`, `Sparkles`, `Moon`…).
- Micro-interactions conservées à 200–300 ms (`duration-fast/normal`, keyframes existantes).

### Mode sombre
- Tokens dérivés dans `design/tokens.ts` : `darkColors` (fond `#14141F`, encre `#F0F0F5`, surface `#1E1F2E`,
  secondaire `#A5A8C6`, bord `#2D2F47`, voile `#07070D`, `primaryDark` éclairci `#A794FF` pour le contraste,
  `onbright` pour le texte sur aplats vifs). Couleurs de marque `#7C5CFF/#2DD4BF/#FFB020/#FF6B6B` inchangées.
- Toutes les couleurs Tailwind passent par des variables CSS (`rgb(var(--c-…) / <alpha-value>)`) injectées
  depuis `tokens.ts` (`:root` + `.dark`, `color-scheme: dark`), avec script anti-flash dans `layout.tsx`.
- Bascule « Mode sombre » dans Réglages (carte Apparence), mémorisée via `settings.theme`.

### Hors périmètre (respecté)
- Pas de barre latérale, pas de nouvelle fonctionnalité métier ; parseur, stockage (hors champs de
  réglages `theme`/`onboarded`) et voix non modifiés.

### Vérification
- `npm run build` : OK (8 routes statiques, aucune erreur).
- `npm run test:parser` : OK.

## Dario — 2026-11-14 21:59 UTC — Synchronisation avec la branche par défaut (conflit PR #11)

La branche par défaut `vibe/novaloom-suite-fe60b6` a avancé (PR #8 audit Alpha : sanitation du
localStorage dans `src/lib/store.ts` + `.catch()` sur `rehydrate`, PR #6 voix 100 % serveur
`/api/voix`, `AGENTS.md`). Rebase de ma branche sur `71c64b7` ; un seul conflit, dans
`src/lib/store.ts`, résolu en **gardant les deux travaux** :

- **Sanitation d'Alpha conservée** : `isValidEvent` / `isValidTask` / `sanitizeSettings` et le
  `merge` qui filtre les entrées persistées malformées (localStorage édité/corrompu → aucun crash).
- **Mon mode sombre + onboarding conservés** : `version: 2`, `migrate` v1→v2 (`onboarded: true`
  pour les utilisateurs existants), `theme`/`onboarded` dans `defaultSettings`, et
  `sanitizeSettings` étendu pour borner `theme` (`'clair' | 'sombre'`) et `onboarded` (booléen)
  même si le localStorage est modifié à la main.
- Vérifié dans la source zustand 4.5.5 : le résultat de `migrate` passe bien dans `merge`.

Autres fichiers : fusion auto propre (README : section sécurité voix d'Alpha + mes puces
onboarding/thèmes ; `voix/page.tsx` : texte `/api/voix` + mon harmonisation de titres).

**Vérification après rebase** : `npm run build` ✅ (9 routes + `/api/voix`, aucune erreur),
`npm run test:parser` ✅.

**PR** : https://github.com/User313MSI/Dev-Apps/pull/11 (branche
`vibe/centeryou-onboarding-dark-cd5acb` → base `vibe/novaloom-suite-fe60b6`, passée en ready for review).
