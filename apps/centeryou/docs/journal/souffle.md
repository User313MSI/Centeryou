# Journal — Souffle

## Mission M-11 — Performance & dette de code (campagne « Grand V ») — 2026-11-21

- **Agent** : Souffle (session Vibe Code dédiée). Branche : `vibe/souffle-performance` (base `origin/main` = `252b899`, resynchronisée avant la PR).
- **Zone tenue** : `src/app/**` (configs de pages), `src/lib/**` (hors ICS/sync/radar), suppression de code mort. **INTERDIT respecté** : `event-dialog.tsx` (zone Radar), `reglages/page.tsx`, `globals.css`, `apps/centeryou-desktop`, `package.json` — aucun n'a été modifié (`git diff` le prouve). `src/components/layout/app-shell.tsx` touché uniquement parce que strictement nécessaire à l'unification de `nextSlot`. `next.config.mjs` et `src/middleware.ts` (zone Sécure) non touchés.
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (M-11), tout `docs/journal/` (dont `sentinelle.md` — axes perf 4/5 et dette 3/5), `lynx.md`, `cloche.md`.
- **Environnement de mesure** : worktree isolé (le checkout principal contient le travail non commité de Pont/ICS, intact), `node_modules` partagé en symlink (même lockfile), Node 24, Next 14.2.35. Serveur de smoke : `next start` sur port dédié 3987.

---

## 1. RENDU — analyse des 23 routes

### Ce qui est déjà statique / mis en cache (vérifié, mesuré)

| Route | Rendu | Cache | Action |
|---|---|---|---|
| `/robots.txt`, `/sitemap.xml` | `○` prerender statique | `public, max-age=0, must-revalidate` (build) | **+ `export const revalidate = 86400`** ajouté → ISR 24 h (`initialRevalidateSeconds: 86400` confirmé dans `prerender-manifest.json`) : le CDN Vercel pourra les servir 24 h sans repasser par la fonction. Contenu 100 % public, aucune donnée utilisateur. |
| `/opengraph-image` | `ƒ` (edge) | **`cache-control: public, immutable, no-transform, max-age=31536000`** mesuré en HTTP | rien à faire — Next sert l'image comme immutable même en rendu à la demande. Runtime edge conservé volontairement (le runtime node de `next/og` échoue sur les chemins Windows au build, commentaire dans le fichier). |
| 7 routes `/api/*` | `ƒ` `force-dynamic` explicite | `no-store` | correct et conservé : voix (quota/rate-limit), sync (session), checkout/portal/webhook Stripe (signatures, anti-rejeu), suppression de compte. Aucune mise en cache possible sans toucher à la sécurité. |
| 15 pages | `ƒ` dynamique | `private, no-cache, no-store` | **contrainte documentée ci-dessous** — aucune page ne lit `searchParams`/`cookies()` (grep vide) : le seul bailout dynamique est le `headers()` du layout racine. |

### Contrainte prouvée : la CSP à nonce par requête impose le rendu dynamique des pages

