# Sentinelle — Rapport d'audit technique complet (M-03) — 2026-11-20

## Contrat de l'audit

- **Agent** : Sentinelle (sous-agent de l'Adjudant, session Vibe Code). Branche : `vibe/sentinelle-audit-complet` (base `origin/main`).
- **Périmètre** : `apps/centeryou/` (Next.js 14.2.35, App Router, TypeScript, Tailwind, Zustand, localStorage/PWA) + `apps/centeryou-desktop/` (coquille Electron) + CI `.github/workflows/centeryou-ci.yml`.
- **Mode** : **LECTURE SEULE stricte**. Aucun fichier fonctionnel modifié/corrigé. Ce rapport (`docs/journal/sentinelle.md`) est l'unique fichier ajouté ; la PR ne contient que lui.
- **Méthode** : lecture intégrale du code (`src/` 78 fichiers, `tests/` 15 fichiers, `public/sw.js`, config), lecture des 16 journaux existants et de `docs/AUDIT-2026-11.md` (héritage, non refait), sondes exécutées sur le code compilé (parseur, dates, récurrence), build de production + grep du bundle, `npm audit`, vérifications HTTP sur la prod Vercel.
- **Validation exécutée sur ma branche (preuve que le rapport seul laisse la CI verte)** :
  - `npm ci` ✅ · `npx tsc --noEmit` ✅ (exit 0) · `npm test` ✅ **176/176** (15 fichiers) · `npm run test:parser` ✅ (toutes assertions) · `npm run build` ✅ (23 routes, exit 0)
  - `grep -riE "xi-api-key|sk_live_|sk_test_|whsec_|ELEVENLABS_API_KEY|api\.elevenlabs\.io|api\.stripe\.com|service_role|eyJhbGciOiJI" .next/static` → **0 occurrence** (contrôle positif : `xi-api-key` présent uniquement dans `.next/server/app/api/voix/route.js`)
  - Prod `https://dev-apps-centeryou.vercel.app/` → HTTP 200 en 0,37 s, CSP avec nonce servie, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, **pas de `X-Powered-By`**, `POST /api/voix {"text":""}` → 400 propre.

---

## Les 7 axes, notés de 0 à 5 avec preuves

### 1. SÉCURITÉ — **4/5**

Points forts (avec preuves) :
- **Clé ElevenLabs jamais côté client** : lue uniquement dans `src/app/api/voix/route.ts:10` (`process.env.NEXT_ELEVENLABS_API_KEY` serveur) ; aucun bloc `env:` dans `next.config.mjs` ; grep du bundle propre (voir contrat) ; contrôle positif `.next/server` uniquement. La fuite historique (journaux Alpha/Céleste) est bien corrigée.
- **`/api/voix` bien gardée** (`src/app/api/voix/route.ts`) : rate-limit IP **20 req/h** avant toute validation (lignes 9, 85, avec `Retry-After`), 429/400/403/413/503/502 avec messages FR sans détail interne, quota 300 car/jour/profil (lignes 6, 160+), IP = dernière entrée `x-forwarded-for` (ligne 31, correcte derrière le proxy Vercel), `Cache-Control: no-store`.
- **CSP stricte par nonce** par requête : `src/middleware.ts:28,39,53` (`script-src 'self' 'nonce-…'`, plus `object-src 'none'`, `frame-ancestors 'none'`, `base-uri`, `form-action`) ; servie en prod (vérifié en HTTP ci-dessus). `style-src 'unsafe-inline'` justifié (variables CSS du layout, aucun contenu utilisateur).
- **Webhook Stripe signé** : HMAC-SHA256 + `timingSafeEqual` + tolérance ±300 s anti-rejeu (`src/lib/server/stripe.ts:203,219,224`) ; testé (18 cas dans `tests/api-securite.test.ts`).
- **Restauration de sauvegarde contrôlée** : `parseBackup` (`src/lib/backup.ts:48`) refuse JSON invalide, mauvais `app`, fichier vide ; **sanitize item par item** avant application (`sanitizeEvents/Tasks/Settings`), application seulement après clic « Confirmer » (`src/app/reglages/page.tsx:62-95`) ; aucune `dangerouslySetInnerHTML`/`innerHTML`/`eval` dans tout `src/` (vérifié par grep) → pas de XSS via fichier importé.
- **Erreurs API non verbeuses** : toutes les routes renvoient un message FR générique en 500 et loguent le détail serveur (`console.error('[api/…]')`).
- **En-têtes** : `next.config.mjs` (`nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy: microphone=(self)`), `poweredByHeader: false` ; HSTS présent en prod.
- **Desktop** (`apps/centeryou-desktop/main.js`) : `contextIsolation`, `sandbox`, `nodeIntegration: false`, webview bloquée, navigation restreinte à l'origine de prod, certificats invalides refusés, micro autorisé uniquement pour l'origine de prod (jamais la caméra), aucun binaire tracké (`git ls-files` propre, `.gitignore` couvre `dist/`, `*.exe`).

Réserves (qui coûtent le 5/5) :
- `npm audit` : **8 vulnérabilités (3 critical, 2 high, 3 moderate)**. Côté production (`--omit=dev`) : `next@14.2.35` **critical** (liste longue : RCE Image Optimization AVIF/SVG sur serveur self-hosted GHSA-2xp9/2464, RCE Windows GHSA-p293, SSRF Server Actions/rewrites, cache confusion, DoS) et `postcss` (nested sous next) **high** (XSS `</style>`, fuites sourceMappingURL). Correctif = `next@16.4.6` (montée majeure). Dev-only : `vitest@2.1.9`/`vite`/`esbuild`/`tinypool`/`@vitest/mocker` (correctif vitest 5.x, jamais déployé — le bundle ne les contient pas, grep propre). **Sur Vercel hébergé, la plupart sont mitigées par l'infra, mais toute sortie en self-hosted serait dangereuse.**
- **`POST /api/sync` sans aucune authentification** (`src/app/api/sync/route.ts`) : n'importe qui connaissant/devinant un `customerId` Stripe (`cus_…`) peut **lire le snapshot complet** (événements, tâches, réglages, prénom) ou **l'écraser** (dernier écrivain gagne, `src/lib/sync.ts:199-226`). Seuls garde-fous : `customerId` ≤ 100 car, corps ≤ 1 Mo. Aucun rate-limit.
- **`POST /api/compte/suppression` supprimable sans auth** (`src/app/api/compte/suppression/route.ts:12-30`) : si `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` sont configurés, n'importe quel appel avec un e-mail fait un `DELETE` sur la table `comptes` via la clé service (contourne la RLS), sans vérifier que l'appelant est bien ce compte.
- Quota voix keyed sur l'en-tête `x-centeryou-user` (prénom, contrôlé par le client, `route.ts:158`) → un attaquant peut faire tourner les prénoms pour multiplier le quota ; le rate-limit IP 20/h borne l'abus. Rate-limit/XFF : fiable derrière Vercel, **contournable en self-hosted** (XFF usurpable).
- Rate-limits en mémoire par instance serverless (documenté, acceptable comme anti-abus, pas comme facturation).
- Pas de rate-limit sur `/api/checkout`, `/api/portal`, `/api/subscription/status`, `/api/sync`, `/api/compte/suppression` (hors plafond 1 Mo sur sync).
- `contact@centeryou.fr` est un placeholder (`src/lib/legal.ts`, signalé par Iris) ; `APP_URL` vide en prod → `success_url` dérivée du `Host` de la requête (phishing théorique si appel direct avec Host forgé).

### 2. ROBUSTESSE MÉTIER — **3/5**

Sondes exécutées sur le code compilé (`parseInput`, `eventOccursOn`, `addDaysISO`, `addMonthsISO`, référence vendredi 2026-11-20) :

Parseur FR (`src/lib/parser.ts`) — ce qui marche (prouvé) : « demain à 3h » → 2026-11-21 03:00 ✅ · « DEMAIN À 3H » (majuscules) ✅ · « dans 2 semaines » → 2026-12-04 ✅ · « DANS 2 SEMAINES » ✅ · « dans 3 sem » ✅ · accents (`aujourd'hui` sans apostrophe, `après-demain`) ✅ · « à 20h » ✅ · heures invalides (« 25h », « 23h60 », « 10h70 ») restent dans le titre sans erreur ✅ · « ! » priorité haute ✅ · catégories (santé/travail/perso/focus) retirées du titre ✅ · « ce soir » → 19:00 ✅.

Cas limites problématiques (prouvés par sonde) :
- **« dans 999999999 jours » → `date: "NaN-NaN-NaN"`** (`parser.ts:111-122`, aucun plafond sur `n` ; `addDaysISO` dépasse la date max JS). Conséquence en chaîne : `QuickAdd` construit le toast avec `formatDayShort(p.date)` (`quick-add.tsx:32`) → `Intl.DateTimeFormat.format(Invalid Date)` **lève `RangeError`** (vérifié) → crash jusqu'à l'ErrorBoundary. Un simple mot dicté fait tomber l'écran d'erreur.
- **« dans 2 mois » non supporté** → titre « Dans 2 mois », date = aujourd'hui (unité `mois` absente, `parser.ts:114-121`). Idem « ce week-end », « lundi prochain » (reste dans le titre), « 29 février » (pas de dates absolues), « midi et demi » (12:00 mais « et demi » dans le titre), « 3h du matin » (« du matin » dans le titre).
- **Deux heures dans la saisie** (« sport 14h 15h ») → la dernière gagne silencieusement (15:00).
- **Récurrence `repeat: 'mois'` sur un 31** (`src/lib/events.ts:20-21`, comparaison du quantième) : événement du 2026-01-31 → présent le 2026-03-31, **absent le 2026-02-28 et le 2026-04-30** (mois sans 31e sautés, pas de report en fin de mois). Idem **29 février bissextile** : présent le 2028-02-29, absent le 2025-02-28. Incohérence avec `addMonthsISO` qui, lui, clamp correctement (`dates.ts:45-54`, 2026-01-31 +1 → 2026-02-28). Ambiguïté documentable mais surprenante pour « chaque mois ».
- **Événement à cheval sur minuit** : fin « 00:00 » = 24h00 acceptée (`endMinutesOf`, `dates.ts:74-78`) donc 23h00→00:00 OK ; mais **23h00→02h00 est impossible** (fin < début → erreur de validation, `event-dialog.tsx:107-110`) : pas d'événement de nuit traversant minuit.
- **Fuseaux horaires / DST / bissextile** : tout est en dates ISO locales + heures murales (jamais d'UTC) → **aucun décalage au changement d'heure** (sonde : `addDaysISO('2026-03-28',2)` → 2026-03-30 ✅, `('2026-10-24',2)` → 2026-10-26 ✅), année bissextile ✅ (2028-02-28+1 → 2028-02-29), passage d'année ✅. `weekdayOf` cohérent. Point positif fort.
- **Conflits** : doublon exact bloquant, chevauchement partiel autorisé avec avertissement (`event-dialog.tsx:110-125`, `events.ts:49-61`) — choix assumé.
- **Bug React réel** : `src/components/events/event-block.tsx:43,47` — `return null` **avant** les hooks (`useRef` ligne 49, `useState` 50/54/59, `useEffect` 61). Si un bloc passe de visible à masqué (ex. `dayStart` réglé de 8 à 10, ou événement déplacé hors grille), React lève « Rendered fewer hooks than expected » → ErrorBoundary. Violation des règles des hooks.

### 3. PERFORMANCE — **4/5**

- Build mesuré : First Load JS partagé **87,4 kO** ; pages 88–119 kO (`/` = 113 kO, `/reglages` = 119 kO, `/stats` = 102 kO). `.next/static` total **1,6 Mo / 42 chunks JS** ; plus gros chunk 188 kO = le client Supabase, **chargé uniquement en dynamique** quand un compte est utilisé (travaux de Lynx, confirmé : non référencé dans le HTML initial).
- Vues mémoïsées : `week-view.tsx:44-58` (`calendarOnDate` × 7 en un `useMemo`), `month-view.tsx:31-39` (× 42 cellules en un passage), `aujourdhui-view.tsx:36-46` (tri sur copie). Avec 200+ événements : O(42 × N) `eventOccursOn` par rendu de mois, mémoïsé — fluide en local ; à 5 000 événements, ~210 k constructions de `Date` par changement : à surveiller mais acceptable. Mois tronqué à 3 items + « +N » (`month-view.tsx:80-88`). Pas de liste longue non virtualisée (données 100 % locales).
- Service worker `public/sw.js` : précache coquille (12 entrées), `/_next/static/*` cache-first, navigations network-first + repli cache → hors-ligne réel après 1re visite ; enregistré en prod uniquement (`pwa-register.tsx`).
- **Toutes les pages sont passées en rendu dynamique (ƒ)** à cause du nonce CSP lu via `headers()` (build : 23 routes ƒ) → chaque visite passe par la fonction serverless (plus de prerender statique mis en cache) : TTFB et coût Vercel à surveiller à la mise à l'échelle (prod mesurée : 200 en 0,37 s, OK aujourd'hui).
- Vitrine `/` et `/aujourdhui` : squelette d'hydratation léger (opacité seule), pas de layout shift majeur ; `overflow-x: clip` global, vues denses en scroll interne.
- Desktop : coquille qui charge l'URL de prod (`cache-control: no-cache`), repli `offline.html` + SW de la PWA, état de fenêtre persisté, recherche de mise à jour par `x-vercel-id`. Electron 33.4.11 (Chromium récent). Aucun binaire dans le dépôt.

### 4. DETTE DE CODE — **3/5**

- **Duplications confirmées** : `nextSlot()` défini 3 fois (`app-shell.tsx:28`, `event-dialog.tsx:23`, `planning/page.tsx:24`) ; `selectClass` 2 fois (`event-dialog.tsx:30`, `reglages/page.tsx:18`) ; nom `BackupPayload` porté par deux modules différents (`backup.ts:10` et `sync.ts:16`, schémas différents).
- **Code mort** : `colorsDark`, `categoryColorsDark`, `layout.sidebarW/topbarH/shellMaxW/dayStartDefault` (`design/tokens.ts:84-104, 143-152`), `priorityColor` (`categories.ts`), champ `darkMode` historique conservé mais non pilotant (`types.ts:53`).
- **Hygiène globalement bonne** : 0 `TODO`/`FIXME`/`HACK`, 0 `console.log` hors `console.error` de logs serveur, 0 `any`, TypeScript strict (`tsc --noEmit` ✅), `maxLength` sur tous les champs de saisie (30/80/140).
- Le bug de hooks `event-block.tsx:43-61` (voir axe 2) est aussi un point de dette structurelle.
- Style globalement cohérent (composants UI centralisés, `cx()`, tokens unique source `design/tokens.ts` injectés en variables CSS).

### 5. ACCESSIBILITÉ — **3/5**

- Clavier : onglets en roving tabindex + flèches/Home/End (`tabs.tsx:34-52`), dialogues avec piège de focus + Échap en capture + restauration du focus (`dialog.tsx:30-80`, `welcome-sequence.tsx:99-140`), créneaux de grille en `role="button"` + Entrée/Espace (`day-view.tsx:75-88`, `week-view.tsx:88-101`), raccourcis globaux inertes derrière une modale (`app-shell.tsx:105`). Focus visible global `:focus-visible` ring (`globals.css:38-41`). `aria-live` sur toasts (`toast.tsx:13`) et panneau voix (`voice-panel.tsx:63`), `role="dialog" aria-modal` (`dialog.tsx:88-90`), `role="progressbar"`/graphiques `role="img"` + `aria-label` (`stats`), `lang="fr"`, `prefers-reduced-motion` global (`globals.css:147-158`), cibles ≥ 44 px.
- **Contrastes calculés (WCAG)** : voix `#2DD4BF` sur fond sombre = **9,1–9,8:1 ✅** (le point redouté « token voix sur fond sombre » est en réalité excellent) ; mais sur fond clair 1,79:1 (d'où le token `voicetext #0F9B8E`, `tokens.ts:13`) = **3,30:1 sur clair** — insuffisant pour du texte normal AA (4,5:1), OK pour texte large/UI (3:1). Restent sous AA : `text-danger #FF6B6B` = **2,66:1** utilisé en texte d'erreur (`auth-dialog.tsx:142`, `sync-indicator.tsx:38`), `text-warning #FFB020` = **1,75:1** en texte de statut hors-ligne (`sync-indicator.tsx:40`), `text-primary #7C5CFF` = 4,17:1 (limite), texte de bouton `surface` sur `primarydark` = 4,35:1 (limite). Icônes `text-warning`/`text-danger` décoratives (`aria-hidden`) : acceptables.
- `Field` pose l'id sur un `<span>` plutôt que d'associer le `<label>` (`ui/input.tsx`) — association implicite, à nettoyer.

### 6. TESTS ET CI — **4/5**

- **176/176 tests Vitest** (15 fichiers, rejoués ✅ sur ma branche) + **`npm run test:parser`** (script Node sans dépendance, ~24 assertions : parseur, conflits, récurrence, calendrier, commandes vocales) ✅. CI `.github/workflows/centeryou-ci.yml` bloquante sur PR/push `apps/centeryou/**` : `npm ci` → `npm test` → `test:parser` → `build`.
- Couverture réelle : parseur (36 cas), store + persistance + récurrence, dates, conflits, safe-storage (corrompu/plein/inaccessible), backup export/import + refus de fichiers invalides, `/api/voix` (validation, quota, rate-limit IP, 503/502), sécurité API (signature webhook, anti-rejeu, 503 sans clés, 413 sync, non-fuite d'erreurs), voix/commandes vocales, welcome-sequence, stats (11 calculs + 3 rendus), error-boundary, réglages.
- **Vrais trous (non couvert)** :
  - Pas de test du parseur sur « dans N jours » avec N énorme (le crash NaN ci-dessus), ni « dans N mois », ni DST explicite, ni `repeat: 'mois'` sur 31/29-02.
  - Pas de test du bug de hooks d'`event-block.tsx`.
  - **Mode hors-ligne PWA / service worker : aucun test** (ni unitaire ni E2E).
  - **Webhook Stripe : testé uniquement avec mocks** (pas d'event Stripe réel, pas de `stripe listen` en CI).
  - Restauration d'une sauvegarde corrompue : `parseBackup` testé, mais pas le parcours UI complet ni un fichier > quelques Ko (pas de plafond de taille sur le fichier importé).
  - **Pas de tests E2E navigateur** (pas de Playwright/Cypress) ; le harnais `audit/parcours.test.tsx` (12 scénarios) existe mais tourne via `vitest.audit.config.mts`, **hors CI**.
  - CI : pas d'étape `npm audit`, pas de `lint`, pas de seuil de couverture, et `apps/centeryou-desktop/**` ne déclenche aucune CI.
  - Pas de test d'authentification sur `/api/sync` et `/api/compte/suppression` (il n'y en a pas — voir axe 1).

### 7. COHÉRENCE DES DONNÉES — **3/5**

- **Schéma localStorage `centeryou-v1`, version 2** (`store.ts:144-145`) avec `migrate` v1→v2 (onboarded forcé à true, `store.ts:162-170`) et `merge` qui **sanitize chaque entrée** (`store.ts:173-186` + `sanitize.ts`) → localStorage corrompu/édité à la main : réparation douce, les valides conservés, aucun crash (Alpha/Hugo). Stockage résilient : JSON illisible → copie `centeryou-v1__corrupt-<ts>` + état neuf + toast (`safe-storage.ts:60-90`) ; quota plein → message FR, valeur gardée en mémoire (`safe-storage.ts:100-118`). `rehydrate()` protégé par `.catch()` (`useHydrated.ts:14-20`).
- **Restauration manuelle** : validation + sanitation (`backup.ts:48-93`) puis remplacement atomique via `restoreBackup` (`store.ts:116-122`) — cohérent.
- **Doublons** : ids `uid()` = timestamp + 8 car aléatoires, collision négligeable ; `findConflict` bloque les doublons exacts à la création.
- **Synchro compte Supabase** (`sync.ts`, `auth-store.ts`, `sync-provider.tsx`) : un snapshot JSON par compte, méta `centeryou-sync-meta-v1`, **dernière version gagne** (`savedAt`), push débouncé 2,5 s + à la reconnexion réseau ; 2e appareil vierge → restauration auto. **Mais** : `applyPayload` (`sync.ts:85-95`) et `pullSync` (`sync.ts:199-226`) font un `useStore.setState` **sans sanitation item par item** (seul `Array.isArray` / forme du payload) → un payload distant corrompu/malveillant est persisté tel quel et peut provoquer un crash de rendu jusqu'au prochain rechargement (où `merge` nettoie).
- **Synchro Premium Stripe** (`/api/sync` + `sync-store.ts`) : dernier écrivain gagne (`updatedAt`), **stockage mémoire uniquement si Vercel KV non configuré** → perte du snapshot à chaque redémarrage d'instance en prod, et endpoint sans auth (voir axe 1). Conflit multi-appareils hors-ligne : perdant silencieux (pas de merge 3-way).
- **Changement d'appareil sans compte** : rien ne migre automatiquement (localStorage reste sur l'ancien appareil) ; seule la sauvegarde JSON manuelle (export/import) ou un compte Supabase/Stripe fonctionne. Documenté dans l'UI, mais c'est la plus grosse perte de données utilisateur potentielle.

---

## Top 15 des risques restants (impact × effort, décroissant)

| # | Risque | Preuve | Impact | Effort |
|---|--------|--------|--------|--------|
| 1 | `/api/sync` sans auth : lecture/écrasement du snapshot par `customerId` | `api/sync/route.ts:22-50`, `sync.ts:199` | 🔴 Haut (fuite/altération de toutes les données Premium) | Moyen (auth session/JWT) |
| 2 | `/api/compte/suppression` : DELETE serveur sans auth, par e-mail, clé service | `api/compte/suppression/route.ts:12-30` | 🔴 Haut si Supabase configuré | Faible (vérifier le JWT de session) |
| 3 | `next@14.2.35` : CVE critical/high (RCE image opt. self-hosted, SSRF, cache confusion) + postcss high | `npm audit` (8 vulns, fix = next 16.4.6) | 🔴 Haut en self-hosted, 🟠 moyen sur Vercel | Haut (montée majeure) |
| 4 | Parseur « dans 999999999 jours » → date `NaN` → `RangeError` Intl → écran d'erreur | sonde + `parser.ts:111-122`, `quick-add.tsx:32` | 🟠 Moyen (crash UX, récupérable) | Faible (plafondner `n`, valider la date) |
| 5 | `event-block.tsx` : `return null` avant les hooks → crash React « fewer hooks » | `event-block.tsx:43-61` | 🟠 Moyen-haut | Faible (hooks d'abord, return ensuite) |
| 6 | `repeat: 'mois'` saute les mois sans 31e / 29-02 (pas de report fin de mois) | sonde + `events.ts:20-21` vs `dates.ts:45-54` | 🟠 Moyen (données « invisibles ») | Faible (clamp comme addMonthsISO) |
| 7 | Payloads distants (Supabase/Stripe) appliqués sans sanitation item par item | `sync.ts:85-95,213-220` | 🟠 Moyen (crash jusqu'au reload) | Faible (réutiliser `sanitize*`) |
| 8 | Synchro Stripe mémoire-only sans KV + conflits last-write-wins silencieux | `sync-store.ts:16-21`, `sync.ts:137-160` | 🟠 Moyen (perte de données multi-appareils) | Moyen (KV + merge 3-way) |
| 9 | Quota voix keyed sur prénom client + rate-limit XFF contournable en self-hosted | `api/voix/route.ts:31,158` | 🟡 Moyen (coût ElevenLabs) | Moyen (store persistant, IP fiable) |
| 10 | Pas de rate-limit sur `/api/checkout`, `/portal`, `/subscription/status`, `/sync`, `/compte/suppression` | routes `api/*` | 🟡 Moyen-faible (abus/coût) | Faible-Moyen |
| 11 | Événements de nuit traversant minuit impossibles (23h→2h) | `event-dialog.tsx:107-110`, `dates.ts:74-78` | 🟡 Faible-moyen | Moyen |
| 12 | Contraste AA : danger 2,66, warning 1,75, voicetext 3,30, primary 4,17 | calculs axe 5, `auth-dialog.tsx:142`, `sync-indicator.tsx:38-40` | 🟡 Accessibilité/RGAL | Faible (tokens texte dédiés) |
| 13 | Pas de plafond de taille sur le fichier de restauration importé ; titres importés sans maxLength | `backup.ts:81-93`, `readBackupFile` | 🟡 Faible (perf/crash propre appareil) | Faible |
| 14 | Toutes les pages en rendu dynamique (nonce CSP) → TTFB/coût serverless à l'échelle | build : 23 routes ƒ, `layout.tsx:105` | 🟡 Perf/coût | Moyen |
| 15 | CI : pas d'audit npm, pas de lint, pas de couverture, harnais `audit/` et desktop hors CI | `.github/workflows/centeryou-ci.yml`, `vitest.audit.config.mts` | 🟡 Régressions non détectées | Faible-Moyen |

## Verdict — prêt pour le lancement du 1/01/2027 ?

**Oui, conditionnellement.** Le socle est sain et bien défendu là où ça compte pour un SaaS hébergé sur Vercel : aucun secret dans le bundle (prouvé par build + grep), CSP nonce, rate-limit, webhook signé anti-rejeu, sanitation du stockage local, 176/176 tests + build verts, prod en ligne et rapide (200 en 0,37 s). La fuite ElevenLabs historique est corrigée et vérifiée.

**4 risques à corriger AVANT le 1/01/2027** (tous de effort faible à moyen) : n°1 (`/api/sync` sans auth), n°2 (`/api/compte/suppression` sans auth), n°4 (crash NaN du parseur), n°5 (hooks d'`event-block`). Sans eux, un utilisateur malveillant ou une saisie anodine peut lire/altérer des données ou faire tomber l'app.
**À planifier juste après** : montée majeure de `next` (n°3, Vercel atténue en attendant), sanitation des payloads distants (n°7), KV pour la synchro Premium (n°8), contrastes AA (n°12).
Le reste (parseur « dans N mois », événements de nuit, dette) est du suivi produit, pas un bloqueur.

## Attaques recommandées après le lancement (pentest)

1. **IDOR /api/sync** : énumérer/deviner des `cus_…`, GET puis POST un snapshot forgé (écrasement) ; vérifier sans KV vs avec KV.
2. **Suppression de compte sans auth** : POST `/api/compte/suppression` avec l'e-mail d'une victime (si Supabase configuré) ; tester aussi injection dans le query param `email=eq.…`.
3. **XSS** : tenter d'injecter du HTML/JS via titres d'événements, tâches, prénoms, fichier de sauvegarde importé (vérifier l'échappement React + CSP nonce : scripts injectés non signés doivent être bloqués) ; tenter un bypass CSP via `style-src 'unsafe-inline'`.
4. **Usurpation d'en-têtes** : `x-forwarded-for` rotatif sur `/api/voix` pour dépasser 20 req/h (self-hosted) ; `x-centeryou-user` rotatif pour le quota 300 car/jour.
5. **Webhook Stripe** : rejeu d'un ancien événement signé (doit être rejeté > 300 s), signature v1 malformée, événement inconnu, `checkout.session.completed` avec `subscription` absent.
6. **DoS** : corps > 1 Mo sur `/api/sync` (413 attendu), flood `/api/checkout` (pas de rate-limit), `deviceId` géant, texte de 1000+ car sur `/api/voix`, fichier de sauvegarde de 100 Mo importé.
7. **Parseur hostile** : « dans 999999999 jours », « dans 2 mois », chaînes de 10 000 caractères (maxLength 140 côté UI, mais commande vocale sans plafond ?), caractères de contrôle/Unicode dans les titres.
8. **Stockage local** : écrire `centeryou-v1` corrompu (JSON invalide, champs invalides, quota plein simulé) et vérifier la copie de secours + toast + aucun crash.
9. **PWA/hors-ligne** : couper le réseau après 1re visite, recharger, vérifier le SW ; tenter de servir une vieille coquille (cache poisoning du SW).
10. **Clickjacking / en-têtes** : vérifier `frame-ancestors 'none'` + `X-Frame-Options` sur toutes les routes ; HSTS ; absence de `X-Powered-By`.
11. **Host/APP_URL** : appeler `/api/checkout` avec `Host` forgé, vérifier `success_url` (open redirect/phishing post-paiement).
12. **Supabase** : RLS de `backups`/`profiles` (lecture croisée user A → user B), token expiré, `detectSessionInUrl` (fuite de token dans l'URL/historique).
13. **Desktop (Electron)** : navigation vers domaine externe (doit ouvrir dans le navigateur), `webview`, devtools en prod, certificat invalide, mise à jour forcée (`x-vercel-id` usurpé).
14. **Self-hosted (si ever)** : CVE next 14.2.35 — RCE Image Optimization (AVIF/SVG), SSRF Server Actions, cache poisoning — à tester avec `next start` derrière un proxy naïf.
15. **RGPD** : export des données, suppression de compte (local + serveur), délais, placeholder `contact@centeryou.fr` à remplacer avant commercialisation.

---

*Rapport rédigé en lecture seule par Sentinelle, le 2026-11-20. Aucun fichier fonctionnel modifié. PR : branche `vibe/sentinelle-audit-complet` → base `main`, ce fichier uniquement.*
