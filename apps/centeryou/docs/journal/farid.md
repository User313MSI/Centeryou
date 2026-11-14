# Farid — 14 novembre 2026 — Mission : mobile

Mission : rendre Centeryou impeccable sur mobile (360 et 390 px), avec navigation basse,
gestes tactiles et PWA installable hors-ligne — sans toucher au parseur, au stockage
(`store.ts` / persistance), à la voix, aux comptes, ni au design ordinateur validé.

## Audit 360 / 390 px

- `html, body { overflow-x: clip }` : plus aucun débordement horizontal de page.
- Tailles de texte : plus rien sous 12 px sur mobile (`text-[10px]` → `text-xs` en dessous de `md:`,
  desktop inchangé) — `week-view.tsx`, `welcome-sequence.tsx`.
- Zones de toucher ≥ 44 px : onglets bas `min-h-14`, boutons existants `min-h-11`, pastilles jour du
  mois `h-11 w-11` sur mobile (`md:h-7 md:w-7`, desktop inchangé) — `month-view.tsx`.
- Vues denses (semaine `min-w-[720px]`, mois `min-w-[560px]`) : défilement horizontal interne
  (`overflow-x-auto`), la page elle-même ne dépasse jamais.

## Barre d'onglets en bas (mobile)

- `bottom-nav.tsx` (nouveau) : barre fixe en bas, `md:hidden`, Aujourd'hui / Planning / Tâches / Voix,
  `pb-[env(safe-area-inset-bottom)]` pour la barre système / zone d'accueil.
- `top-nav.tsx` : la rangée mobile du header est supprimée ; la navigation haute complète reste
  réservée à l'ordinateur (`md:`), inchangée. Réglages toujours accessibles (icône haut droite).
- FAB voix, toasts et contenu principal remontés au-dessus de la barre (`calc(... + env(safe-area-inset-bottom))`).

## Gestes naturels (`src/lib/use-swipe.ts`, aucun paquet ajouté)

- Glisser horizontalement sur le planning = jour / semaine / mois précédent(e) ou suivant(e)
  (`planning/page.tsx`, seuil 64 px, défilement vertical prioritaire, clic post-swipe ignoré).
- Glisser une tâche vers la droite = terminée (`task-item.tsx`, retour visuel par translation).
- Appui long (500 ms + vibration courte) sur une tâche = menu d'actions
  (`task-actions-menu.tsx` : marquer faite / reprendre, supprimer avec annulation).

## PWA installable

- Manifest : `id`, icône `maskable` dédiée plein cadre (`icon-maskable-512.png`), générée par
  `scripts/make-icons.mjs` depuis `design/tokens.ts` (`npm run icons`) ; icônes existantes inchangées.
- Splash / écran d'accueil : `apple-touch-icon` 180 px, `apple-mobile-web-app-capable`,
  `statusBarStyle: black-translucent`, `mobile-web-app-capable` (Android), `theme_color` violet.
- Hors-ligne réel : `public/sw.js` (vanilla) précache la coquille, cache `/_next/static/*`
  (cache-first) et les pages (network-first + repli cache) ; enregistré en production via
  `pwa-register.tsx`. L'app étant local-first, elle fonctionne intégralement hors-ligne.
- Invite d'installation discrète (`install-prompt.tsx`) : bouton « Installer » via
  `beforeinstallprompt` (Android/Chrome), astuce Partager → « Sur l'écran d'accueil » (iOS/Safari),
  refermable, masquée si déjà installée.

## Zones sûres & clavier

- `viewportFit: 'cover'` + `pt-[env(safe-area-inset-top)]` sur le header, `pb-[env(safe-area-inset-bottom)]`
  sur la barre d'onglets, marges latérales `env(safe-area-inset-left/right)` : encoche et barre système respectées.
- `interactiveWidget: 'resizes-content'` : à l'ouverture du clavier mobile, la fenêtre se redimensionne
  et le champ focalisé est ramené au centre (`dialog.tsx`, tactile uniquement) — aucun champ jamais masqué.

## Interdits respectés

`parser.ts`, `store.ts` (persistance), `voice.ts`, `voice-commands.ts`, `voice-panel.tsx` : non modifiés.
Design ordinateur : toutes les corrections mobiles sont scopées sous `md:` / `max-md:` — le rendu `md+` est identique.

## Vérification

- `npm run build` : OK (8 pages statiques, aucune erreur).
- `npm run test:parser` : tous les tests passent.
- `npm run lint` : aucune erreur.