- `src/middleware.ts` génère un nonce aléatoire **par requête** et pose `script-src 'self' 'nonce-…'` (sans `'unsafe-inline'`) dans la CSP de réponse, plus l'en-tête de requête `x-nonce` que Next.js utilise pour signer ses propres scripts inline.
- `src/app/layout.tsx:110` lit ce nonce via `headers()` pour signer le script inline anti-flash → **toute route passant par le layout racine devient dynamique** (c'est le comportement documenté de Next 14).
- **Preuve empirique** (branche, build jetable, revert ensuite) : en retirant le `headers()` du layout, les 15 pages passent bien en `○` prerender — mais le HTML prerender contient **21 balises `<script>` sans aucun attribut `nonce`**, dont les scripts inline de Next (`self.__next_f.push(…)` — payload RSC) et le script anti-flash. Servies avec la CSP à nonce, elles seraient **toutes bloquées** → hydratation cassée. Conclusion : le prerender statique des pages est **incompatible** avec la CSP nonce sans affaiblir la sécurité (interdit par la mission). Le rendu dynamique reste donc une **contrainte de sécurité assumée**, exactement comme anticipé par la mission (« documenter comme contrainte et optimiser le reste »).
- **Optimisation du reste faite** : ISR 24 h sur `robots.txt`/`sitemap.xml` (voir tableau). Suggestion notée pour plus tard (hors zone) : `Cache-Control: immutable` sur les assets publics (`/sw.js` est en `max-age=0` — volontaire pour le SW ; icônes/manifest pourraient être servis en immutable via `next.config.mjs`, zone non touchée ici).

### Mesures TTFB avant/après (smoke local `next start`, port 3987)

Toutes les routes **200** avant comme après (21/21 : 15 pages + 2 métadonnées + opengraph-image + manifest + sw.js, voir tableau ci-dessous). Tailles HTML identiques octet pour octet (le code supprimé était du code serveur/arbre-mort, déjà exclu des chunks client). TTFB local avant/après : ~15–85 ms, dominé par le bruit de la machine partagée (4 agents buildent en parallèle) — **aucune dégradation** ; le premier chargement JS est strictement identique (voir §3).

| Route | avant | après |
|---|---|---|
| `/` | 200, 25 319 B | 200, 25 319 B |
| `/aujourdhui` … `/voix` (15 pages) | 200 | 200, tailles identiques |
| `/robots.txt` / `/sitemap.xml` | 200 | 200 (+ ISR 24 h) |
| `/opengraph-image` | 200, immutable 1 an | 200, immutable 1 an |

## 2. DETTE — unifications et code mort

- **`nextSlot` unifié** : une seule définition partagée, `src/lib/dates.ts` (`nextSlot()`, bornée à `[DAY_START, DAY_END−1h]`, identique aux 3 anciennes versions — la variante `Math.min` de app-shell était redondante avec le `clamp`). Adoptée par `src/app/planning/page.tsx` et `src/components/layout/app-shell.tsx` (leurs définitions locales supprimées, imports nettoyés). **La 3ᵉ copie dans `event-dialog.tsx` est laissée telle quelle : fichier INTERDIT (zone Radar)** — à unifier par Radar en important depuis `lib/dates`.
- **Code mort supprimé** (chacun vérifié à **0 référence** par grep global sur `src/ tests/ scripts/ design/ public/ + configs racine` avant suppression) :
  - `design/tokens.ts` : `colorsDark`, `categoryColorsDark` (palettes mortes ; `darkColors` reste le thème sombre actif), `spacing`, et dans `layout` les champs `sidebarW`, `topbarH`, `shellMaxW`, `dayStartDefault`, `dayEnd` (seuls `hourHeightDay`/`hourHeightWeek` sont lus, par day-view/week-view).
  - `src/lib/categories.ts` : `priorityColor` (jamais appelé).
  - `src/lib/dates.ts` : `formatWeekdayLong` (jamais appelé).
  - `src/lib/rappels-service.ts` : `demanderPermissionRappels` (export « pour les tests » jamais référencé) + son import `requestRappelPermission` devenu inutilisé.
- **TODO/FIXME/HACK** : 0 occurrence dans tout `src/ design/ scripts/ tests/` (vérifié) — rien à nettoyer.
- **Duplications non corrigeables ici (fichiers interdits)** : `selectClass` en double (`event-dialog.tsx` + `reglages/page.tsx`), nom `BackupPayload` porté par `backup.ts` et `sync.ts` — documenté, à traiter par les propriétaires de zone. Champ `darkMode` (`types.ts`) : conservé délibérément — champ du schéma persisté localStorage (lu par `sanitize.ts`, écrit par `defaults.ts`), sa suppression toucherait au schéma de migration : hors « code mort » au sens strict.
- Aucun commentaire/nom clarifié au-delà de l'évident (commentaire explicatif ajouté sur `nextSlot` et sur le `layout` des tokens).

## 3. POIDS — les 3 plus gros chunks

Build de production, `.next/static` (brut, avant = après à 546 B près) :

| Rang | Chunk | Taille brute | Contenu | Réductible ? |
|---|---|---|---|---|
| 1 | `chunks/879-*.js` | 191 394 B | client Supabase | **déjà en lazy** — prouvé absent du HTML initial de `/` (0 occurrence) ; irréductible sans toucher aux dépendances (interdit) |
| 2 | `chunks/fd9d1056-*.js` | 172 834 B | vendor react-dom | non (framework) |
| 3 | `chunks/framework-*.js` | 139 978 B | react | non (framework) |

Les 3 plus gros chunks sont donc soit déjà hors chargement initial (Supabase, travail de Lynx confirmé), soit le framework React lui-même — **aucune réduction évidente sans changer un comportement ou ajouter/retirer une dépendance** : rien n'a été fait dessus, par règle. Le chunk app le plus gros au chargement initial est `app/layout` (42 858 → **42 682 B**, −176 B grâce au `nextSlot` partagé) ; `972` (26 kB) est le runtime routeur de Next, pas du code app.

**Premier chargement JAMAIS dégradé** — First Load JS strictement identique avant/après : partagé **87,5 kO**, `/` **114 kO**, `/aujourdhui` **122 kO**, `/reglages` **121 kO** ; JS total `.next/static` 1 314 352 → **1 313 806 B** (−546 B) ; CSS inchangé (43 703 B). Liste des scripts initiaux de `/` identique avant/après, tous signés par le nonce CSP (0 script sans nonce), chunk Supabase toujours absent du HTML initial.

## 4. Validation

- `npx tsc --noEmit` ✅ · `npm run test:parser` ✅ (toutes assertions)
- `npm test` : baseline `origin/main` à l'ouverture de ma branche (2026-11-21 04:19 UTC) = **326/327**, le 1 échec étant **préexistant et calendaire** (`tests/rappels.test.ts` « occurrence d'un autre jour » figé au 20/11 : `2026-11-21` y est codé en dur comme « un autre jour », or nous sommes le 21/11 — le préfixe « À 10h00 » est alors le comportement correct ; aucun de mes fichiers ne touche ce test). **Après resynchronisation sur le main le plus récent (1a9cb81, qui a fusionné d'autres PR) : 383/383 tests ✅ verts**, 0 test supprimé/affaibli.
- `npm run build` ✅ (23 routes, exit 0) — table des routes identique à la baseline (`○` robots/sitemap, `ƒ` le reste), `initialRevalidateSeconds: 86400` sur robots/sitemap.
- Smoke HTTP sur `next start` (port 3987), rejoué après rebase sur main à jour : **22/22 routes en 200** (`/`, 15 pages, `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/manifest.webmanifest`, `/sw.js`) ; table des routes identique à la baseline (`○` robots/sitemap, `ƒ` le reste), First Load JS `/` = 114 kO, partagé 87,5 kO ; en-têtes de sécurité conservés (CSP nonce par requête vérifiée en réponse, 0 script sans nonce dans le HTML, `X-Frame-Options: DENY`, `nosniff`, etc.).
- Fichiers interdits non modifiés : `git diff --name-only` = `design/tokens.ts`, `src/app/planning/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/components/layout/app-shell.tsx`, `src/lib/categories.ts`, `src/lib/dates.ts`, `src/lib/rappels-service.ts` + ce journal. Aucun `package.json`, aucune dépendance, interface 100 % FR inchangée, tokens inchangés.

## 5. Livrables & suivi

- Branche `vibe/souffle-performance` poussée, **PR brouillon ouverte base `main`** (lien ci-dessous). `MISSIONS.md` publié sur `main` à l'ouverture de la branche (commit `9e25108`, fichier unique) et sera re-publié avec le lien de PR.
- Reste pour les autres zones : `nextSlot` dans `event-dialog.tsx` (Radar) à faire importer depuis `src/lib/dates.ts` ; `selectClass`/`BackupPayload` en double (reglages/event-dialog/sync — zones interdites ici) ; cache immutable des assets publics via `next.config.mjs` (hors zone) ; montée Next 16.4.6 déjà notée par Sentinelle/Bouclier pour après le lancement.

*Journal tenu par Souffle, 2026-11-21 ~05:00 UTC (mesures finales rejouées après rebase sur main 1a9cb81 : 383/383 tests, build ✅, smoke 22/22 en 200).*
