# Journal — Bastion

## Mission M-24 — Pentest impitoyable, attaques simulées (lecture seule)

- **Agent** : Bastion (session Vibe dédiée). Branche : `vibe/bastion-pentest` (base `main` `b37ac8e`, dernier état tiré le 22/11 à 04:44 UTC).
- **PR** : voir inscription MISSIONS.md (brouillon, base `main`, ce fichier journal UNIQUEMENT + inscription MISSIONS.md).
- **Règle absolue tenue** : **aucune requête envoyée à la production** `https://dev-apps-centeryou.vercel.app` ni à aucun service externe réel (Stripe, Supabase, ElevenLabs). Tous les tests ont tourné sur :
  1. une **copie locale** du dépôt (`Centeryou-wt-bastion`), build de production `next start` sur `127.0.0.1:3300` (Next 14.2.35) ;
  2. un **harnais local** (hors dépôt, `/tmp`) qui importe les vraies routes `src/app/api/**` et **simule** ElevenLabs / Stripe / Supabase Auth par un `fetch` stubbé en local — zéro appel externe.
- **Zone tenue** : aucun fichier de code modifié. Livrables : ce rapport + inscription `MISSIONS.md`. Validation de non-régression : `npm ci` ✅ · `npm test` ✅ **543/543** (32 fichiers) · `npm run build` ✅ · scan de secrets CI exécuté localement ✅ (exit 0).
- **Références lues avant d'attaquer** : `AGENTS.md`, `docs/MISSIONS.md` (M-24), `journal/sentinelle.md` (M-03, attaques n°1–15), `journal/bouclier.md` (M-08), `journal/verrou.md` (M-13) — leurs correctifs ont été **re-testés un par un** (section « Ce qui tient »).

---

## 1. Méthode

Pour chaque attaque : scénario en une phrase → reproduction exacte (commande/harnais + réponse observée) → verdict (réussie/bloquée et pourquoi) → gravité 🔴🟠🟡🟢 → recommandation de correctif (non codée ici). Les faux positifs sont écartés explicitement.

Couverture : injection par données saisies (titres, ICS, noms, catégories, restaurations) · empoisonnement localStorage · contournement rate-limits/quotas/sessions · paiement (signature webhook, URL de retour) · secrets (code, historique git complet, bundle buildé, CI) · en-têtes/CSP · statut réel des CVE connues de `next@14.2.35` / `vitest@2.1.9` vérifié aujourd'hui (npm audit + advisories GitHub, 22/11/2026).

---

## 2. Constats — attaques RÉUSSIES (🔴🟠)

### 🔴 R1 — Forge « Premium » côté client via localStorage (bypass du freemium + synchro avec customerId forgé)

