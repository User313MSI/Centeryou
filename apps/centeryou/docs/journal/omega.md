# Oméga — Intégration finale — 2026-11-14

Agent : **Oméga** (intégrateur en chef). Branche : `integration-finale` (base : branche par défaut
`vibe/novaloom-suite-fe60b6`). Mission : intégrer une par une, dans l'ordre **#9 → #11 → #16 → #14 → #13 → #15**,
les 6 PR ouvertes en conflit, en gardant **les fonctionnalités des deux côtés** à chaque conflit.

À chaque étape : `npm run build` ✅ + tests ✅ (`npm test` Vitest et `npm run test:parser`), puis push de
`integration-finale` (publication en temps réel).

## Ordre d'intégration et état après chaque étape

| Étape | PR | Branche | Conflits | Build | Tests |
|---|---|---|---|---|---|
| 1 | #9 comptes & sauvegarde en ligne (Supabase) | `vibe/centeryou-comptes-sync-5851c0` | aucun (branche déjà synchronisée) | ✅ | ✅ test:parser |
| 2 | #11 onboarding + mode sombre | `vibe/centeryou-onboarding-dark-cd5acb` | 1 (`reglages/page.tsx`, imports) | ✅ | ✅ test:parser |
| 3 | #16 paiement Stripe | `vibe/centeryou-stripe-paiement-9db2c7` | 7 | ✅ | ✅ test:parser |
| 4 | #14 tests & CI | `vibe/centeryou-hugo-tests-393519` | 4 | ✅ | ✅ 139/139 |
| 5 | #13 conformité CGU/RGPD | `vibe/centeryou-conformite-b03a40` | 2 (+ fix tests) | ✅ | ✅ 139/139 |
| 6 | #15 lancement, landing, SEO | `vibe/centeryou-launch-jonas-d7c8a1` | 6 | ✅ | ✅ 139/139 |

## Choix de résolution détaillés

### #9 → #11 (étape 2)
- `reglages/page.tsx` : seul le bloc d'imports était en conflit. Conservé : `AlertTriangle, Download, Moon`
  + `AccountSection` (carte Compte de Bravo **et** carte Apparence/mode sombre de Dario).

### #11 + #16 (étape 3) — le conflit le plus structurant
- **`src/lib/sync.ts` (ajouté des deux côtés, contenus différents)** : fusionné en un seul module.
  Partie Bravo (Supabase, compte) : `BackupPayload`, `syncNow`, `pushBackup`/`pullBackup`/`fetchBackup`,
  `applyPayload`, méta local `centeryou-sync-meta-v1`. Partie Elena (Premium Stripe) : `initSync()` +
  `pullSync()` vers `/api/sync`. Variables internes renommées côté Stripe (`started`→`stripeSyncStarted`,
  `push`→`pushStripe`) pour éviter toute collision ; **aucune exportation supprimée**, les deux
  consommateurs (`auth-store.ts`, `sync-provider.tsx`, `app-shell.tsx`, `subscription-card.tsx`) fonctionnent.
