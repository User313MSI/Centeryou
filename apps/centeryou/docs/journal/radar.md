# Journal — Radar

## Mission M-12 — Créneaux suggérés (campagne parallèle « Grand V », session dédiée)

Agent : **Radar**. Branche : `vibe/radar-creneaux` (base `main`). Zone étanche : `src/components/events/event-dialog.tsx`, nouveau `src/lib/radar.ts`, nouveaux tests `tests/radar*.test.ts`. Lecture seule de `src/lib/store.ts` ; `globals.css`, `reglages/page.tsx`, `sw.js`, ICS/sync et `sync.ts` interdits — non touchés.

- **21/11 03:19 UTC** — MISSIONS.md publié sur `main` à l'ouverture de la branche (commit `8a8a9ce`, poussé après pull/rebase — un autre agent avait publié entre-temps).
- **21/11 03:20–04:30 UTC** — Lecture d'AGENTS.md, MISSIONS.md, `docs/journal/` (rien de préexistant sur les suggestions de créneaux ; `nextSlot` dupliqué signalé par Sentinelle = dette, non touché, hors zone). Travail en worktree isolé (`Centeryou-wt-radar`) pour ne pas toucher au checkout partagé (branche Pont d'un autre agent, modifications non commitées).
- **21/11 ~04:30 UTC** — **Moteur `src/lib/radar.ts`** (100 % local, zéro réseau, zéro IA, aucune donnée ajoutée au schéma) :
  - fenêtre utile [DAY_START=8h, DAY_END=22h] ; `busyIntervals` découpe les événements du jour (récurrence résolue via `eventsOnDate`) dans la fenêtre, les fusionne ; **événements de nuit ignorés proprement** (hors fenêtre → aucun blocage ; `00:00–00:00` = 24 h remplit bien la journée) ;
  - `dayGaps` = trous **exacts** entre les intervalles occupés ;
  - `preferredStartMinutes` = moyenne des débuts d'événements (nuit exclue), filtrée par catégorie si elle a des habitudes, sinon globale ; défaut 14h00 sans données ;
  - score = 100 − écart à l'heure habituelle (5 pts/½h, plafond 40) + bonus ajustement serré (+8/+4) − pénalités extrêmes (avant 9h, fin après 20h) ;
  - candidats au pas de 30 min dans chaque trou ≥ durée (défaut 60 min, clamp 15 min–8 h) ; tri score puis heure ; **max 3** ;
  - jamais de chevauchement par construction (les candidats viennent des trous) ; `ignoreId` pour l'événement en cours d'édition ; `now` pour ne jamais proposer un créneau passé aujourd'hui (prochain pas de 30 min) ;
  - **journée pleine → jour de repli** dans un horizon de 7 jours : score = minutes libres − 90 min/jour de distance (proche ET dégagé), ex-aequo au jour le plus proche.
- **21/11 ~04:35 UTC** — **Intégration `event-dialog.tsx`** : bouton discret « Suggérer un créneau » (ghost, `CalendarClock`) sous la grille Début/Fin + jusqu'à 3 **pastilles cliquables** « aujourd'hui/demain/jeu. 5 déc. 14h00 – 15h00 — libre » (`slotLabel`) ; **déclenchement automatique et doux quand un chevauchement est détecté** (`conflict` non null) et recalcul tant que les pastilles sont visibles ; un clic **remplit le formulaire uniquement** (date/début/fin), jamais de création automatique — l'utilisateur reste maître ; reset à l'ouverture du dialogue. Classes existantes uniquement (`rounded-pill`, `border-line`, `bg-surface`, `text-muted`, `bg-primary/5`, `min-h-11`…), `globals.css` intact, 100 % FR, tokens intacts, zéro dépendance (`package.json` inchangé), sombre natif (tokens), mobile 360 px (`flex-wrap`, cibles tactiles 44 px).
- **21/11 ~04:40 UTC** — **Tests** : `tests/radar.test.ts` (23) — trous détectés exactement (y compris mitoyens fusionnés, fin à minuit), zéro chevauchement (vérifié avec `overlaps()` sur chaque suggestion, récurrence « chaque jour » comprise), journée vide (3 créneaux d'1 h centrés sur 14h00), journée pleine (repli D+2 vs D+1 selon le plus dégagé, horizon saturé → `[]`), événements de nuit ignorés (et 24 h → repli), durée sur mesure 90 min, habitudes par catégorie (travail 9h → 9h00 ; perso 18h → 18h00), extrêmes évités, `now` (rien dans le passé), `ignoreId`, libellés FR (« aujourd'hui/demain 14h00 – 15h00 — libre ») ; `tests/radar-ui.test.tsx` (4) — bouton présent, pastilles au clic, **clic = remplissage du formulaire sans création auto** (création uniquement au submit, valeurs = pastille), **déclenchement auto sur chevauchement**, journée pleine → pastilles « 2 déc. » et date remplie. Total nouveaux : **27**.
- **21/11 ~04:45 UTC** — **Validation** : `npx tsc --noEmit` ✅ · `npm test` ✅ **354/354** (327 existants intacts + 27 nouveaux ; note : un test `rappels.test.ts` dépendant de la vraie date échouait le 21/11 — correctif Vibe Work déjà sur `main` (`d3c67e9`), branche rebasée dessus, tout vert) · `npm run test:parser` ✅ · `npm run build` ✅ (23 pages, « ✓ Compiled successfully ») · smoke `next start` : `/`, `/aujourdhui`, `/planning`, `/taches`, `/stats`, `/reglages`, `/voix`, `/bienvenue` tous en **200**.
- **21/11 ~04:50 UTC** — Commit + push `vibe/radar-creneaux` ; PR ouverte en brouillon (base `main`).

## Décisions importantes

- **Zéro schéma, zéro réseau** : tout se calcule à la volée depuis `events` (lecture seule du store zustand) — aucune migration, aucun stockage nouveau.
- **Jour de repli** : score `minutes libres − 90 × jours de distance` — « le jour proche le plus dégagé » (proximité ET dégagement), ex-aequo au plus proche.
- **Nuit** : un événement hors [8h, 22h] ne bloque rien ; `00:00` en fin = minuit (24 h) géré par `endMinutesOf`.
- **Déclenchement auto** : uniquement quand `findConflict` détecte un chevauchement (et au rafraîchissement des pastilles visibles) — jamais au chargement, jamais sans geste ni conflit.
- **Pas de création automatique** : `applySlot` ne fait que `setDate/setStart/setEnd` ; le submit reste le seul point de création.
- **Test UI déterministe** : date de test fixée dans le futur (`2026-12-01`) pour échapper au clamp « maintenant » du jour réel.

## Liens

- PR : https://github.com/User313MSI/Centeryou/pull/29 (brouillon — **non fusionnée**, Vibe Work décide)
- Branche : `vibe/radar-creneaux` (poussée)
