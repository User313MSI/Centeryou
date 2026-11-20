# Sigma — Stats & insights « Ton temps, en clair » — 2026-11-20

Agent : **Sigma**. Branche : `vibe/sigma-stats-c65e52` (base `main`). Mission : page **/stats**
(temps par semaine, habitudes, insight écrit en français, graphiques SVG inline sans librairie)
+ une carte d'entrée sobre dans la page Aujourd'hui. Toutes les données sont locales
(store Zustand + localStorage) : aucun envoi en ligne, aucun gating premium, pas de 5e onglet,
tokens inchangés, interface 100 % française.

## Journal des étapes

- 2026-11-20 — branche créée depuis `main` (2f6f62e), PR brouillon ouverte (lien ci-dessous). Baseline : build ✅, 139/139 tests.
- 2026-11-20 00:14 UTC — **Étape 1 : calculs purs** ✅. `src/lib/stats.ts` : `eventMinutes` (fin « 00:00 » = 24h00), `statsWeeks` (4 dernières semaines, répétitions développées via `eventOccursOn`), `deltaPercent`, `weekdayMinutes`/`busiestWeekday` (28 jours), `categoryDistribution`, `completionRate(7/30)`, `organizedStreak` (série vivante depuis hier si aujourd'hui est vide), `formatHoursFr`/`formatDeltaFr`, `buildInsight` (2-3 phrases FR, ton neutre) et `computeStats`. `tests/stats.test.ts` : **11 tests** (durées, semaines/répétitions, ± %, habitudes, taux 7/30, streak 6 cas, insight, intégration) — `npx vitest run tests/stats.test.ts` ✅ 11/11. Push de l'étape.