- **Scénario** : un utilisateur édite `localStorage['centeryou-v1']` et s'attribue `subscription.status = "active"` — l'app le croit Premium sans payer.
- **Reproduction** (harnais local, vrai `store.ts` + vrai `merge`) : `centeryou-v1` = `{state:{…, subscription:{status:'active', plan:'premium', customerId:'cus_FORGED', …}, voiceQuota:{month:'2026-11', used:0}}, version:2}` puis `useStore.persist.rehydrate()` → `merge` (`store.ts:173-186`) fait `{...defaultSubscription, ...p.subscription}` **sans aucune validation** → `isPremiumActive(state.subscription)` = **`true`** ; `voiceQuota` remis à 0 (essais gratuits infinis). Conséquence : `voice.ts speak()` appelle `/api/voix` en mode « premium illimité », et `sync.ts pushStripe/pullSync` envoient/lisent `/api/sync` avec le `customerId` forgé.
- **Verdict** : **attaque réussie côté client**. Le serveur borne néanmoins : `/api/voix` n'a aucune notion d'abonnement (limite réelle = 300 car/jour/profil + 3 000 car/jour/IP, voir B1), et `/api/sync` bloque le `customerId` forgé **si Stripe est configuré** (vérif e-mail, voir R2) — mais **pas si seul Supabase est configuré**.
- **Gravité** : 🔴 (modèle économique cassé : les « 3 essais/mois » Découverte n'existent que côté client ; et la synchro multi-appareils s'active avec n'importe quel `cus_…`).
- **Correctif recommandé** : sanifier `subscription` et `voiceQuota` dans `merge` (whitelist `status`/`plan`, `currentPeriodEnd` ISO valide borné, `used` entier ≥ 0) comme `sanitizeSettings` ; et côté serveur, faire de la session Supabase (déjà prioritaire pour le quota) la **seule** source de « premium » sur `/api/voix` (vérifier le statut Stripe du customer de la session), le localStorage ne servant que de cache.

### 🔴 R2 — IDOR sur `/api/sync` quand Supabase est configuré SANS Stripe : tout utilisateur authentifié lit/écrit le snapshot de N'IMPORTE quel `customerId`

- **Scénario** : Alice (session valide) connaît/devine le `cus_…` de Bob et récupère ou écrase sa sauvegarde multi-appareils.
- **Reproduction** (harnais local, vraie route `api/sync/route.ts`, Supabase Auth simulé en local sur `127.0.0.1:3200`, `STRIPE_SECRET_KEY` vide) :
  - `POST /api/sync` `{customerId:'cus_VICTIM', …, state:{events:[{title:'POISON',…}]}}` avec `Authorization: Bearer token-alice` → **HTTP 200 `{"ok":true}`** ;
  - `GET /api/sync?customerId=cus_VICTIM` avec `Bearer token-bob` (autre utilisateur) → **HTTP 200** avec le snapshot contenant `POISON`.
  - Avec Stripe configuré (même harnais, clé simulée) : `GET cus_VICTIM` en Bearer alice → **403** « Ce compte ne correspond pas à ta session » ✅.
- **Pourquoi** : `authorize()` (`api/sync/route.ts:100-141`) ne vérifie que la session existe quand Supabase est ON ; la correspondance e-mail↔customerId n'est vérifiée **que si Stripe est configuré**. En prod finale (Supabase + Stripe) c'est bloqué ; dans la fenêtre de transition « Supabase seul », c'est ouvert à tout compte authentifié.
- **Verdict** : **attaque réussie dans la configuration Supabase-sans-Stripe** ; bloquée quand Stripe est ON.
- **Gravité** : 🔴 (lecture/écrasement de toutes les données d'un autre compte Premium, si l'attaquant obtient un `cus_…`).
- **Correctif recommandé** : lier `customerId` ↔ utilisateur côté serveur dès que Supabase est configuré (table de mapping `comptes` ou métadonnée Supabase), et non seulement via l'e-mail Stripe ; refuser proprement `/api/sync` tant que la propriété ne peut pas être prouvée.

### 🔴 R3 — `/api/portal` sans vérification de propriété : un `cus_…` connu suffit à obtenir l'URL du portail client Stripe de la victime

- **Scénario** : quiconque connaît un `customerId` Stripe (`cus_…` — présent dans le localStorage du client, les réponses API, les logs) demande un portail de facturation pour ce compte et reçoit une URL « magique » `billing.stripe.com/session/…` qui ouvre la gestion de l'abonnement (changement de moyen de paiement, annulation) **sans autre authentification** (comportement par défaut du portail Stripe tant que « exiger une authentification » n'est pas activé côté Stripe).
- **Reproduction** (harnais local, vraie route `api/portal/route.ts`, Stripe simulé) : `POST /api/portal {"customerId":"cus_VICTIM"}` **sans aucune session** → **HTTP 200 `{"url":"https://billing.stripe.com/session/VICTIM_PORTAL_URL"}`**, appel Stripe simulé `POST /v1/billing_portal/sessions body=customer=cus_VICTIM…`. Aucune vérification de session/e-mail (contrairement à `/api/sync`).
- **Verdict** : **attaque réussie** (capacité « bearer » sur le compte Stripe de la victime, conditionnée à la connaissance du `cus_…`, qui n'est pas censé être secret côté client puisqu'il est persisté en clair dans le navigateur).
- **Gravité** : 🔴 si l'id fuite ; 🟠 sinon (id aléatoire 14+ caractères, rate-limit 10/h/IP).
- **Correctif recommandé** : exiger sur `/api/portal` la même preuve de propriété que `/api/sync` (session Supabase valide + e-mail = e-mail du customer Stripe → 403 sinon), et/ou activer « Require authentication » dans les réglages du portail Stripe.

### 🟠 O1 — Rate-limits et quotas voix contournables par rotation de `x-forwarded-for` quand aucun proxy de confiance n'est devant (local, self-hosted, accès direct à l'origine)

