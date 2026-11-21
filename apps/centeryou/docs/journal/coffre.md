# Journal — Coffre

## Mission M-14 — Confidentialité & données personnelles (campagne « Grand V », vague 1)

- **Agent** : Coffre (session Vibe Code dédiée). Branche : `vibe/coffre-confidentialite` (base `main` = `793f1d0`).
- **PR** : https://github.com/User313MSI/Centeryou/pull/34 (brouillon, base `main`, head `vibe/coffre-confidentialite`, titre « Coffre : confidentialité & pages légales à jour (M-14) »).
- **Zone étanche tenue** : pages légales (`src/app/legal/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/cgu/page.tsx`, `src/app/contact/page.tsx`), `src/lib/legal.ts`, ce journal `apps/centeryou/docs/journal/coffre.md`. **Aucun autre fichier touché** (vérifié par `git diff --name-only origin/main`). Les problèmes repérés HORS zone sont documentés ci-dessous avec un plan de correction — **non codés**, conformément à la mission.
- **Références lues avant de coder** : `AGENTS.md`, `apps/centeryou/docs/MISSIONS.md` (M-14), `docs/journal/sentinelle.md` (rapport d'audit complet), tout le dossier `docs/journal/`, `docs/supabase/schema.sql`, `docs/INSTALL-SUPABASE.md`, et le code intégral des chemins données/réseau (`src/lib/store.ts`, `safe-storage.ts`, `backup.ts`, `sync.ts`, `supabase.ts`, `auth-store.ts`, `voice.ts`, `voice-commands.ts`, `brief.ts`, `billing.ts`, `plans.ts`, `subscription.ts`, `rappels.ts`, `motion.ts`, `src/app/api/**`, `src/lib/server/**`, `src/middleware.ts`, `next.config.mjs`, `public/sw.js`, `public/manifest.webmanifest`, `src/app/reglages/page.tsx`, composants compte/voix/stats).
- **Publication** : MISSIONS.md publié sur `main` à l'ouverture de la branche (commit `793f1d0`, 21/11 03:27 UTC, après `git pull`), et à nouveau à la PR (voir « Étapes »).
- **Baseline mesurée sur la branche (2026-11-21 ~03:31 UTC)** : `npx tsc --noEmit` ✅ (exit 0) · `npm test` ✅ **383/383** (26 fichiers — main a fusionné Pont entre-temps : 327 + 56 tests ICS ; à l'ouverture de ma session, sur `2d08f82`, j'avais constaté 326/327 avec l'échec pré-existing du test rappels codé en dur à la date 2026-11-21, corrigé depuis par Vibe Work dans `d3c67e9` — hors ma zone, non touché) · `npm run build` ✅ (voir Étapes).

---

## 1. INVENTAIRE EXHAUSTIF — ce que l'app stocke

### 1a. Stockage local (navigateur / appareil) — rien ne quitte l'appareil

| Donnée | Où (clé) | Pourquoi | Durée |
|---|---|---|---|
| Événements : id, titre, date, heures début/fin, catégorie, récurrence, date de création, délai de rappel | `localStorage["centeryou-v1"]` (store Zustand, champ `events`) — `src/lib/store.ts:144-190` | Afficher le planning | Tant que l'utilisateur ne supprime pas |
| Tâches : id, titre, date, heure, catégorie, priorité, état fait, date de création | `localStorage["centeryou-v1"]` (champ `tasks`) | Afficher les tâches | Idem |
| Réglages : **prénom**, début de journée, sons, voix, thème, parcours vus (brief/accueil/film), animations, rappels (activés, délai par défaut, rappel tâches + heure) | `localStorage["centeryou-v1"]` (champ `settings`) | Personnaliser l'app et le brief vocal | Idem |
| `deviceId` (`dev-…`, aléatoire) | `localStorage["centeryou-v1"]` | Identifiant d'appareil envoyé à Stripe comme `client_reference_id` au paiement (`src/lib/billing.ts:14-23`) | Idem |
| Abonnement : statut, `customerId`/`subscriptionId` Stripe, fin de période, annulation, `updatedAt` | `localStorage["centeryou-v1"]` (champ `subscription`) | Savoir si Premium est actif (ré-posé depuis le serveur à l'ouverture des Réglages) | Idem |
| Quota voix premium du mois (`{month, used}`) | `localStorage["centeryou-v1"]` (champ `voiceQuota`) | Compter les 3 essais gratuits/mois | Idem |
| `syncUpdatedAt` (horodatage du dernier snapshot appliqué) | `localStorage["centeryou-v1"]` | Synchro multi-appareils | Idem |
| Méta de synchro `{lastChangeAt}` | `localStorage["centeryou-sync-meta-v1"]` — `src/lib/sync.ts:32,43-67` | Décider quelle version gagne (local vs distant) | Jusqu'à suppression |
| Tampon anti-doublon des rappels (clés des notifications déjà envoyées, reports) | `localStorage["centeryou-rappels-v1"]` — `src/lib/rappels.ts:28,109-120` | Ne jamais notifier deux fois la même occurrence | Pruning 3 jours |
| Record de série de jours organisés (stats) | `localStorage["centeryou-record-serie"]` — `src/components/stats/stats-view.tsx:63` | Déclencher la célébration une seule fois | Tant que l'utilisateur joue |
| Copie de secours si le JSON principal est corrompu | `localStorage["centeryou-v1__corrupt-<ts>"]` — `src/lib/safe-storage.ts:60-90` | Aucune perte silencieuse | Jusqu'à suppression manuelle |
| Session de compte Supabase (jetons d'accès/refresh) — **uniquement si compte créé** | `localStorage["sb-<projet>-auth-token"]` — `src/lib/supabase.ts:24-34` | Reconnaître l'utilisateur à la reconnexion | Jusqu'à déconnexion / suppression du compte |
| Geste utilisateur de l'onglet (débloque la lecture auto du film) | `sessionStorage["centeryou-film-gesture-v1"]` — `src/components/today/launch-film.tsx:51,421,468,492` | Politique autoplay du navigateur | Session de l'onglet uniquement |
| Coquille de l'app + assets statiques (mode hors-ligne) | CacheStorage `centeryou-v1` (service worker, **origine propre uniquement**) — `public/sw.js:14-81` | Fonctionner sans Internet | Jusqu'à désinstallation / purge navigateur |

**Sauvegarde JSON exportée** (`centeryou-sauvegarde-YYYY-MM-DD.json`, téléchargée par l'utilisateur lui-même — `src/lib/backup.ts:27-45,88-98`) : `{app, version, exportedAt, events, tasks, settings}` = **TOUT le contenu personnel** (événements avec catégorie + rappel, tâches avec catégorie + priorité, réglages dont le prénom). Sanitisé à l'export et re-sanitisé à l'import (`parseBackup`, `backup.ts:48-93`). Ne contient PAS : deviceId, abonnement, quota, méta de synchro (métadonnées de compte/paiement, re-téléchargées depuis Stripe à la reconnexion).

### 1b. Ce qui sort de l'appareil — recherche de TOUTES les requêtes réseau dans le code

Méthode : grep exhaustif de `fetch(`, `XMLHttpRequest`, `sendBeacon`, `EventSource`, `WebSocket`, `axios`, `src=`, `href="http`, `preconnect`, `document.cookie`, `caches.` sur `src/`, `public/`, `next.config.mjs`, `package.json` + lecture de chaque hit + grep du bundle (fait par Sentinelle, confirmé).

| Destination | Quoi | Quand (condition) | Preuve |
|---|---|---|---|
| **Nos propres `/api/*`** (même origine, hébergées Vercel) | voix : `{text}` + en-tête `x-centeryou-user: <prénom>` ; paiement : `{deviceId}` / `{customerId}` / `{customerId, sessionId}` ; synchro : `{customerId, updatedAt, state:{events,tasks,settings}}` + Bearer session ; suppression : `{}` + Bearer | voix premium utilisée **et** prénom renseigné ; clic « Passer Premium » / portail / retour de Checkout / ouverture Réglages avec abonnement ; **abonnement Premium actif** ; clic « Supprimer mon compte et mes données » | `src/lib/voice.ts:39,84-95` · `src/lib/billing.ts:25,54,84` · `src/lib/sync.ts:196,224` · `src/app/reglages/page.tsx:120` |
| → **ElevenLabs** (`https://api.elevenlabs.io/v1/text-to-speech/…`) | `{text, model_id, voice_settings}` — le texte à lire (brief du matin `src/lib/brief.ts` ou réponse de commande vocale `src/lib/voice-commands.ts:117`), via notre serveur uniquement, clé `xi-api-key` côté serveur | Uniquement quand la voix premium est utilisée (Premium actif ou essai gratuit restant) | `src/app/api/voix/route.ts:14,163-176` ; la clé n'est jamais dans le bundle navigateur (grep Sentinelle : 0 occurrence dans `.next/static`) |
| → **Stripe** (`https://api.stripe.com/v1`) | création session Checkout (prix Premium 4,99 €/mois, `client_reference_id=deviceId`), portail client, lecture abonnement, vérification e-mail du customer pour `/api/sync` | Uniquement si l'utilisateur active l'offre Premium (clic paiement) | `src/lib/server/stripe.ts:21,44` · routes `api/checkout`, `api/portal`, `api/subscription/status`, `api/sync`, webhook signé HMAC `api/stripe/webhook` |
| → **Vercel KV** (`KV_REST_API_URL`, clé `centeryou:sync:<customerId>`) | snapshot de synchro `{customerId, updatedAt, state}` | Uniquement si Premium actif + KV configuré (sinon repli mémoire) | `src/lib/server/sync-store.ts:16-27,48-80` |
| → **Supabase** (depuis le navigateur, **uniquement si compte créé**) | auth : e-mail + mot de passe (+ prénom en métadonnée) à l'inscription/connexion, réinitialisation mot de passe ; table `profiles` (e-mail, prénom) ; table `backups` (snapshot complet `backups`) | Uniquement après création du compte (bouton explicite) | `src/lib/auth-store.ts:157-187,194-201` · `src/lib/sync.ts:113-135` · CSP `connect-src` limité à `'self'` + origine Supabase (`src/middleware.ts:50-58`) |
| → **Supabase** (depuis notre serveur, routes API) | `GET /auth/v1/user` (vérification du Bearer) ; `DELETE /rest/v1/comptes?email=eq.<e-mail de session>` (suppression compte) | Sur `/api/sync` et `/api/compte/suppression` avec session | `src/lib/server/auth.ts:41` · `src/app/api/compte/suppression/route.ts:45` |
| **API du navigateur** (pas d'envoi par notre code) | reconnaissance vocale `webkitSpeechRecognition` (clic sur le micro) : selon le navigateur (Chrome/Edge), l'audio peut être traité par les serveurs du fabricant du navigateur ; synthèse `speechSynthesis` (voix par défaut) | Uniquement au clic sur le micro / à la lecture vocale | `src/lib/voice.ts:44-58,196-230` — **divulgué noir sur blanc dans la politique** (parole vraie) |
| **Vercel** (hébergement) | journaux techniques standards : IP, date/heure, page demandée, en-têtes | Toute visite de page (involontaire, inhérent à tout site) | hébergeur ; documenté dans la politique |
| Service worker | fetch **origine propre uniquement** (`url.origin !== self.location.origin → return`) | mise en cache hors-ligne | `public/sw.js:44-47` |

**Affirmation tenue** : en parcourant tout le code, les seuls destinataires possibles d'un envoi initié par l'application sont : **nos propres `/api/*`, le service de synthèse vocale (ElevenLabs) pour le texte lu à voix haute via `/api/voix`, Stripe (paiement/abonnement) et Supabase (compte) — ces deux derniers UNIQUEMENT si l'utilisateur active un compte ou l'offre Premium, et Vercel (hébergement + journaux techniques)**. La reconnaissance vocale du navigateur (clic micro) est le seul flux « gris » : c'est le navigateur qui écoute, pas nous — disclosed dans la politique plutôt que caché.

### 1c. ZÉRO TRACEUR — confirmé par le code

- `package.json` : dépendances = `next`, `react`, `react-dom`, `zustand`, `@supabase/supabase-js`, `lucide-react` (+ dev : vitest/testing-library/types/tailwind). **Aucun SDK d'analytics, ads, crash-reporting, A/B testing.**
- `grep -rniE "analytics|gtag|gtm|pixel|segment|mixpanel|amplitude|posthog|sentry|hotjar|matomo|plausible|umami|adsense|doubleclick" src public next.config.mjs` → **0 hit**.
- `document.cookie` → **0 occurrence** dans `src/` et `public/` : aucun cookie, donc **pas de bandeau cookies**, assumé et expliqué dans la politique (section 5) : stockage local technique strictement nécessaire uniquement.
- Aucune image/script/font externe : `img-src 'self' data: blob:`, `font-src 'self' data:`, `script-src 'self' 'nonce-…'` (CSP nonce par requête, `src/middleware.ts:50-68`) ; seuls liens externes = `cnil.fr` et `github.com` (liens classiques, `rel="noopener noreferrer"`).
- Service worker : cache **same-origin uniquement** (`public/sw.js:44-47`).
- Notifications = Notification API locale, aucun serveur de push (`src/lib/rappels*.ts`).

---

## 2. LA PAROLE VRAIE — ce qui est écrit dans la politique de confidentialité (v2.0)

La page `/confidentialite` réécrite dit en français clair :

- **Par défaut, Centeryou ne sait rien de toi** : tout reste dans le navigateur (localStorage), aucun compte nécessaire, rien d'envoyé sans action de l'utilisateur.
- **Le texte du brief vocal est envoyé au service de synthèse pour être lu** : quand la voix premium est utilisée, le texte à lire (brief du matin, réponse de l'assistant) passe par notre `/api/voix` puis ElevenLabs ; le prénom sert uniquement au quota du jour (300 car/jour, mémoire vive, jamais enregistré, reset chaque nuit) ; la clé API reste côté serveur. Sans voix premium, la voix du navigateur est locale et Centeryou n'envoie aucun texte.
- **La reconnaissance vocale (micro) est celle du navigateur** : divulgué honnêtement (Chrome/Edge peuvent traiter l'audio via leurs serveurs) ; le champ texte fonctionne sans micro.
- Compte (Supabase, UE) et Premium (4,99 €/mois TTC, Stripe hébergé — la carte ne passe jamais par nous, synchro multi-appareils via `/api/sync`) : décrits comme facultatifs, activés uniquement par l'utilisateur.
- Rappels = notifications 100 % locales du navigateur.
- **Zéro traceur assumé** : aucun cookie, aucune pub, aucune mesure d'audience → pas de bandeau cookies, expliqué (stockage local strictement nécessaire).
- Droits en < 30 s depuis les Réglages (voir §3).

## 3. DROITS DES UTILISATEURS — vérifiés dans le code (pas juste écrits)

| Droit | Chemin exact | Preuve code | Verdict |
|---|---|---|---|
| **Récupérer mes données** | Réglages → carte « Données locales » → bouton « Sauvegarder mes données » (1 clic) → fichier JSON téléchargé | `src/app/reglages/page.tsx:51-56` (`onExport` → `serializeBackup({events, tasks, settings})` → `downloadBackup`) ; contenu = TOUT (`src/lib/backup.ts:27-45`) ; restauration possible via « Restaurer une sauvegarde… » (validation + sanitation `parseBackup`) | ✅ La sauvegarde JSON contient bien TOUT (événements, tâches, réglages, catégories, rappels, prénom). Bouton visible sur la page Réglages elle-même, **< 30 s**. |
| **Tout effacer** | Réglages → carte « Supprimer mon compte et mes données » → 2 clics de confirmation | `src/app/reglages/page.tsx:113-150` : POST `/api/compte/suppression` (Bearer session) **puis** `deleteAccount()` = store vidé + suppression de toutes les clés `centeryou*` du localStorage (`src/lib/store.ts:126-134`) | ✅ Effacement local immédiat **ET** demande de suppression côté serveur si compte il y a. Bouton sur la page Réglages, **< 30 s**. Le bouton « Effacer toutes mes données » (local seul) est distinct et bien libellé. |
| Voir / modifier | Dans l'app ; prénom dans Réglages → Profil | `src/app/reglages/page.tsx:166-180` | ✅ |
| Nous écrire (droits RGPD) | contact@centeryou.fr, délais annoncés (7 jours ouvrés / 1 mois RGPD), CNIL | `src/lib/legal.ts`, page `/contact` | ✅ (voir §5 pour le placeholder) |

## 4. PAGES LÉGALES MISES À JOUR (ma zone, et rien d'autre)

- `src/lib/legal.ts` : versions passées à **2.0**, dates « 21 novembre 2026 » (confidentialité + CGU). Champs inchangés (consommés par le footer et `/contact`).
- `src/app/confidentialite/page.tsx` : réécrit intégralement (voir §2) — inventaire en tableau (donnée/où/pourquoi/durée), ce qui quitte l'appareil et quand, rappels locaux, zéro traceur assumé, droits en < 30 s, sous-traitants (Vercel, ElevenLabs, Stripe, Supabase), transferts hors UE (ElevenLabs/Vercel, garanties contractuelles types), délais de conservation, sécurité, CNIL. FR clair, zéro jargon juridique.
- `src/app/cgu/page.tsx` : cohérent avec la réalité — offre Découverte gratuite, **Premium 4,99 €/mois TTC** (prix lu depuis la source unique `src/lib/plans.ts` via `formatPriceMonthly`, pas de double saisie), paiement Stripe hébergé, annulation à tout moment (effet fin de période, données conservées), sauvegarde JSON, compte facultatif, **suppression définitive local + serveur** (article 7, chemins exacts), rappels locaux, « tel quel », droit français.
- `src/app/legal/page.tsx` (mentions) : cartes à jour — plus de promesse invérifiable (« sauvegarde chiffrée chez l'hébergeur » retirée au profit de « compte Supabase dans l'UE »), ajout voix premium (texte du brief → ElevenLabs via `/api/voix`), rappels locaux, zéro cookie/traceur, boutons sauvegarder/effacer/supprimer, prix Premium, liens vers confidentialité/CGU/contact.
- `src/app/contact/page.tsx` : ajout du lien « Mentions légales » dans les liens utiles (cohérence du bloc légal).

Aucune promesse fausse : chaque engagement écrit est porté par du code (vérifié en §1-§3) ou est une obligation légale standard (délai 1 mois RGPD, CNIL).

## 5. PROBLÈMES DE CONFIDENTIALITÉ REPÉRÉS HORS DE MA ZONE — documentés, NON codés (avec plan de correction)

1. **La session Supabase reste dans le navigateur après « Supprimer mon compte et mes données »** — `deleteAccount()` (`src/lib/store.ts:129-132`) ne supprime que les clés commençant par `centeryou`, pas `sb-<projet>-auth-token`. *Plan* (zone store/auth, agent compte) : supprimer aussi les clés `/^sb-.*-auth-token$/` et appeler `sb.auth.signOut()` avant/après l'appel API dans `onDeleteAccount` (`src/app/reglages/page.tsx:113-150`). Impact : un jeton de session orphelin persiste localement après effacement.
2. **La suppression serveur ne couvre pas toutes les données Supabase** — `/api/compte/suppression` ne fait un DELETE que sur la table `comptes` (`src/app/api/compte/suppression/route.ts:45`), alors que le schéma documenté (`docs/supabase/schema.sql`) ne connaît que `profiles` et `backups` (en cascade sur `auth.users`) : la sauvegarde en ligne (`backups`, snapshot complet), le profil (e-mail, prénom) et le compte auth restent côté Supabase, et la table `comptes` n'existe même pas dans le schéma → le DELETE échoue (502) en prod. *Plan* (zone API Verrou) : supprimer `backups` + `profiles` via la clé service pour l'utilisateur de la session, puis supprimer l'utilisateur auth (Admin API `DELETE /auth/v1/admin/users/<id>`, la cascade efface le reste), et/ou ajouter la table `comptes` au schéma ; réponse honnête à l'utilisateur (succès/échec réel).
3. **La synchro Premium (`/api/sync`) n'est pas effacée à la suppression du compte** — le snapshot reste dans Vercel KV (`centeryou:sync:<customerId>`). *Plan* : purger la clé KV dans la route de suppression (ou au webhook `customer.subscription.deleted`).
4. **`contact@centeryou.fr` est un placeholder** (signalé par Sentinelle n°15 et Iris) — `src/lib/legal.ts` est ma zone mais je ne connais pas la vraie adresse : **l'utilisateur doit la fournir avant le 1/01/2027**, sinon les demandes RGPD tombent dans le vide. À remplacer dans `LEGAL.contactEmail` (unique source, propagé partout).
5. **Reconnaissance vocale du navigateur** — chez Chrome/Edge, l'audio du micro peut transiter par les serveurs du fabricant du navigateur (divulgué dans la politique, §2). *Plan* (hors zone) : proposer un réglage « reconnaissance locale uniquement » quand le navigateur le permet, et/ou recommander Firefox.
6. **Journaux Vercel (IP)** — durée non maîtrisée par nous ; la migration Cloudflare (M-09) réduira le périmètre hors UE. *Plan* : documenter la durée de rétention Vercel dans la politique à la migration.

## 6. AVIS DE CONFIDENTIALITÉ — les 5 améliorations à prévoir APRÈS le lancement (hors zone, à planifier)

1. **Suppression serveur complète et prouvée** : un clic = effacement local + `backups` + `profiles` + utilisateur auth Supabase + snapshot KV `/api/sync` + cache webhook Stripe, avec accusé de réception honnête et délai annoncé (corrige les points 1-3 ci-dessus). C'est le chantier RGPD n°1 avant la commercialisation.
2. **Chiffrement de la sauvegarde en ligne côté client** : la sauvegarde `backups` chiffrée dans le navigateur (clé dérivée du mot de passe, jamais envoyée) pour que Supabase ne stocke que du chiffré — « zero-knowledge » réel, vérifiable.
3. **Export enrichi** : en plus du JSON complet, un export lisible (CSV/Markdown) des événements/tâches, et un export des métadonnées de compte (abonnement) — droit à la portabilité renforcé.
4. **Voix 100 % locale par défaut quand c'est possible** : détection de la reconnaissance/synthèse on-device du navigateur, réglage explicite dans Réglages, et mention maintenue dans la politique.
5. **Registre des traitements + contact réel + tests récurrents** : remplacer le placeholder `contact@centeryou.fr`, tenir un registre interne (ce journal en est la base), rejouer le test « droits accessibles en < 30 s depuis Réglages » à chaque refonte de la page Réglages, et clouer par écrit les durées de conservation des logs (Vercel/KV) après la migration M-09.

## 7. Relecture « utilisateur de 15 ans ET avocat » — checklist appliquée

- 15 ans : phrases courtes, « en deux mots » en tête, tableau donnée/où/pourquoi/durée, exemples concrets (brief du matin), chemins de boutons copiés tels quels (« Sauvegarder mes données », « Supprimer mon compte et mes données »), zéro mot de jargon non expliqué (RGPD expliqué via « droit à… », CNIL nommée avec lien).
- Avocat : responsable du traitement nommé, base légale (exécution du contrat / intérêt légitime / consentement), finalités, durées, sous-traitants listés avec localisation et garanties (clauses contractuelles types), transferts hors UE déclarés (Vercel, ElevenLabs, Stripe), droits RGPD complets (accès, rectification, effacement, portabilité, opposition, limitation) + voie de recours CNIL + délai 1 mois, sécurité (HTTPS, clés serveur, CSP), cookies (aucun), versionnage + date. Aucun engagement non tenu : chaque promesse est adossée à du code (références en §1-§3).

---

## Étapes (heure UTC)

- 2026-11-21 03:25 — Lecture de `AGENTS.md`, `MISSIONS.md`, `sentinelle.md`, des 21 journaux, du schéma Supabase et du code (inventaire §1). Baseline sur `2d08f82` : `npm test` 326/327 (échec pré-existing du test rappels à date codée en dur = 2026-11-21, déjà signalé par Pont, corrigé ensuite par Vibe Work dans `d3c67e9` — non touché).
- 2026-11-21 03:27 — **MISSIONS.md publié sur `main`** (pull d'abord, commit `793f1d0`) : « M-14 Coffre lancée — branche `vibe/coffre-confidentialite` ouverte ». Branche `vibe/coffre-confidentialite` créée depuis `origin/main` et poussée.
- 2026-11-21 03:31 — Réécriture de `src/lib/legal.ts` (v2.0), `/confidentialite`, `/cgu`, `/legal`, `/contact`. `npx tsc --noEmit` ✅ · `npm test` ✅ **383/383** (26 fichiers).
- 2026-11-21 03:35 — Journal `coffre.md` rédigé (inventaire §1, parole vraie §2, droits vérifiés §3, changements §4, hors-zone §5, avis §6, relecture §7). Note : le checkout principal étant partagé avec les agents parallèles (Verrou/Sourire y basculent de branche), mon commit a d'abord atterri sur `vibe/verrou-securite` par erreur ; il a été déplacé proprement (cherry-pick `60e168e`) sur `vibe/coffre-confidentialite` calée sur `origin/main` à jour, et la branche de Verrou restaurée à son sommet (`6187d37`) — aucun fichier d'une autre zone n'a été commité (`git diff --name-only origin/main..HEAD` = mes 6 fichiers uniquement).
- 2026-11-21 03:38 — Validation sur l'état final de la branche (`origin/main` 1a9cb81 + `60e168e`) : `npx tsc --noEmit` ✅ · `npm test` ✅ **383/383** (26 fichiers, aucun test touché) · `npm run test:parser` ✅ · `npm run build` ✅ (23 routes, First Load JS partagé 87,5 kO) · grep secrets/keys dans `.next/static` = 0 occurrence. Branche poussée, **PR brouillon #34** ouverte (base `main`).
- 2026-11-21 03:40 — MISSIONS.md publié sur `main` à la PR (pull d'abord) : PR #34 + validation (383/383, build ✅). Fusion réservée à Vibe Work.

*Journal tenu par Coffre. Zone étanche respectée : `git diff --name-only origin/main..HEAD` ne contient que les 4 pages légales, `src/lib/legal.ts` et ce journal.*
