# Journal — Verrou 2

## Mission M-32 — Colmatage sécurité (attaques 🔴 de Bastion M-24) + garde-fous (Chrono M-27, correctif n°1) — 2026-11-23

- **Agent** : Verrou 2 (session Vibe dédiée). Branche : `vibe/verrou-2-securite` (base `main` `c8e3491`, inscription MISSIONS.md publiée en premier commit `7976cc8` : « branche créée, en cours »).
- **PR** : brouillon, base `main` — « M-32 Verrou 2 — les trois attaques de Bastion ne passent plus » (voir inscription MISSIONS.md).
- **Règle absolue tenue** : **aucune requête vers la production** ni aucun service externe réel. Toutes les preuves tournent sur **harnais local** : vrais modules importés dans vitest, Supabase Auth / Stripe **simulés par un `fetch` stubbé** (`tests/verrou2-api.test.ts`), vrai store + vrai `merge` + vrai `localStorage` jsdom (`tests/verrou2-store.test.ts`). Zéro appel externe, zéro vraie clé (`sk_test_faux_pour_test`).
- **Références lues avant de coder** : `AGENTS.md`, `docs/MISSIONS.md` (M-32), `journal/bastion.md` (M-24 : R1/R2/R3/O3 + O5), `journal/chrono.md` (M-27 : correctif n°1 = plafond restauration + `sanitizeEvents` durci), `journal/verrou.md` (M-13 : style des tests d'intrusion maison, `tests/api-intrusion.test.ts` / `api-sync-auth.test.ts` comme modèles de harnais).
- **Zone tenue (étanche)** : `src/lib/store.ts` (fonction `merge` uniquement + import), `src/lib/safe-storage.ts`, `src/lib/backup.ts`, `src/app/api/sync/route.ts`, `src/app/api/portal/route.ts`, `src/app/api/subscription/status/route.ts`, 2 nouveaux fichiers de tests (`tests/verrou2-store.test.ts`, `tests/verrou2-api.test.ts`), ce journal, MISSIONS.md (inscription). `src/lib/sync.ts` n'a finalement pas eu besoin de modification (il envoie déjà le Bearer). **Aucun composant/page touché, `sanitize.ts`/`parser.ts`/`voice-commands.ts`/`package.json`/`package-lock.json` inchangés** (vérifié au `git diff`). Zéro nouvelle dépendance. Uniquement du comportement de GARDE : aucune fonctionnalité visible ajoutée, aucun texte d'interface nouveau hors le message d'erreur de restauration (« trop volumineux … 5 Mo »).
- **Baseline mesurée** (base `c8e3491`) : `npm test` ✅ **621/621** (32 fichiers) · `npx tsc --noEmit` ✅ · `npm run build` ✅ (23 pages ; le 1ᵉʳ run a échoué sur le fetch Google Fonts Inter sans réseau — faux échec, relancé une fois → ✅, conformément à la consigne).

---

## 1. Méthode

Comme Bastion, j'ai **rejoué chaque attaque** sur harnais local dans des tests automatiques dédiés : l'attaque doit **ÉCHOUER après le correctif**. Règle 8 tenue : aucun test ne dépend de la date réelle (dates bornées fixes : `2001-…` toujours passé, `2200-…` toujours futur et dans la borne).

## 2. Tableau « attaque → échec de l'attaque prouvé »

| # | Attaque rejouée (Bastion M-24) | Avant (constaté par Bastion) | Après correctif (test) | Preuve |
|---|---|---|---|---|
| **R1** | localStorage forgé `subscription:{status:'active',plan:'premium',customerId:'cus_FORGED'}` + `voiceQuota:{used:-100…}` puis `rehydrate()` | `merge` en `{...default, ...p.subscription}` sans validation → `isPremiumActive()` = **true**, essais infinis | `merge` sanité via `sanitizePersistedSubscription` / `sanitizePersistedVoiceQuota` (`safe-storage.ts`) : whitelist `status`/`plan`, ids format `cus_`/`sub_`, `currentPeriodEnd` ISO valide **bornée** (2000–2200) et **à venir** sinon statut premium ramené à `none`, `updatedAt` borné, `used` entier ≥ 0 borné, `month` `YYYY-MM` valide borné | `tests/verrou2-store.test.ts` : attaque Bastion → `status:'none'`, `isPremiumActive=false`, `used` entier ≥ 0, `premiumVoiceRemaining ≤ 3` ; variantes forgées → défauts sûrs ; **stockage légitime Premium intact** (fin de période `2200-…` conservée, `isPremiumActive=true`) |
| **R2** | Supabase ON + Stripe OFF : Alice (session valide) écrit/lit le snapshot de `cus_VICTIM` | **200 + snapshot de la victime** (IDOR) | `authorize()` dérive la **clé de stockage de l'identité de session** (`user:<id>`) dès que Stripe n'est pas configuré — jamais du `cus_` libre ; Stripe ON → e-mail session = e-mail client (403 sinon), clé = `customerId` prouvé | `tests/verrou2-api.test.ts` : POST alice sur `cus_VICTIM` → 200 mais indexé chez alice ; GET bob sur `cus_VICTIM` → **snapshot null** ; GET alice → retrouve SON snapshot ; sans session → 401 ; aucun backend → repli mémoire 200 inchangé ; Stripe-sans-Supabase → 503 inchangé |
| **R3** | `POST /api/portal {customerId:'cus_VICTIM'}` sans session (Stripe simulé) | **200 + URL `billing.stripe.com/session/…` de la victime** | session Supabase **exigée** (401 sinon) + `retrieveCustomer` : e-mail session = e-mail client requis (**403** sinon) ; Supabase absent → 503 fail-closed ; Stripe OFF → 503 inchangé (local pur) | `tests/verrou2-api.test.ts` : sans session → **401, 0 appel Stripe** ; alice→`cus_VICTIM` → **403, 0 appel `billing_portal`** ; alice→`cus_ALICE` → 200 + portail créé |
| **O3** | `POST /api/subscription/status {customerId:'cus_VICTIM'}` sans session | **200** `{"snapshot":{status:'active'…}}` (oracle RGPD) | Stripe configuré → session **exigée** (401) + si `customerId` demandé, e-mail = session (**403**) ; Supabase absent → 503 ; Stripe OFF → `200 {configured:false}` **inchangé** (local pur) | `tests/verrou2-api.test.ts` : sans session → **401** ; alice→`cus_VICTIM` → **403** ; alice→`cus_ALICE` → 200 ; `sessionId` seul + session → 200 |
| **Chrono n°1 (O5)** | restauration d'un fichier de 100 Mo / titres de 500 000 car / événement 23:00→02:00 | lu en mémoire sans plafond, titre géant accepté, événement fantôme invisible | `readBackupFile` : plafond **5 Mo** (`BACKUP_MAX_BYTES`) vérifié **avant** lecture → `BackupError` FR « Ce fichier est trop volumineux (X Mo) : la limite est de 5 Mo. Aucune donnée n'a été modifiée. » ; `sanitizeBackupEvents` (dans `backup.ts`) : titre plafonné à **140 car** (`ICS_MAX_TITLE`), `fin ≤ début` → **remis droit** (fin = début + 30 min, bornée 23:59) ; `end:'00:00'` (minuit) légitime conservé | `tests/verrou2-store.test.ts` : 5 Mo+1 → refus FR avec « 5 Mo » ; pile 5 Mo → accepté ; titre 500 000 car → 140 ; 23:00→02:00 → 23:00→23:30 conservé et `fin > début` ; aller-retour export→import fidèle |

## 3. Correctifs posés (zone uniquement)

- `src/lib/safe-storage.ts` : ajout de `sanitizePersistedSubscription()` et `sanitizePersistedVoiceQuota()` — sanitation stricte de tout ce qui revient du stockage (whitelists, formats, bornes fixes indépendantes de la date du jour) ; ce qui n'est pas propre est ignoré **silencieusement**, un stockage légitime n'est jamais cassé.
- `src/lib/store.ts` (**fonction `merge` uniquement**) : `subscription: sanitizePersistedSubscription(p.subscription)`, `voiceQuota: sanitizePersistedVoiceQuota(p.voiceQuota)` à la place du spread aveugle.
- `src/app/api/sync/route.ts` : `authorize()` renvoie désormais la **clé de stockage dérivée** — `user:<id>` quand Supabase est ON et Stripe OFF (R2), `customerId` seulement quand la propriété est prouvée par l'e-mail (Stripe ON) ; repli mémoire local inchangé quand aucun backend n'est configuré.
- `src/app/api/portal/route.ts` : après les garde-fous M-13 existants, session Supabase exigée + e-mail session = e-mail du client Stripe (R3) ; 401/403/503/502 propres, aucun détail interne.
- `src/app/api/subscription/status/route.ts` : dès que Stripe est configuré, session exigée (O3) + correspondance e-mail quand `customerId` est demandé ; `configured:false` inchangé sans Stripe (local pur).
- `src/lib/backup.ts` : `BACKUP_MAX_BYTES` = 5 Mo + check `file.size` **avant** lecture dans `readBackupFile` (message FR clair) ; `sanitizeBackupEvents` (titre ≤ 140, fin > début remis droit) appliqué à l'export et à l'import.
- Tests : `tests/verrou2-store.test.ts` (13 tests : R1 rejouée + variantes + non-régression stockage légitime + garde-fous restauration) et `tests/verrou2-api.test.ts` (16 tests : R2/R3/O3 rejouées sur harnais local, fetch Supabase/Stripe stubbé).

## 4. Validation (2026-11-23 ~07:35 UTC)

- `npm test` ✅ **650/650** (34 fichiers) = **621/621 de main intacts + 29 nouveaux** — tout ce qui marchait continue de marcher.
- `npx tsc --noEmit` ✅ · `npm run build` ✅ (23 pages, middleware 27,2 kB ; 1ᵉʳ run en faux échec réseau Google Fonts, relancé → ✅).
- `git diff` : zone uniquement ; `package.json` / `package-lock.json` **inchangés** (aucune nouvelle dépendance).
- Comportement local pur (ni Supabase ni Stripe) **inchangé** : `/api/sync` repli mémoire 200, `/api/portal` 503, `/api/subscription/status` 200 `configured:false`, restauration < 5 Mo identique — prouvé par les tests existants (621) plus les nouveaux cas « local pur ».

## 5. Notes de passation (hors zone, pour les missions suivantes)

- Côté client, `billing.ts` (zone paiement/Banquier) n'envoie pas encore son `Authorization: Bearer` vers `/api/portal` et `/api/subscription/status` : quand Supabase+Stripe seront activés en production, ces appels devront l'envoyer (comme `sync.ts` le fait déjà pour `/api/sync`) — sinon 401 propre. Aucun changement aujourd'hui (aucun backend actif).
- Limite inhérente documentée (comme Bastion l'avait noté) : un localStorage forgé **parfaitement well-formé** (statut `active` + `currentPeriodEnd` future valide) reste indiscernable d'un vrai cache serveur côté client — la source de vérité reste le serveur (`/api/sync` bloque le `cus_` forgé quand Stripe est ON ; la vérification du statut premium côté `/api/voix` reste du ressort de la zone voix/paiement, M-09+).
- R1 borné côté client par construction ; le freemium « 3 essais/mois » reste appliqué côté client, le vrai plafond serveur voix (300 car/jour/profil + 3 000 car/jour/IP) tient toujours (B1 re-vérifié par les 621 tests existants).

---

*Verrou 2, 2026-11-23 ~07:35 UTC. Branche `vibe/verrou-2-securite`, PR brouillon base `main` « M-32 Verrou 2 — les trois attaques de Bastion ne passent plus ».*