- **Scénario** : l'attaquant fait tourner l'en-tête `x-forwarded-for` (dernier élément retenu par `clientIp`, `rate-limit.ts:24-40` et `voix/route.ts:76-90`) pour obtenir un bucket neuf à chaque requête.
- **Reproduction** (serveur local prod, sans proxy) : 25× `POST /api/voix` avec `x-forwarded-for: 198.18.0.i` différents → **25 réponses, aucun 429** (même IP fixe → 429 dès la 21ᵉ, N5). Harnais voix (ElevenLabs simulé) : rotation conjointe XFF + `x-centeryou-user` → **25/25 requêtes de 300 car passées = 7 500 caractères consommés, 25 appels ElevenLabs** (sans rotation : la 11ᵉ → 429 `quota-ip` 3 000 car). Idem sur `/api/checkout` : 15 XFF différents → 15× 200, même IP → 429 dès la 11ᵉ.
- **Verdict** : **réussie sans proxy de confiance ; bloquée derrière Vercel** (l'edge ajoute l'IP réelle en dernier élément de XFF, donc le bucket reste l'IP réelle — confirmé par le test de rotation de prénoms même IP : plafond 3 000 car/jour atteint). **M-09 (Cloudflare) doit impérativement utiliser `CF-Connecting-IP`** et ignorer le XFF entrant.
- **Gravité** : 🟠 (self-hosted / accès direct à l'origine : voix et création de sessions Stripe sans limite ; sur Vercel : borné).
- **Correctif recommandé** : IP fournie par la plateforme (Vercel/CF), rejet des requêtes dont le XFF entrant n'est pas vide côté edge, store persistant (Redis/KV) pour les quotas au lieu de la mémoire par instance.

### 🟠 O2 — Le garde-fou 413 du middleware ne voit que `Content-Length` : un corps « chunked » est lu ENTIER par la route avant son plafond

- **Scénario** : envoi d'un corps énorme en `Transfer-Encoding: chunked` (pas de Content-Length) → `middleware.ts:81-88` ne déclenche pas, la route fait `await req.text()` puis seulement vérifie la taille.
- **Reproduction** : `POST /api/voix` avec 3 Mo en chunked → lu intégralement (0,15 s en local), réponse 503/413 selon la config ; avec `Content-Length: 3145739` → **413 immédiat par le middleware** ✅. En self-hosted, N requêtes chunked de plusieurs centaines de Mo = pression mémoire par instance.
- **Verdict** : **partiellement réussie** (lecture complète avant refus ; sur Vercel l'edge limite le corps ~4,5 Mo, donc mitigé en prod hébergée).
- **Gravité** : 🟠 en self-hosted, 🟡 sur Vercel.
- **Correctif recommandé** : lire le corps en stream avec compteur d'octets et couper à la première dépassement (plafond route), ou poser un plafond de taille de corps au niveau du proxy/edge.

### 🟠 O3 — `/api/subscription/status` : oracle non authentifié sur n'importe quel `customerId` / `sessionId`

- **Scénario** : un attaquant sonde des `cus_…` et apprend le statut d'abonnement (premium, fin de période) de la cible — donnée personnelle (RGPD) — et fait porter le coût d'appel à l'API Stripe par le serveur.
- **Reproduction** (harnais, Stripe simulé) : `POST /api/subscription/status {"customerId":"cus_ALICE"}` **sans session** → **HTTP 200** `{"snapshot":{"status":"active","plan":"premium","customerId":"cus_ALICE",…},"configured":true}`.
- **Verdict** : **réussie** (aucune auth sur cette route ; rate-limit 30/h/IP seulement, contournable per O1).
- **Gravité** : 🟠 (fuite d'information + proxy Stripe gratuit).
- **Correctif recommandé** : exiger une session Supabase dont l'e-mail correspond au customer (comme `/api/sync`), ou limiter la route au `sessionId` de retour Checkout (cs_…) à usage unique.

### 🟠 O4 — `next@14.2.35` : vulnérabilités connues — statut réel vérifié le 22/11/2026

- `npm audit --omit=dev` : **1 critical (next ≤ 16.3.0-preview.10, longue liste de GHSA) + 1 high (postcss ≤ 8.5.22 embarqué)** ; `npm audit` complet ajoute **3 critical/… dev-only via vitest 2.1.9 → tinypool** (fix : vitest 5.1.1, jamais déployé — grep du bundle propre).
- Vérifications précises aujourd'hui :
  - **CVE-2025-29927** (bypass middleware via `x-middleware-subrequest`) : corrigé en 14.2.25 → **14.2.35 non concerné, re-testé** : `POST /api/voix` 3 Mo + `x-middleware-subrequest: middleware` → toujours **413** ✅.
  - **GHSA-2xp9-vwfh-vxw4 / GHSA-2464-fhr4-w9xw** (RCE Image Optimization AVIF/SVG, CVSS 9.5) : **self-hosted uniquement** — « Applications on Vercel's managed platform were not affected » ; l'app n'utilise de toute façon que des images locales. ⚠️ toute sortie self-hosted (M-09 Cloudflare Pages/Workers sert le build, l'optimizer d'images resterait Vercel…) — à re-vérifier au moment de M-09.
  - **GHSA-ffhc-5mcf-pf4q / CVE-2026-44581** (XSS via nonce CSP en App Router derrière un cache partagé) : plage vulnérable **13.4.0 → < 15.5.16, donc 14.2.35 est dedans**. Vecteur neutralisé ici : le nonce est généré serveur (`crypto.getRandomValues`) et le middleware **écrase** les en-têtes entrants `x-nonce` / `Content-Security-Policy` (testé : réponse CSP = nonce serveur propre, en-tête attaquant ignoré ✅). Mais la version reste dans la plage vulnérable → **monter à ≥ 16.4.6** (fix npm `audit fix --force`) dès que possible, et purger les en-têtes CSP entrants côté edge (workaround officiel).
  - Cache poisoning / SSRF Server Actions / DoS : l'app n'utilise **pas** de Server Actions, toutes les routes sont `force-dynamic` + `no-store` → surfaces largement éteintes.
- **Verdict** : pas de RCE atteignable sur le déploiement Vercel actuel ; 🟠 dette connue avec correctif identifié (montée majeure next, déjà planifiée post-lancement).
- **Correctif recommandé** : montée `next@16.4.6` (M-09 peut l'embarquer), `npm audit --omit=dev` **bloquant** sur critical en CI (aujourd'hui seulement informatif).

### 🟠 O5 — Restauration de sauvegarde : aucun plafond de taille de fichier ni de longueur de champs

- **Scénario** : un fichier JSON de 100 Mo importé comme sauvegarde est lu en mémoire (`readBackupFile`, `backup.ts:80-92`, aucun `file.size` check — Sentinelle n°13 toujours vrai), et `sanitizeEvents`/`sanitizeSettings` n'imposent **aucune longueur max** aux titres/prénoms.
- **Reproduction** (harnais) : `parseBackup` sur un JSON de 600 Ko avec un titre de 500 000 caractères et un prénom de 100 000 caractères → **accepté tel quel** (events gardés = 1, title len = 500000, prenom len = 100000).
- **Verdict** : réussie en DoS **de soi-même** (propre navigateur uniquement — pas d'impact cross-user) ; pas de XSS (React échappe).
- **Gravité** : 🟠 (gel mémoire de l'onglet, qu'un fichier piégé partagé à quelqu'un peut déclencher).
- **Correctif recommandé** : plafond `file.size` (ex. 5 Mo) dans `readBackupFile` + `maxLength` (140/30) appliqué aussi dans `sanitizeEvents`/`sanitizeTasks`/`sanitizeSettings`.

---

## 3. Constats — attaques BLOQUÉES (vérifiées, avec preuves)

### ✅ B1 — Quotas voix premium : rotation de prénoms bornée par le plafond IP (Vercel)

Harnais voix (ElevenLabs simulé) : 12 prénoms différents × 300 car depuis **une même IP** → 10× 200 puis **429 `quota-ip` limit 3000** dès la 11ᵉ ✅. Rate-limit 20/h même IP → 429 à la 21ᵉ requête ✅ (N5). Session Supabase prioritaire : même Bearer + prénoms Alice puis Bob → 2ᵉ requête **429 quota** (clé `session:<userId>`) ✅. Plafonds corps/texte/champs : 1001 car → 413, corps 20 Ko → 413, champ `admin:true` → 400, texte vide → 400, caractères de contrôle dans `x-centeryou-user` nettoyés ✅. **Le correctif Verrou tient.** Note : `/api/voix` ne vérifie jamais le statut d'abonnement — la seule vraie barrière serveur est le quota caractères (voir R1).

### ✅ B2 — Webhook Stripe : signature, anti-rejeu, tailles

Harnais webhook (secret local simulé, HMAC calculé en local) : signature valide → 200 ; **rejeu à ts−400 s → 400** ; signature fausse → 400 ; sans signature → 400 ; corps 300 Ko → **413** ; événement sans type → 400 ✅. `timingSafeEqual` + comparaison de longueurs ✅. Aucun appel Stripe depuis un événement non signé.

### ✅ B3 — URL de retour de paiement : Host forgé rejeté avant tout appel Stripe

Harnais checkout (Stripe simulé, on capture le `success_url` réellement envoyé) : `Host: evil-attacker.example` → **400, 0 appel Stripe** ; `dev-apps-centeryou.vercel.app.evil.com` → 400 ; `…vercel.app.` (point final) → 400 ; casse → accepté (inoffensif, host en minuscules) ; `…vercel.app:8080` → accepté mais `success_url` reprend le port (redirection cassée, pas exploitable). Hôtes prod/localhost → `success_url` correcte ✅. **Le correctif Verrou tient.** (Sans clé Stripe configurée, la route renvoie 503 avant le check Host — fail-closed, OK.)

### ✅ B4 — Sessions forgées / e-mail d'autrui

`/api/sync` sans Bearer (Supabase ON) → **401** ; Bearer invalide → 401 ; Bearer alice sur `cus_VICTIM` (Stripe ON, e-mails différents) → **403** ✅. `/api/compte/suppression` : sans session → **401** (aucun DELETE) ; `{email:'victim@example.com'}` en session alice → **403** ; tentative d'injection PostgREST dans l'e-mail du corps → 403 (et le DELETE utilise l'e-mail de session encodé, jamais celui du corps) ✅. **Bouclier tient.** `customerId` invalide (`cus_x' OR 1=1--`) → 400 ; champ inattendu → 400 ; `updatedAt=1e18` → 400 ✅.

### ✅ B5 — XSS par données saisies : RIEN ne passe

Grep complet : **0** `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` hors les deux constantes signées du layout (`themeInitScript`, `themeStyle` — pas de données utilisateur). Harnais ICS malveillant (`SUMMARY:<script>alert(document.domain)</script>`, CRLF injecté, `RRULE COUNT=999999999`, VALARM imbriqué, date invalide `20261340T2500Z`, titre 5000 car) → titre conservé comme **texte** (échappé par React au rendu), CRLF échappé à la réexport ICS (`\n`), occurrences plafonnées à **366**, date invalide refusée, VALARM ignoré, titre tronqué à 140 ✅. Sauvegarde/backup/localStorage avec `<img onerror>` en prénom/titre → chaîne conservée, jamais exécutée ✅. CSP `script-src 'self' 'nonce-…'` par requête servie sur toutes les pages et routes API ✅ → un script injecté serait bloqué même en cas de fuite React.

### ✅ B6 — Empoisonnement localStorage : le merge tient pour la structure

JSON corrompu → copie `centeryou-v1__corrupt-<ts>` + état neuf, aucun crash ✅ ; `state` non-objet ou `version: 99` → merge tolérant ✅ ; 2000 événements → chargés sans erreur ✅ ; événements malformés écartés item par item ✅. **Mais** : `subscription`/`voiceQuota` non sanitisés → voir 🔴 R1 ; dates/heures laxistes → voir 🟡 J1.

### ✅ B7 — En-têtes et middleware

Réponses locales (prod build) : CSP nonce ✅, `X-Content-Type-Options: nosniff` ✅, `X-Frame-Options: DENY` ✅, `Referrer-Policy` ✅, `Permissions-Policy: microphone=(self), camera=(), geolocation=()` ✅, pas de `X-Powered-By` ✅ ; HSTS absent en local mais présent en prod Vercel (vérifié par Sentinelle en HTTP) — à re-vérifier sur Cloudflare (M-09). Middleware : 413 si `Content-Length > 2 Mo` ✅, méthodes non permises → 405 ✅, nonce entrant écrasé ✅, `x-middleware-subrequest` sans effet sur 14.2.35 ✅ (CVE-2025-29927 patché). Manquants (🟡) : `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`, `frame-src` (couvert par `frame-ancestors 'none'`), `style-src 'unsafe-inline'` (justifié par les variables CSS, à surveiller).

### ✅ B8 — Secrets : rien nulle part

- Code actuel : grep de 12 motifs (sk_live/test, whsec, JWT eyJ…, AIza…, ghp_, glpat-, clés privées, `xi-api-key:` avec valeur) sur tout l'arbre hors node_modules → **0 occurrence** (seules des valeurs factices dans `docs/journal/secure.md` et les tests). Scan CI `scan-secrets.sh` exécuté localement → exit 0 ✅ (bloquant en CI).
- **Historique git complet** (`git rev-list --all` + `git grep` sur chaque révision) : aucune clé réelle jamais commitée — l'ancienne fuite ElevenLabs (Alpha/Céleste) concernait le mécanisme `env:` NEXT_PUBLIC, la valeur n'a jamais été dans git ✅.
- **Bundle buildé** : `.next/static` → 0 occurrence de clé/URL sensible ; contrôle positif : `xi-api-key` présent uniquement dans `.next/server/app/api/voix/route.js` ✅.
- Fichiers trackés : seul `.env.local.example` (template sans valeur) ✅. Clés serveur lues uniquement via `process.env` dans les routes/serveur ✅.

### ✅ B9 — Supabase (schéma) et desktop

`docs/supabase/schema.sql` : RLS activée sur `profiles` et `backups`, policies `auth.uid() = id/user_id` sur select/insert/update/delete ✅ (lecture croisée user A → user B impossible côté base). Electron (`apps/centeryou-desktop/main.js`) : `sandbox`, `contextIsolation`, `nodeIntegration: false`, `will-attach-webview` bloqué, navigation restreinte à l'origine prod (reste ouvert dans le navigateur externe), `certificate-error` → refus, micro autorisé sans caméra sur l'origine prod uniquement ✅.

---

## 4. 🟡 À surveiller

- **J1 — Dates/heures laxistes dans `sanitizeEvents`** : les regex `^\d{4}-\d{2}-\d{2}$` / `^\d{2}:\d{2}$` acceptent `9999-99-99`, `2026-13-45`, `99:99`, `end < start` (harnais : 3/3 conservés). Pas de crash (le constructeur `Date` normalise, `Intl` affiche une date « roulée » ex. « jeu. 7 juin » pour 9999-99-99), mais affichages absurdes et hauteurs négatives possibles. Correctif : valider la date réelle (comme `isValidISODate` du parseur) et `end > start` dans les sanitizers.
- **J2 — Pas de plafond de nombre d'événements** dans le merge (2000 OK ; la limite réelle est le quota localStorage ~5 Mo). Correctif : plafond haut (ex. 10 000) + message FR.
- **J3 — `?rappel=fait:<clé>` consommé depuis l'URL** (`rappels-service.ts consumeRappelParam`) : un lien piégé peut marquer des rappels « faits » chez qui l'ouvre (état local uniquement). Correctif : ignorer ou confirmer.
- **J4 — `detectSessionInUrl: true`** : le jeton Supabase peut transiter dans le hash d'URL (historique navigateur, en-têtes Referer vers des ressources externes — aucune ressource externe n'est chargée, donc risque faible).
- **J5 — Synchro Premium en mémoire par instance si KV non configuré** (`sync-store.ts`) : perte des snapshots au redémarrage d'instance en prod tant que `KV_REST_API_URL/TOKEN` ne sont pas posés → à brancher avec M-09.
- **J6 — Webhook `checkout.session.completed` avec `customer` seul (sans `subscription`)** met le cache serveur en « active » — signé uniquement, acceptable, à documenter.

---

## 5. Tableau récapitulatif

| # | Attaque | Verdict | Gravité | Correctif recommandé (non codé) |
|---|---------|---------|---------|--------------------------------|
| R1 | Forge Premium via localStorage (`subscription`/`voiceQuota` non sanitisés dans `merge`) | 🔴 réussie (client) | 🔴 | Sanifier `subscription`/`voiceQuota` dans `merge` ; statut premium vérifié côté serveur sur `/api/voix` |
| R2 | IDOR `/api/sync` si Supabase ON et Stripe OFF (alice↔`cus_VICTIM` : 200/200) | 🔴 réussie (config transition) | 🔴 | Mapping customerId↔user côté serveur même sans Stripe |
| R3 | `/api/portal` sans auth : URL portail Stripe pour tout `cus_…` connu | 🔴 réussie | 🔴 | Session + e-mail = customer (comme `/api/sync`) et/ou portail Stripe « require auth » |
| O1 | Rotation `x-forwarded-for` → rate-limits/quotas voix illimités sans proxy de confiance (25×300 car OK) | 🟠 réussie en self-hosted, bloquée sur Vercel | 🟠 | IP plateforme (CF-Connecting-IP), rejeter XFF entrant, store persistant |
| O2 | Corps chunked lu en entier avant le 413 (middleware ne voit que Content-Length) | 🟠 partiel (self-hosted) | 🟠 | Lecture streamée plafonnée / plafond proxy |
| O3 | `/api/subscription/status` oracle sans auth (statut premium de tout `cus_…`) | 🟠 réussie | 🟠 | Exiger session + e-mail correspondant |
| O4 | `next@14.2.35` dans la plage de CVE-2026-44581 (nonce CSP) ; CVE-2025-29927 patché (testé) ; RCE image = self-hosted only | 🟠 dette connue, non exploitable tel que déployé | 🟠 | Monter `next@16.4.6` (M-09), audit prod bloquant en CI |
| O5 | Restauration : pas de plafond de fichier (100 Mo lus) ni de longueur de titres/prénoms | 🟠 réussie (self-DoS) | 🟠 | Plafond `file.size` ~5 Mo + maxLength dans les sanitizers |
| B1 | Rotation prénoms quota voix / rate-limits / session prioritaire | ✅ bloquée (429 quota-ip à 3 000 car, 429 à 20/h, 429 session) | 🟢 | — (tenir) |
| B2 | Webhook : signature fausse/absente, rejeu ±300 s, 300 Ko, sans type | ✅ bloquée (400/400/400/413/400) | 🟢 | — |
| B3 | Host forgé / suffixe / point final sur checkout & portal | ✅ bloquée (400, 0 appel Stripe) | 🟢 | — |
| B4 | Session forgée, e-mail d'autrui, injection query suppression | ✅ bloquée (401/403/403) | 🟢 | — |
| B5 | XSS titres, ICS, backup, prénom, CRLF ICS, RRULE géant | ✅ bloquée (React + CSP nonce + tronçatures) | 🟢 | — |
| B6 | localStorage corrompu / structure cassée / 2000 événements | ✅ toléré (sauf R1/J1) | 🟢 | — |
| B7 | En-têtes, 413 CL, 405, nonce écrasé, CVE-2025-29927 | ✅ OK (HSTS prod Vercel à re-vérifier sur Cloudflare) | 🟢 | COOP/CORP en plus |
| B8 | Secrets : code, historique git complet, bundle, CI | ✅ 0 fuite | 🟢 | — (scan CI bloquant en place) |
| B9 | RLS Supabase, coquille Electron | ✅ conforme | 🟢 | — |
| J1–J6 | Dates laxistes, pas de plafond de count, `?rappel=`, token en URL, KV manquant, sémantique webhook | 🟡 à surveiller | 🟡 | voir §4 |

---

## 6. Score global de sécurité : **2,5 / 5**

Sans complaisance : le socle est défendu là où Vercel porte (aucun secret exposé — prouvé sur code + historique + bundle, CSP nonce, webhook signé anti-rejeu, Host validé, validations d'entrées, rate-limits effectifs derrière l'edge, RLS Supabase correcte, Electron verrouillée, 543/543 tests verts). Mais trois trous réels tombent aujourd'hui : **R3** (portail Stripe en capacité bearer sur un `cus_…`), **R2** (IDOR `/api/sync` dans la config Supabase-sans-Stripe), **R1** (Premium forgé en localStorage + freemium purement client) — plus les contournements XFF/chunked qui deviendront réels en self-hosted (M-09 Cloudflare devra les tuer à la racine). Tant que l'app reste sur Vercel avec Supabase **et** Stripe configurés, l'exploitabilité réelle de R2/R3 reste conditionnée à la fuite d'un `cus_…` ; R1 casse le modèle économique dès maintenant. 2,5/5 — pas de 5/5 avec des 🔴 ouverts.

---

*Rapport rédigé en lecture seule par Bastion, le 2026-11-22 (base main `b37ac8e`). Aucun fichier de code modifié : ce journal est l'unique ajout de code, plus l'inscription MISSIONS.md. Branche `vibe/bastion-pentest`, PR brouillon base `main`.*