- **`design/tokens.ts` / `tailwind.config.ts` / `globals.css` (deux schémas de variables CSS)** :
  un seul schéma retenu, celui de Dario (générique via `colorVarNames`, superset des classes Tailwind :
  `primarydark`, `muted`, `line`, `veil`, `onbright`, `cat-*`). `layout.tsx` injecte `:root` + `.dark`
  depuis `design/tokens.ts` (source unique) ; les blocs statiques `:root`/`html.dark` de `globals.css`
  (schéma d'Elena) ont été retirés pour éviter deux sources de vérité. La palette `colorsDark`/
  `categoryColorsDark` d'Elena reste exportée dans `tokens.ts` (référence), la palette active est
  `darkColors` de Dario. **Tokens de marque inchangés** (#7C5CFF, #5B3FE8, #2DD4BF, #FFB020, #FF6B6B,
  #FAFAFC, #1A1B2E).
- **Mode sombre** : Elena gatait `.dark` derrière Premium (`settings.darkMode && isPremiumActive(...)`).
  Contrainte explicite de la mission : **le mode sombre ne doit pas disparaître** → le pilotage retenu est
  celui de Dario (`settings.theme === 'sombre'`, mémorisé, non gated), dans `app-shell.tsx` + script
  anti-flash dans `layout.tsx`. Le champ `darkMode` reste dans le type/persistance (aucun renommage).
  Toute la partie paiement Stripe (offres `plans.ts`, Checkout FR, webhook signé, portail, statut,
  carte Abonnement, synchro `/api/sync`) est conservée intégralement.
- **`store.ts`** : `partialize` persisté élargi aux champs des deux côtés (`events/tasks/settings` +
  `deviceId/subscription/voiceQuota/syncUpdatedAt`), `migrate` v1→v2 de Dario conservé, `merge` avec
  sanitation conservé.
- **`reglages/page.tsx`** : cartes **Compte** (Bravo) + **Abonnement** (Elena, `SubscriptionCard` avec CTA
  « Passer Premium ») + **Apparence/mode sombre** (Dario, toggle non gated) + **Export JSON** toutes
  présentes. La carte « Affichage » premium-gatée d'Elena est remplacée par la carte Apparence de Dario
  (le CTA Premium vit dans `SubscriptionCard`) — aucun parcours utilisateur perdu.
- **`.env.local.example`** : les 3 blocs conservés sans aucun renommage — ElevenLabs serveur
  (`NEXT_ELEVENLABS_API_KEY`, `NEXT_ELEVENLABS_VOICE_ID`), Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`), Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_ID_PREMIUM`, `APP_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`).
- **`next.config.mjs`** : en-têtes de sécurité + origine Supabase dans `connect-src` (Bravo) conservés ;
  aucun `env:` (aucune clé inlinée).

### #16 + #14 (étape 4)
- **`store.ts`** : structure de Hugo retenue (`defaultSettings` déplacé dans `src/lib/defaults.ts`,
  sanitation dans `src/lib/sanitize.ts`, stockage résilient `createSafeStorage()`), **plus** les imports
  Stripe (`subscription`) et le `migrate` v2 de Dario ; `partialize` persisté élargi aux 7 champs.
- **`defaults.ts` / `sanitize.ts`** étendus avec `theme` / `onboarded` / `darkMode` (clampés) pour que la
  réhydratation et les sauvegardes JSON ne perdent aucun champ des autres agents.
- **`package.json` / `package-lock.json`** : dépendances des deux côtés (`@supabase/supabase-js` **et**
  Vitest + Testing Library), scripts `test` + `test:parser` conservés ; lockfile régénéré via `npm install`.
- **`reglages/page.tsx`** : imports fusionnés (sauvegarde/restauration Hugo **et** compte Bravo **et**
  abonnement Elena **et** apparence Dario).
- **`app-shell.tsx`** : `ErrorBoundary` (Hugo) + toast de stockage + `SyncProvider` (Bravo) + `initSync()`
  Stripe + bottom-nav/PWA conservés.
- **Test adapté** : `tests/store.test.ts` attendait `version: 1` du persist → mis à jour à `2`
  (migration v1→v2 de Dario : `theme` + `onboarded`). Seul changement de test de toute l'intégration.

### #14 + #13 (étape 5)
- **`store.ts`** : `restoreBackup` (Hugo) **et** `deleteAccount` (Iris) conservés tous les deux.
- **`reglages/page.tsx`** : carte « Supprimer mon compte et mes données » (double confirmation + appel
  `POST /api/compte/suppression`) ajoutée **à côté** des cartes sauvegarde/compte/abonnement.
- **Fix tests** : `useRouter()` (ajouté par la suppression de compte) faisait planter
  `tests/reglages.test.tsx` hors contexte routeur → mock `next/navigation` ajouté dans ce fichier.
  Résultat : 139/139 ✅.

### #13 + #15 (étape 6, finale)
- **`page.tsx`** : la racine `/` devient la **landing publique** (Jonas, `HomeGate`) ; l'ancienne page
  Aujourd'hui vit désormais en `/aujourdhui` (fichier ajouté par Jonas, `AujourdhuiView`). La nav
  (`nav-items.ts`, `top-nav.tsx`) pointe déjà sur `/aujourdhui`.
- **`layout.tsx`** : métadonnées SEO complètes de Jonas (metadataBase, template de titre, robots
  index/follow, OG fr_FR + `/opengraph-image`, Twitter card, canonical) conservées ; la description
  fusionne le texte SEO et la mention « sauvegarde en ligne optionnelle avec un compte » (Bravo).
  `html lang="fr"`, script anti-flash du thème (Dario) et PWA (base) intacts.
- **`app-shell.tsx`** : `PublicNav` sur les routes publiques / `TopNav` sinon ; `Footer` (Iris) et
  `Toasts` partout ; `BottomNav`, `EventDialog`, `HelpDialog`, `TaskActionsMenu`, `VoiceFab`,
  `InstallPrompt`, `PwaRegister` **uniquement hors routes publiques** (Jonas) ; `SyncProvider` (Bravo)
  partout. La redirection onboarding de Dario (`/bienvenue`) est désormais **limitée aux routes app**
  (elle n'intercepte plus la landing/démo/presse) et renvoie vers `/aujourdhui`.
- **`src/lib/routes.ts`** : `PUBLIC_ROUTES` élargi aux pages légales d'Iris (`/cgu`, `/confidentialite`,
  `/contact`) puisqu'elles sont reliées depuis le pied de page visible sur la landing.
- **`types.ts`** : `onboarded` existait déjà (Dario) ; seul `darkMode` (Elena) est conservé en plus.
- **`.env.local.example`** : bloc `NEXT_PUBLIC_SITE_URL` (Jonas) ajouté au-dessus, sans toucher aux autres.
- **Deux parcours d'onboarding coexistent** : `/inscription` → `/onboarding` (Jonas, depuis la landing)
  et `/bienvenue` (Dario, à l'arrivée directe sur une route app) ; tous deux posent `settings.onboarded`.

## Vérifications finales (après les 6 intégrations)

- `npx tsc --noEmit` ✅
- `npm run build` ✅ — routes : `/` (landing), `/aujourdhui`, `/bienvenue`, `/planning`, `/taches`,
  `/voix`, `/reglages`, `/inscription`, `/onboarding`, `/demo`, `/presse`, `/offres`, `/legal`,
  `/cgu`, `/confidentialite`, `/contact`, `/robots.txt`, `/sitemap.xml`, `/opengraph-image` +
  API `/api/voix`, `/api/checkout`, `/api/portal`, `/api/stripe/webhook`, `/api/subscription/status`,
  `/api/sync`, `/api/compte/suppression`.
- `npm test` ✅ 139/139 (12 fichiers) · `npm run test:parser` ✅
- Contraintes respectées : aucune fonctionnalité supprimée, aucune variable d'environnement renommée,
  interface 100 % française, tokens inchangés, aucune barre latérale ajoutée, aucune clé/secret dans le
  code (clés Stripe/ElevenLabs uniquement en variables serveur).

## PR

« Intégration finale » — base `vibe/novaloom-suite-fe60b6`, head `integration-finale`.
