# Sigma — Stats & insights « Ton temps, en clair » — 2026-11-20

Agent : **Sigma**. Branche : `vibe/sigma-stats-c65e52` (base `main`). Mission : page **/stats**
(temps par semaine, habitudes, insight écrit en français, graphiques SVG inline sans librairie)
+ une carte d'entrée sobre dans la page Aujourd'hui. Toutes les données sont locales
(store Zustand + localStorage) : aucun envoi en ligne, aucun gating premium, pas de 5e onglet,
tokens inchangés, interface 100 % française.

## Journal des étapes

- 2026-11-20 — branche créée depuis `main` (2f6f62e), PR brouillon ouverte (lien ci-dessous). Baseline : build ✅, 139/139 tests.
- 2026-11-20 00:14 UTC — **Étape 1 : calculs purs** ✅. `src/lib/stats.ts` : `eventMinutes` (fin « 00:00 » = 24h00), `statsWeeks` (4 dernières semaines, répétitions développées via `eventOccursOn`), `deltaPercent`, `weekdayMinutes`/`busiestWeekday` (28 jours), `categoryDistribution`, `completionRate(7/30)`, `organizedStreak` (série vivante depuis hier si aujourd'hui est vide), `formatHoursFr`/`formatDeltaFr`, `buildInsight` (2-3 phrases FR, ton neutre) et `computeStats`. `tests/stats.test.ts` : **11 tests** (durées, semaines/répétitions, ± %, habitudes, taux 7/30, streak 6 cas, insight, intégration) — `npx vitest run tests/stats.test.ts` ✅ 11/11. Push de l'étape.
- 2026-11-20 00:19 UTC — **Étape 2 : page /stats + carte d'entrée** ✅.
  - `src/app/stats/page.tsx` (métadonnées FR, canonical `/stats`) + `src/components/stats/stats-view.tsx` (client) : carte « Temps par semaine » (badge ± % vs semaine précédente, teal `#0F9B8E` si hausse), carte « Un mot sur ta semaine » (insight 2-3 phrases), carte « Habitudes » (jours les plus actifs, donut par catégorie + légende, complétion 7/30 jours en `role="progressbar"`, série de jours organisés). État vide : « Ajoute ton premier événement pour voir ta semaine prendre forme » + action vers /aujourd'hui.
  - `src/components/stats/charts.tsx` : **SVG inline uniquement** (`WeekBars` empilées par catégorie, `WeekdayBars` horizontales, `CategoryDonut` en `stroke-dasharray`), couleurs via `currentColor` + classes tokens (`text-cat-*`/`bg-cat-*`, vérifiées dans le CSS buildé), textes SVG ≥ 12, `role="img"` + `aria-label` descriptifs, animations `animate-view-in`/`animate-fade-in` (transform/opacity uniquement, tuées par le bloc `prefers-reduced-motion` global existant).
  - Carte d'entrée sobre dans `aujourdhui-view.tsx` (lien `/stats`, `min-h-11`, « 1 h cette semaine » en teal) — **aucun onglet ajouté** (`nav-items.ts` inchangé, vérifié en diff).
  - `tests/stats-view.test.tsx` : 3 tests de rendu (état vide, page avec données : 3 SVG + badge +100 % + insight + complétions + streak, carte d'entrée Aujourd'hui).
  - Vérifs : `npx tsc --noEmit` ✅ · `npm run build` ✅ (24 pages, `/stats` = 102 Ko first load) · `npm test` ✅ **176/176** (162 existants + 14 nouveaux) · `npm run test:parser` ✅ · smoke loopback `next start` : **19/19 routes en 200** (dont `/stats`). `npm run lint` : pas de config ESLint dans le dépôt (prompt interactif, inchangé depuis main) — CI ne l'exécute pas (voir `.github/workflows/centeryou-ci.yml` : test + test:parser + build).
  - Tokens inchangés (`design/`, `tailwind.config.ts`, `globals.css`, `routes.ts` non touchés — diff vide). Push de l'étape.
