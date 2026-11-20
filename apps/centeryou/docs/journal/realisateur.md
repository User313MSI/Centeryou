# Journal — Réalisateur

## Mission M-06 — Film de lancement cinématique personnalisé (avec voix)

Branche : `vibe/realisateur-film` (base `origin/main`). PR : https://github.com/User313MSI/Centeryou/pull/26 (brouillon, base `main`).

### Références lues avant de coder
- `AGENTS.md`, `docs/MISSIONS.md`, journaux `dario` (onboarding + séquence d'accueil), `celeste` (voix sécurisée `/api/voix` + quota), `alpha` (sanitation store), `lynx` (fluidité, contraste, accessibilité séquence d'accueil), `paillette` (M-05 : `motion.ts`, `use-motion.ts`, `celebrate.ts`, classe `html.animations-off`).
- Code existant : `src/components/today/welcome-sequence.tsx` (séquence plein écran actuelle), `src/components/today/brief-card.tsx` (brief du matin, marqué `briefShownDate`), `src/lib/welcome.ts` (`shouldShowWelcome`), `src/lib/voice.ts` (`speak`/`stopSpeaking` : premium si droit + quota, bascule Web Speech sinon), `src/lib/store.ts` (`markWelcomeShown`, `markBriefShown`), `src/app/reglages/page.tsx`, `globals.css` (keyframes + bloc `prefers-reduced-motion` + `html.animations-off`).

### Baseline mesurée (main, 2026-11-20 ~13:20 UTC)
- `npm test` : **209/209** ✅ (17 fichiers) · `npm run build` ✅ · First Load JS : `/` = **113 kB**, `/aujourdhui` = **123 kB**.

### Étapes
- 2026-11-20 13:22 UTC — branche `vibe/realisateur-film` créée depuis `origin/main`, PR brouillon ouverte, baseline mesurée (voir ci-dessus).
