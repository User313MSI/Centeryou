# Journal — Huissier

## Mission M-25 — Audit juridique strict avant mise en vente (lecture seule)

- **Agent** : Huissier (session dédiée). Branche : `vibe/huissier-juridique` (base `origin/main` = `b37ac8e`, dernier état tiré le 22/11/2026 ~04:30 UTC).
- **PR** : voir « Étapes » en fin de fichier (brouillon, base `main`, ce journal + l'inscription MISSIONS.md uniquement).
- **Périmètre inspecté** : produit = app française de planning avec voix, gratuite aujourd'hui, abonnement Premium **4,99 €/mois TTC dès le 1/01/2027**, marché UE, hébergement Vercel (migration Cloudflare prévue, M-09), base de données Supabase à venir, paiements Stripe. Zone : **aucun fichier de code modifié** — lecture seule de `apps/centeryou/` (pages légales `/legal`, `/confidentialite`, `/cgu`, `/contact`, `/offres`, `/presse`, `/inscription` + composants compte/abonnement/auth ; `src/lib/legal.ts`, `plans.ts`, `billing.ts`, `subscription.ts`, `store.ts`, `voice.ts`, `sync.ts`, `auth-store.ts`, `supabase.ts`, `safe-storage.ts` ; routes `src/app/api/**` ; `src/lib/server/**` ; `src/middleware.ts`, `next.config.mjs`, `public/sw.js`, `public/manifest.webmanifest`, `.env.local.example`, `docs/paiement-stripe.md`, `docs/INSTALL-SUPABASE.md`, `docs/supabase/schema.sql`) + vérifications publiques factuelles (DNS, registres de marques, liste EU-US DPF, ToS Vercel, textes sur Légifrance/CNIL/economie.gouv.fr). Journal de Coffre (M-14) relu en entier : ses constats sont **re-vérifiés ici un par un contre le code**, pas pris pour argent comptant.
- **Légende des verdicts** : ✅ conforme · 🔴 à corriger **avant le 1/01/2027** · 🟠 à surveiller / traiter dans le premier mois.
- **Gravités** : 🔴 bloque la vente (obligation légale non satisfaite ou promesse écrite non tenue) · 🟠 risque juridique réel à traiter vite · 🟡 amélioration.

---

## 0. Résumé exécutif

Les pages légales v2.0 livrées par M-14 sont **globalement bien écrites et souvent vraies** (zéro traceur confirmé, inventaire local honnête, prix unique depuis `plans.ts`, webhook signé) — je le reconnais sans réserve. Mais **elles ne sont pas encore conformes à la vente** : l'éditeur n'est pas identifiable, le contact publié est un domaine qui n'existe pas, la suppression de compte **ne supprime pas les données serveur** alors que les textes le promettent, l'information précontractuelle et la rétractation sont absentes du parcours d'achat, aucun médiateur n'est désigné, la mention « voix premium illimitée » est contredite par le code, aucune facture n'est envoyée, la TVA UE n'est pas positionnée, aucun garde-fou mineur, et la marque « Centeryou » n'est enregistrée nulle part. **Avis final : NON, pas prêt à vendre au 1/01/2027 en l'état — OUI à condition de réaliser la liste « indispensables » ci-dessous (section 9), qui est courte et réaliste.**

---

## 1. Données personnelles (RGPD, ePrivacy)

### 1.1 Inventaire des données — où elles sont réellement
**Règle** : RGPD art. 13 (information), art. 5 (minimisation), art. 82 loi Informatique et Libertés (traceurs/localStorage : consentement sauf « strictement nécessaire »).
**Constat (code)** : tout le stockage local est sous clés `centeryou-*` + `sb-<projet>-auth-token` (session Supabase) + `sessionStorage` geste film (`store.ts`, `safe-storage.ts`, `supabase.ts`, `rappels.ts`, `sync.ts`). Données : événements, tâches, réglages **dont le prénom**, `deviceId`, statut d'abonnement, quota voix, méta de synchro, tampon rappels, copie de secours en cas de corruption. Aucun cookie (`document.cookie` : 0 occurrence dans `src/` et `public/`), aucune dépendance d'analytics/ads (deps = next, react, zustand, @supabase/supabase-js, lucide-react uniquement), CSP `script-src 'self' 'nonce-…'`, `connect-src 'self'` + origine Supabase uniquement (`middleware.ts:42-58`), service worker same-origin uniquement (`public/sw.js:47`), aucune image/font/script externe. Le stockage local est **strictement nécessaire au fonctionnement** → exemption art. 82 correctement invoquée, et la politique le dit honnêtement (§5 : « stockage local strictement nécessaire… pas de bandeau »).
**Verdict** : ✅ conforme. La promesse « 100 % local par défaut » est tenue par le code.

### 1.2 Ce qui quitte l'appareil, à qui, et les transferts hors UE
**Règle** : RGPD art. 13/14 (destinataires), art. 44-49 (transferts hors UE : décision d'adéquation, DPF, ou clauses contractuelles types + mesures supplémentaires), art. 28 (DPA sous-traitants).
**Constat (code)** : les seuls flux initiés par l'app sont `/api/*` (même origine, Vercel), ElevenLabs via `/api/voix` (serveur uniquement, clé `xi-api-key` jamais côté client — confirmé par grep), Stripe via routes serveur, Vercel KV (`centeryou:sync:<customerId>`), Supabase (navigateur, uniquement si compte créé) ; la reconnaissance vocale du navigateur (Chrome/Edge) peut traiter l'audio côté fabricant — **divulgué noir sur blanc dans la politique §3**, ce qui est honnête et conforme.
**Vérifications publiques (méthode citée)** : liste officielle EU-US Data Privacy Framework (dataprivacyframework.gov, participant search, 22/11/2026) + annonces officielles des éditeurs :

| Sous-traitant | Rôle | Localisation | Mécanisme de transfert vérifié (22/11/2026) |
|---|---|---|---|
| Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA | hébergement + logs + KV | 🇺🇸 | **DPF certifié « Active »** (participant list, ex. participant/6847 ; annonce officielle Vercel) + DPA Vercel publié (vercel.com/legal/dpa) avec SCC en repli |
| ElevenLabs Inc. | synthèse vocale premium (texte du brief) | 🇺🇸 | **DPF certifié « Active »** (EU-US + UK ext. + Suisse ; elevenlabs.io/eu-us-data-privacy-framework-policy ; participant/9996) |
| Stripe Inc. | paiement, portail, reçus | 🇺🇸 | **DPF certifié « Active »** (participant/10014 ; stripe.com/legal/data-privacy-framework) |
| Supabase Inc. | compte, sauvegarde en ligne | 🇺🇸 entité, **données en région UE** si projet créé à Frankfurt (recommandé par `docs/INSTALL-SUPABASE.md:20`) | **non listé DPF** (recherche 22/11/2026) → s'appuie sur les **SCC Module 2 du DPA Supabase** (supabase.com/legal/dpa) + TIA publié + région UE. Acceptable, mais la politique doit le dire précisément |

**Verdict** : 🟠 conforme dans l'ensemble, **à corriger dans la formulation** : la politique §9 dit « garanties contractuelles types » pour Vercel et ElevenLabs alors qu'ils sont **certifiés DPF** — citer le DPF (plus protecteur) + SCC en repli. Pour Supabase, dire « région UE + SCC ». À noter en vigilance : la décision d'adéquation DPF fait l'objet de recours (contentieux en cours en 2026) → garder les SCC dans les DPA comme filet de sécurité (c'est le cas chez Vercel/Stripe/ElevenLabs/Supabase).
**Action simple** : dans `/confidentialite` §9, remplacer « garanties contractuelles types » par « certifié EU-US Data Privacy Framework (liste officielle, statut Active au 22/11/2026), avec clauses contractuelles types en repli » pour Vercel/ElevenLabs/Stripe ; « hébergé en région UE (Francfort), transferts couverts par les clauses contractuelles types de son DPA » pour Supabase.

### 1.3 Base légale par traitement — manquante dans la politique
**Règle** : RGPD art. 13.1(c) : la **base juridique** de chaque traitement doit être indiquée.
**Constat** : la page `/confidentialite` ne cite aucune base légale (exécution du contrat pour le compte/paiement/synchro ; consentement pour la reconnaissance vocale navigateur non maîtrisable ; intérêt légitime pour les logs de sécurité). Le journal de Coffre affirme que c'était dans sa checklist, mais le **texte livré ne le contient pas**.
**Verdict** : 🔴 à corriger avant le 1/01 (ajouter une colonne « base légale » au tableau §2 et une phrase par flux §3). Action simple : ajouter « base légale : exécution du contrat (ton abonnement/compte) » partout où c'est payant, « consentement » pour le micro navigateur, « intérêt légitime (sécurité) » pour les logs hébergeur.

### 1.4 Suppression de compte — la promesse n'est PAS tenue 🔴
**Règle** : RGPD art. 17 (effacement), art. 13 (information exacte) ; L.121-1/L.121-2 code de la consommation (pratique trompeuse si l'on affirme une suppression qui n'a pas lieu).
**Constat (code, vérifié ligne par ligne)** :
1. `src/app/api/compte/suppression/route.ts:69` ne fait un `DELETE` que sur la table **`comptes`**, or `docs/supabase/schema.sql` ne crée que `profiles` et `backups` (cascade sur `auth.users`) : en production, le DELETE échoue (table inexistante) → réponse 502, et **même s'il réussissait, il ne toucherait ni `profiles` (e-mail + prénom), ni `backups` (sauvegarde complète du planning), ni l'utilisateur `auth.users`**.
2. Le snapshot de synchro `centeryou:sync:<customerId>` dans Vercel KV (`src/lib/server/sync-store.ts:22-24`) **n'est jamais purgé** (ni à la suppression, ni au webhook `customer.subscription.deleted` qui ne fait que mettre à jour un cache, `api/stripe/webhook/route.ts:77-84`).
3. Côté client, `onDeleteAccount` (`src/app/reglages/page.tsx:105-136`) **ignore le résultat du fetch** et affiche toujours « Ton compte et tes données ont été supprimés. » ; `deleteAccount()` (`src/lib/store.ts:140-148`) ne supprime que les clés `centeryou*` — **la session Supabase `sb-*-auth-token` reste**, et `sb.auth.signOut()` n'est jamais appelé.
4. Les textes livrés promettent pourtant l'inverse : CGU art. 7 « La suppression est définitive et irréversible, côté navigateur comme côté serveur », confidentialité §6 « demande d'effacement du compte côté serveur », §8 « la suppression du compte efface aussi l'instantané côté serveur ».
**Verdict** : 🔴 **non conforme, bloque la vente** (promesse écrite non tenue + art. 17 non satisfait pour un service payant avec compte). C'est exactement le point que Coffre avait signalé hors zone (§5 points 1-3 de son journal) — je confirme qu'il est **toujours présent sur main**.
**Action simple (pour un non-juriste)** : refaire le bouton « Supprimer mon compte et mes données » pour qu'il fasse VRAIMENT trois choses : (1) appeler le serveur avec la session, qui efface **la sauvegarde en ligne, le profil et le compte de connexion** chez Supabase (avec la clé service) **et** le snapshot de synchro chez Vercel, puis répond « oui, effacé » ou « non, erreur » ; (2) côté navigateur, se déconnecter et supprimer **aussi** la clé de session Supabase ; (3) n'afficher « supprimé » que si le serveur a répondu oui, sinon afficher « données locales effacées, mais le serveur n'a pas répondu — réessaie ou écris-nous ». Et corriger les CGU/confidentialité si l'effacement serveur échoue.

### 1.5 Droits RGPD praticables — ✅ avec une réserve
**Constat** : export JSON complet en 1 clic (`reglages/page.tsx` « Sauvegarder mes données », `backup.ts` contient bien événements+tâches+réglages+prénom), effacement local en 2 clics, contact + CNIL + délai 1 mois annoncés (`legal.ts`). Parcours praticable en < 30 s depuis Réglages : ✅. **Réserve** : le canal d'exercice des droits passe par `contact@centeryou.fr` — voir §5.3 (domaine inexistant) : tant que l'e-mail ne fonctionne pas, le droit d'accès/effacement n'est pas réellement exerçable.

---

## 2. Droit de la consommation (vente à distance, marché UE)

### 2.1 Information précontractuelle — insuffisante 🔴
**Règle** : art. L.221-5 code de la consommation (directive 2019/2161) : avant la conclusion, le pro fournit de façon lisible : identité et coordonnées, **prix total TTC**, durée du contrat et durée minimale d'engagement, **modalités de résiliation**, existence et conditions du droit de rétractation, modes de règlement des litiges (médiateur), garantie légale de conformité, etc.
**Constat (pages)** : `/offres` présente l'offre gratuite mais **n'affiche aucun prix Premium, aucune durée, aucune info de résiliation ni de rétractation** ; la carte Abonnement (`subscription-card.tsx`) n'affiche que le prix sur le bouton « Passer Premium — 4,99 €/mois » ; le parcours saute ensuite directement sur Stripe Checkout hébergé, qui montre le prix mais aucune de ces infos légales. Les CGU contiennent le prix TTC et l'annulation « à tout moment » (art. 4), mais pas sur le parcours d'achat.
**Verdict** : 🔴 à corriger avant le 1/01.
**Action simple** : ajouter sur `/offres` et sur la carte Abonnement, **avant** le bouton de paiement, un bloc court en clair : « 4,99 €/mois TTC — abonnement sans engagement, renouvelé chaque mois automatiquement — résiliable en un clic à tout moment depuis le portail Stripe (effet à la fin du mois payé) — droit de rétractation de 14 jours (voir ci-dessous) — médiateur : [nom] — éditeur : [identité] ». 

### 2.2 Droit de rétractation d'un service numérique — absent 🔴
**Règle** : art. L.221-28, 13° : pour un contenu/service numérique, le droit de rétractation de 14 jours ne s'applique **que si** le consommateur a donné son **accord préalable exprès** à l'exécution immédiate **et** renoncé expressément à son droit de rétractation (art. L.221-28 + formulaire L.221-30). Sinon, le consommateur garde 14 jours et peut exiger le remboursement intégral.
**Constat** : aucun texte, aucune case à cocher avant le paiement. Le service Premium (voix premium, synchro) est fourni immédiatement après paiement.
**Verdict** : 🔴 à corriger avant le 1/01.
**Action simple** : avant le paiement (page récap ou case Stripe Checkout via `custom_text`), ajouter une case obligatoire : « J demande l'accès immédiat à Centeryou Premium et je renonce à mon droit de rétractation de 14 jours, conformément à l'article L.221-28 13° du code de la consommation. » + expliquer en deux lignes dans les CGU art. 4. Sans cette case, prévoir un remboursement systématique sur demande dans les 14 jours.

### 2.3 Reconduction et résiliation — conforme dans le code, à annoncer 🔴(info)
**Règle** : art. L.215-1 : contrat à durée indéterminée résiliable à tout moment par le consommateur, modalités de résiliation **aussi simples que l'inscription** (bouton de résiliation visible en ligne) ; information claire sur la reconduction tacite.
**Constat (code)** : ✅ la résiliation passe par le portail Stripe en un clic depuis Réglages (`/api/portal`, `subscription-card.tsx`), effet à la fin de la période payée (`cancel_at_period_end` géré, `stripe.ts:snapshotFromSubscription`), données locales conservées, statut resynchronisé depuis Stripe à chaque ouverture. Le renouvellement mensuel est affiché (« Renouvellement le … »). **Mais** cette info n'est pas donnée **avant** l'achat (voir 2.1).
**Verdict** : ✅ mécanique conforme · 🔴 l'information précontractuelle manque (traité en 2.1). Action simple : la ligne « renouvelé automatiquement chaque mois, résiliable en un clic à tout moment » doit apparaître avant le paiement.

### 2.4 « Voix premium illimitée » — contredit par le code 🔴
**Règle** : art. L.121-2 (pratiques trompeuses) : affirmer « illimité » alors qu'un plafond existe est trompeur si le plafond peut être atteint en usage normal.
**Constat (code)** : `plans.ts` feature « Voix premium illimitée (quota serveur) », CGU art. 4 et `/legal` « voix premium illimitée » — mais `src/app/api/voix/route.ts:11` plafonne à **300 caractères/jour par identité** (`DAILY_CHAR_LIMIT`) et **3 000 caractères/jour par IP**, pour **tous** les utilisateurs, y compris Premium (réponse 429 « Quota de voix premium atteint pour aujourd'hui »). Un abonné Premium intensif atteint le plafond.
**Verdict** : 🔴 à corriger avant le 1/01 (promesse commerciale fausse écrite dans CGU/legal/offres).
**Action simple** : au choix — (a) supprimer le plafond pour les abonnés dont l'abonnement est vérifié côté serveur (voir 2.5), et écrire « illimitée » ; ou (b) garder le plafond et écrire partout « voix premium soumise à un quota quotidien raisonnable (300 caractères/jour) ». L'option (b) seule ne suffit pas si le plafond s'applique aussi aux payants sans le dire.

### 2.5 Le « Premium » de la voix n'est pas vérifié côté serveur 🔴 (et la politique est imprécise)
**Règle** : art. L.111-1 (information sur les caractéristiques essentielles) ; RGPD art. 13 (information exacte sur les conditions d'un traitement).
**Constat (code)** : la barrière « 3 essais gratuits/mois » est **uniquement client-side** (`voice.ts:127-139` lit `subscription` et `voiceQuota` dans le localStorage). `/api/voix` n'exige qu'un header `x-centeryou-user` (un prénom, contrôlé par le client) — **aucune vérification Stripe** : n'importe qui peut appeler `/api/voix` et obtenir la voix ElevenLabs (dans la limite des plafonds IP). La voix premium, vendue 4,99 €, est donc servie gratuitement à tout appelant. La politique dit « quand la voix premium est utilisée, le texte passe par /api/voix » sans dire que le serveur ne vérifie pas l'abonnement.
**Verdict** : 🔴 à corriger avant le 1/01 (fuite de la fonctionnalité payante + textes à aligner). Action simple : dans `/api/voix`, exiger un `customerId` valide et vérifier chez Stripe que l'abonnement est actif (comme le fait déjà `/api/sync`), sinon refuser (la voix du navigateur prend le relais, ce qui est déjà prévu).

### 2.6 Garantie légale de conformité — clause « tel quel » abusive 🔴
**Règle** : art. L.224-25-1 et suivants (créés par l'ordonnance n° 2021-1247 du 29/09/2021) : **garantie légale de conformité de 2 ans s'applique aux services numériques fournis à un consommateur** ; les clauses qui l'excluent ou la limitent sont présumées abusives (art. R.212-1) et réputées non écrites face à un consommateur.
**Constat** : CGU art. 5 et `/legal` : « fourni tel quel, sans garantie de disponibilité ni d'absence de bug ».
**Verdict** : 🔴 à corriger avant le 1/01 (la clause ne tient pas face à un consommateur pour les défauts de conformité du service numérique ; elle peut rester pour la perte de données locale imputable à l'utilisateur, qui est déjà couverte par une phrase dédiée).
**Action simple** : ajouter dans les CGU : « Conformément à la loi, Centeryou bénéficie de la garantie légale de conformité de 2 ans pour tout défaut de conformité du service (art. L.224-25-1 et s. du code de la consommation) ; la clause « tel quel » ne s'applique pas aux consommateurs pour ce point. »

### 2.7 Médiateur de la consommation — non désigné 🔴
**Règle** : art. L.612-1 et R.616-1 code de la consommation : le professionnel désigne un médiateur de la consommation (liste officielle, economie.gouv.fr) et communique son nom au consommateur (dans les CGV et/ou sur le site) ; le consommateur y a recours gratuitement.
**Constat** : aucun médiateur nommé dans `/cgu`, `/legal`, `/contact`, `/offres` (grep « médiateur » : 0 hit hors docs).
**Verdict** : 🔴 à corriger avant le 1/01. Action simple : choisir un médiateur agréé compétent pour le secteur (ex. via la liste officielle de la médiation de la consommation) et écrire dans les CGU art. 9 + page `/legal` : « Médiateur de la consommation : [nom], [site] — saisine gratuite après échec de la démarche amiable. »

### 2.8 Mineurs — aucun garde-fou 🔴
**Règle** : RGPD art. 8 : service de la société de l'information offert directement à un enfant < 15 ans (âge français) → consentement du titulaire de l'autorité parentale pour le traitement de ses données (compte en ligne : e-mail + mot de passe + prénom). Code civil : un mineur ne peut valablement souscrire seul un abonnement payant (contrat annulable, remboursement exigible).
**Constat** : aucune vérification d'âge ni case d'autorisation à l'inscription (`auth-dialog.tsx` : prénom + e-mail + mot de passe 6 car. min, aucune case), ni avant le paiement Stripe. L'app de planning peut être utilisée par un mineur sans aucun garde-fou.
**Verdict** : 🔴 à corriger avant le 1/01 (coûte peu). Action simple : (1) case obligatoire à la création du compte en ligne et avant le paiement : « J'ai 15 ans ou plus, ou j'ai l'autorisation de mon responsable légal » ; (2) clause CGU : service destiné aux 15 ans et + (ou avec accord parental) ; (3) pour le mode 100 % local sans compte, aucun traitement côté serveur n'a lieu, donc pas de consentement requis — le dire dans la politique (c'est déjà implicite).

---

## 3. Conformité des textes v2.0 au comportement réel du code (promesse par promesse)

| Promesse écrite (page) | Vérification dans le code | Verdict |
|---|---|---|
| « Aucun cookie, aucun traceur, pas de bandeau » (`/confidentialite` §5) | `document.cookie` = 0 ; deps sans analytics ; CSP stricte ; SW same-origin | ✅ tenu |
| « Tout reste dans le navigateur par défaut » (§2, `/legal`) | `store.ts` localStorage `centeryou-v1` ; aucun envoi sans action | ✅ tenu |
| « Le texte du brief passe par /api/voix puis ElevenLabs, clé côté serveur » (§3) | `api/voix/route.ts:278-298` ; clé en env serveur ; grep bundle = 0 | ✅ tenu |
| « Le prénom sert au quota 300 car/jour, mémoire vive, reset chaque nuit » (§3) | `route.ts:11,35,239-246` : Map en mémoire, `todayKey()`, reset jour | ✅ tenu (mais voir 2.5 : le serveur ne vérifie pas l'abonnement) |
| « Compte Supabase dans l'UE » (§3, §9) | région choisie par l'opérateur (Frankfurt recommandé, `INSTALL-SUPABASE.md:20`) | ✅ tenu **si** le projet est bien créé en région UE — à vérifier à l'activation |
| « Paiement exclusivement par Stripe, la carte ne passe jamais par nous » | checkout/portal Stripe hébergé ; aucune donnée carte dans nos routes | ✅ tenu |
| « Prix 4,99 €/mois TTC lu depuis plans.ts » (CGU art. 4) | `plans.ts:55` = 4,99 ; `stripe.ts:100-110` construit 499 EUR/mois (ou `STRIPE_PRICE_ID_PREMIUM`) | ✅ tenu — ⚠️ si un Price custom est utilisé, vérifier qu'il fait bien 4,99 €/mois EUR |
| « Annulation à tout moment, effet fin de période, données conservées » (CGU art. 4) | portail Stripe 1 clic ; `cancelAtPeriodEnd` ; statut resynchronisé | ✅ tenu |
| « Sauvegarder mes données = JSON complet » (§6) | `backup.ts` : events+tasks+settings (dont prénom) | ✅ tenu |
| « Supprimer mon compte = effacement local + serveur, définitif » (CGU art. 7, §6, §8) | **voir §1.4 ci-dessus : serveur non effacé (table `comptes` inexistante), KV non purgé, session Supabase non fermée, toast toujours « supprimé »** | 🔴 **promesse non tenue** |
| « Voix premium illimitée » (CGU art. 4, `/legal`, `/offres`, `plans.ts`) | plafond 300 car/jour pour tous (`api/voix/route.ts:11`) | 🔴 **contradit** |
| « 3 essais gratuits voix premium/mois en Découverte » (`plans.ts`, carte Abonnement) | client-side uniquement (`voice.ts`) ; serveur non vérifié | 🔴 contournable |
| « Rappels 100 % locaux » (§4) | `rappels.ts` : Notification API locale, aucun push serveur | ✅ tenu |
| « Zéro traceur, liste vérifiable dans le code » (§9) | confirmé par grep exhaustif | ✅ tenu |
| « En cas de changement important, signalé dans l'app » (`/confidentialite` §10) | aucun mécanisme de notification en cas de modification des textes (les pages affichent juste la version) | 🟠 à surveiller |
| « Continuer après une mise à jour vaut acceptation » (CGU art. 8) | pas de mécanisme d'acceptation ni de notification ; pour un consommateur, une modification substantielle des CGU ne peut lui être imposée par simple poursuite d'usage (clause à risque, art. L.212-1) | 🟠 à corriger (prévoir notification + acceptation explicite pour les changements importants) |

---

## 4. Mentions légales (`/legal`, LCEN art. 6, rédaction issue de la loi SREN du 21/05/2024)

### 4.1 Éditeur — non identifiable 🔴
**Règle** : LCEN art. 6 : le site d'un professionnel met à disposition du public l'identité de l'éditeur — personne physique : **nom, prénoms, domicile** ; personne morale/inscrite à un registre : dénomination, siège, **SIREN** — plus le directeur de la publication. Vendre un abonnement = activité professionnelle : l'éditeur devra être immatriculé (auto-entrepreneur) et afficher son SIREN.
**Constat** : `/legal` dit « édité à titre personnel, sans société immatriculée » avec **aucun nom, aucune adresse postale, aucun SIREN**, juste un e-mail et un lien GitHub.
**Verdict** : 🔴 à corriger avant le 1/01. Action simple : compléter la carte « Éditeur » avec nom/prénom (ou dénomination si société), adresse postale, SIREN (une fois immatriculé), directeur de la publication.

### 4.2 Hébergeur — nommé trop vaguement 🔴
**Règle** : LCEN art. 6 : nom, dénomination/raison sociale et adresse de l'hébergeur.
**Constat** : « servie par Vercel » — pas d'entité légale ni d'adresse.
**Verdict** : 🔴. Action simple : écrire « Hébergeur : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis » (identité vérifiée publiquement le 22/11/2026). À mettre à jour si migration Cloudflare (M-09) : nommer alors Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA.

### 4.3 Contact — domaine inexistant 🔴
**Constat (vérification publique, 22/11/2026 ~04:45 UTC)** : `contact@centeryou.fr` (`src/lib/legal.ts:3`, repris partout) — **le domaine `centeryou.fr` n'existe pas** : résolution DNS publique (dns.google) → NXDOMAIN, aucun enregistrement A ni MX. (`centeryou.com` et `centeryou.net` sont enregistrés par des tiers — MX présents.) L'app est servie sur `dev-apps-centeryou.vercel.app` (`.env.local.example`, `site.ts`), et `centeryou.fr` figure pourtant dans les hôtes de production autorisés (`http.ts:132-136`) : le domaine est prévu mais **pas acheté**.
**Verdict** : 🔴 à corriger avant le 1/01 : sans e-mail fonctionnel, ni les demandes RGPD (art. 12/15), ni le médiateur, ni le support ne peuvent aboutir. Action simple : acheter `centeryou.fr` (et rediriger le site dessus), créer une boîte `contact@centeryou.fr` réelle et la surveiller ; l'indiquer dans `/legal`, `/contact`, CGU, politique.

### 4.4 Lien « Mentions légales » absent du pied de page 🟡
**Constat** : `footer.tsx` lien vers `/cgu`, `/confidentialite`, `/contact` mais **pas `/legal`** (atteignable via `/contact`). **Verdict** : 🟠 accessibilité des mentions à parfaire (LCEN : « facilement accessibles »). Action simple : ajouter le lien « Mentions légales » dans le footer.

---

## 5. Facturation et taxes (Stripe)

### 5.1 Prix affiché = prix prélevé — ✅ avec réserve
`plans.ts` (4,99) est la source unique ; `createCheckoutSession` construit `unit_amount: 499`, `currency: 'eur'`, récurrent `month` (`stripe.ts:100-110`). **Réserve** : si `STRIPE_PRICE_ID_PREMIUM` est renseigné, le prix réel vient du dashboard Stripe — à vérifier qu'il est bien 4,99 €/mois EUR (sinon divergence affichage/prélèvement, sanctionnable). Action simple : un test d'achat réel en mode live avant le 1/01 (déjà prévu dans `docs/paiement-stripe.md` §4).

### 5.2 Reçu / facture — non assuré 🔴
**Règle** : si TVA due, facture obligatoire à chaque vente (CGI art. 289) remise au client ; à défaut de TVA (franchise en base), reçu avec mention « TVA non applicable, art. 293 B du CGI ». Art. L.221-14 code de la consommation : confirmation du contrat sur support durable (avec les infos L.221-5) au plus tard à la fourniture.
**Constat** : le checkout ne collecte **aucun e-mail** (`client_reference_id = deviceId` seulement, `stripe.ts:113-121`) → le customer Stripe n'a pas d'e-mail → **Stripe n'envoie aucun reçu/facture automatique**, et aucun e-mail de confirmation n'est envoyé par l'app. Le client ne reçoit qu'un toast dans l'app.
**Verdict** : 🔴 à corriger avant le 1/01. Action simple : demander l'e-mail à l'achat (`customer_email` ou champ Checkout) et activer l'envoi automatique des reçus/factures Stripe (ou envoyer soi-même un e-mail de confirmation avec prix TTC, date, durée, modalités de résiliation, médiateur).

### 5.3 Position fiscale à signaler au dirigeant 🔴(décision)
**Règle** : prestations de services numériques B2C : TVA du **pays du consommateur** (art. 58-59 directive 2006/112) — pour un client français : TVA France 20 %, incluse dans les 4,99 € TTC (HT 4,16 € + TVA 0,83 €) ; pour un client d'un autre État membre (marché UE annoncé) : TVA de **son** pays, déclarable via le **guichet unique OSS** (impots.gouv.fr) — **aucun seuil de franchise pour les services** vers l'UE. En France, franchise en base possible sous 37 500 €/an de prestations (seuil 2026, loi de finances 2025) avec mention art. 293 B CGI.
**Constat** : aucun numéro de TVA intracommunautaire, aucun réglage de taxe dans le code (`automatic_tax` non activé, `tax_id_collection` absent) ; prix fixe 4,99 € TTC quel que soit le pays.
**Verdict** : 🔴 décision à prendre avant le 1/01. Action simple pour le dirigeant : (1) s'immatriculer et obtenir un n° de TVA intracom ; (2) activer **Stripe Tax / `automatic_tax`** pour calculer et collecter la TVA du pays du client UE, ou s'inscrire à l'OSS et déclarer ; (3) si rester sous franchise en base (clients 100 % France, CA < 37 500 €) : mention « TVA non applicable, art. 293 B du CGI » sur les reçus — mais dès qu'un client hors France achète, l'OSS devient obligatoire ; (4) conserver les données de paiement/facturation 10 ans (obligation comptable).

### 5.4 Webhook et cohérence d'état — ✅
Signature HMAC-SHA256 vérifiée, tolérance ±300 s anti-rejeu (`stripe.ts:verifyWebhookSignature`) ; statuts `active/past_due/canceled` correctement dérivés ; repli cache si l'API Stripe tombe. ✅ conforme. Note 🟡 : `past_due` compte comme actif (`subscription.ts:47`) — acceptable (dunning Stripe), mais à documenter dans les CGU si interruption il y a.

---

## 6. Publics sensibles et marque

### 6.1 Mineurs
Voir §2.8 : aucun garde-fou à ce jour → 🔴 (case d'âge/autorisation + clause CGU). Le mode 100 % local sans compte ne traite aucune donnée côté serveur (exemption RGPD art. 8 non requise) — la politique le laisse entendre, à expliciter.

### 6.2 Marque « Centeryou » — disponibilité vérifiée publiquement
**Méthode (22/11/2026 ~04:50 UTC)** : (1) recherche USPTO agrégée Trademarkia : **« 0 Trademark Results found for 'centeryou' »** ; (2) balayage par moteur de recherche des pages de registres officiels indexées — `data.inpi.fr/marques/…` (INPI, marques FR/EUTM/Madrid en vigueur en France), `euipo.europa.eu` (eSearch), `branddb.wipo.int` (OMPI) : **aucun enregistrement « Centeryou » indexé** ; (3) recherche web générale « Centeryou trademark/marque/dépôt » : seul le dépôt GitHub du projet lui-même ressort. (Les interfaces de recherche directes INPI/EUIPO/WIPO sont protégées contre l' interrogation automatisée — d'où la combinaison moteurs + registres secondaires + USPTO.)
**Constat** : la marque **n'est enregistrée nulle part à ce jour** → aucun droit exclusif ; nom non protégé. Deux risques : (a) **risque de distinctivité** : « Centeryou » = « center you », évocateur/descriptif pour un planning personnel (classes 9/42) — un dépôt peut être refusé ou contesté ; (b) **risque de confusion** avec des marques existantes de la famille CENTRA*/CENTIVO/CENTROID… (visibles dans les résultats USPTO) : une recherche d'antériorité formelle (INPI/EUIPO, avec variantes phonétiques) est indispensable avant de communiquer largement.
**Verdict** : 🟠 à traiter avant le 1/01 (fortement recommandé, pas un blocage légal à la vente elle-même). Action simple : commander une recherche d'antériorité formelle (INPI + EUIPO, classes 9, 42, 45) puis **déposer la marque verbale « CENTERYOU » (voire un logo)** à l'INPI (~190 € la 1ʳᵉ classe, +40 €/classe) et idéalement une **marque de l'UE (EUTM)** à l'EUIPO pour le marché UE annoncé ; acheter `centeryou.fr` (§4.3) et surveiller `centeryou.com`/`.net` (tiers).

### 6.3 Hébergeur et conditions d'usage commercial 🟠
**Vérification publique** : ToS Vercel (vercel.com/legal/terms) : le plan **Hobby (gratuit) est réservé à l'usage personnel non commercial** — vendre un abonnement au 1/01/2027 sur le plan gratuit est une violation contractuelle (résiliation possible). C'est cohérent avec la mission M-09 (migration Cloudflare ou passage Vercel Pro ~20 $/mois décidée par l'utilisateur). **Action dirigeant** : activer le plan payant ou migrer **avant** la première vente, et nommer l'hébergeur réel dans `/legal` (§4.2).

---

## 7. Tableau récapitulatif

| # | Point | Règle | Constat | Verdict |
|---|---|---|---|---|
| 1 | Zéro cookie/traceur, localStorage strictement nécessaire | art. 82 LIL, RGPD art. 5 | vérifié code (0 cookie, CSP, SW same-origin) | ✅ |
| 2 | Inventaire données local vs réseau honnête | RGPD art. 13 | conforme au code | ✅ |
| 3 | Transferts hors UE (Vercel/ElevenLabs/Stripe DPF Active ; Supabase SCC+région UE) | RGPD art. 44-49 | DPF vérifié publiquement 22/11/2026 ; formulation politique à préciser | 🟠 |
| 4 | Base légale par traitement dans la politique | RGPD art. 13.1(c) | absente de `/confidentialite` | 🔴 |
| 5 | Suppression compte = effacement réel serveur + local | RGPD art. 17, L.121-2 | table `comptes` inexistante → 502 ; profiles/backups/auth/KV non effacés ; session non fermée ; toast toujours « supprimé » | 🔴 |
| 6 | Export données < 30 s | RGPD art. 15/20 | ✅ JSON complet | ✅ |
| 7 | Contact RGPD fonctionnel | RGPD art. 12 | `centeryou.fr` n'existe pas (NXDOMAIN) | 🔴 |
| 8 | Info précontractuelle (prix TTC, durée, résiliation, rétractation, médiateur) | L.221-5 | absente du parcours d'achat (/offres sans prix Premium) | 🔴 |
| 9 | Rétractation service numérique (accord exprès + renonciation) | L.221-28 13° | aucune case avant paiement | 🔴 |
| 10 | Résiliation aussi simple que l'inscription | L.215-1 | ✅ portail Stripe 1 clic, effet fin de période | ✅ (à annoncer pré-achat) |
| 11 | « Voix premium illimitée » | L.121-2 | plafond 300 car/j pour tous dans `/api/voix` | 🔴 |
| 12 | Vérification serveur du droit Premium à la voix | L.111-1, RGPD 13 | gate client-side seulement | 🔴 |
| 13 | Garantie légale de conformité service numérique | L.224-25-1 s. | clause « tel quel » abusive vs consommateur | 🔴 |
| 14 | Médiateur de la consommation désigné | L.612-1, R.616-1 | aucun | 🔴 |
| 15 | Mineurs (âge/consentement parental, contrat payant) | RGPD art. 8, code civil | aucune case d'âge | 🔴 |
| 16 | Mentions légales éditeur (nom, adresse, SIREN) | LCEN art. 6 | « à titre personnel » sans identité | 🔴 |
| 17 | Hébergeur nommé exactement | LCEN art. 6 | « Vercel » seul | 🔴 |
| 18 | Reçu/facture envoyé au client | CGI art. 289, L.221-14 | aucun e-mail collecté au checkout → aucun reçu Stripe | 🔴 |
| 19 | TVA : FR 20 % TTC ; UE = TVA pays client + OSS ; franchise 37 500 € (2026) | TVA (directive 2006/112, art. 58-59) | aucun réglage de taxe, prix fixe TTC | 🔴 décision dirigeant |
| 20 | Prix affiché = prélevé | L.221-5 | ✅ 4,99 € depuis `plans.ts` (vérifier Price Stripe custom) | ✅ réserve |
| 21 | Webhook signé, anti-rejeu | bonne pratique | ✅ HMAC + ±300 s | ✅ |
| 22 | Mot de passe 6 car. min, sans complexité | RGPD art. 32, reco CNIL 2022-100 (8 car + 3/4 catégories ou 12 car) | en dessous de la recommandation | 🟠 |
| 23 | CGU modifiables par « poursuite = acceptation » | L.212-1 | mécanisme absent, clause à risque | 🟠 |
| 24 | Footer sans lien « Mentions légales » | LCEN (accessibilité) | lien absent du footer | 🟡 |
| 25 | Logs Vercel (IP) : durée non documentée | RGPD art. 5.2, 13 | à clouer après migration M-09 | 🟠 |
| 26 | Reconnaissance vocale navigateur (Chrome/Edge) divulguée | RGPD art. 13 | ✅ divulgué ; option « local uniquement » à prévoir | ✅/🟠 |
| 27 | Vercel Hobby = non commercial (ToS) | contrat hébergeur | vente interdite sur le plan gratuit → Pro ou migration M-09 avant le 1/01 | 🟠 |
| 28 | Marque Centeryou non enregistrée | PI | 0 résultat USPTO (Trademarkia), rien à l'INPI/EUIPO/WIPO (balayage 22/11) ; distinctivité faible | 🟠 dépôt recommandé |
| 29 | Page presse « aucun compte serveur » | L.121-2 | à nuancer (« par défaut », compte optionnel existe) | 🟡 |

---

## 8. Corrections INDISPENSABLES avant le 1/01/2027 (strict minimum légal)

1. **Identité de l'éditeur** dans `/legal` : nom/prénom (ou dénomination), adresse postale, SIREN une fois immatriculé (obligatoire pour vendre), directeur de la publication. *(LCEN art. 6)*
2. **Hébergeur exact** dans `/legal` : « Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA » (ou Cloudflare après M-09). *(LCEN art. 6)*
3. **Contact réel** : acheter `centeryou.fr`, créer et surveiller `contact@centeryou.fr` (aujourd'hui le domaine n'existe pas — vérifié DNS). *(RGPD art. 12, LCEN)*
4. **Suppression de compte réelle** : la route `/api/compte/suppression` doit effacer `backups` + `profiles` + l'utilisateur auth (clé service Supabase) **et** purger le snapshot KV ; le client doit appeler `signOut()`, supprimer la clé `sb-*-auth-token`, et n'afficher « supprimé » que si le serveur a confirmé. Aligner CGU art. 7 et confidentialité §6/§8 sur la réalité. *(RGPD art. 17, L.121-2)*
5. **Bloc d'information précontractuelle** avant tout paiement (sur `/offres` + carte Abonnement + récap Stripe) : prix **4,99 €/mois TTC**, durée (renouvellement mensuel automatique), résiliation en un clic à tout moment (effet fin de période payée), médiateur, éditeur. *(L.221-5, L.215-1)*
6. **Case de rétractation** obligatoire avant paiement : accord exprès à l'exécution immédiate + renonciation au droit de rétractation de 14 jours, avec explication. *(L.221-28 13°)*
7. **Médiateur de la consommation** désigné (liste officielle) et nommé dans CGU art. 9 + `/legal`. *(L.612-1, R.616-1)*
8. **« Voix premium illimitée »** : soit vérifier l'abonnement côté serveur et retirer le plafond pour les payants, soit corriger le texte partout (« quota quotidien de 300 caractères »). *(L.121-2)* — et dans les deux cas **vérifier côté serveur le droit d'accès à `/api/voix`** (customerId + statut Stripe actif), sinon la fonctionnalité payante est servie gratuitement.
9. **Garantie légale de conformité** : ajouter la mention d'ordre public pour les consommateurs dans les CGU (la clause « tel quel » ne s'y applique pas). *(L.224-25-1 s., R.212-1)*
10. **Reçu/facture à chaque achat** : collecter l'e-mail au checkout et activer les reçus/factures Stripe (ou e-mail de confirmation maison avec prix TTC, durée, résiliation, médiateur). *(CGI art. 289, L.221-14)*
11. **Position fiscale** : immatriculation + n° TVA intracom ; activer Stripe Tax (TVA du pays du client UE) ou inscription OSS ; sinon franchise en base (clients France uniquement, < 37 500 €) avec mention art. 293 B CGI. Décision à prendre **avant** la première vente UE. *(directive TVA art. 58-59)*
12. **Mineurs** : case « 15 ans ou plus / autorisation du responsable légal » à la création du compte en ligne et avant le paiement + clause CGU. *(RGPD art. 8)*
13. **Base légale** ajoutée dans la politique de confidentialité (tableau + par flux). *(RGPD art. 13)*

## 9. Points de vigilance à traiter dans le premier mois après le 1/01

- Mot de passe : passer à 8 caractères min + 3/4 catégories (voire 12) — recommandation CNIL 2022-100, RGPD art. 32.
- Hébergeur : activer Vercel Pro ou finaliser la migration Cloudflare (M-09) — le plan Hobby interdit l'usage commercial (ToS Vercel) ; mettre à jour `/legal` et la durée de rétention des logs.
- CGU : remplacer « continuer vaut acceptation » par une notification + acceptation explicite pour les changements importants ; prévoir aussi le signalement « en cas de changement important » promis dans la politique §10.
- Dépôt de la marque « CENTERYOU » (INPI classes 9/42/45, EUTM pour l'UE) après recherche d'antériorité formelle ; surveiller les domaines tiers.
- Politique §9 : citer le **DPF** (Vercel/ElevenLabs/Stripe certifiés Active au 22/11/2026) + SCC en repli (contentieux DPF en cours) ; Supabase = région UE + SCC.
- Prénom envoyé en en-tête `x-centeryou-user` à `/api/voix` (hébergé aux US) : vérifier que les logs Vercel ne capturent pas les en-têtes ; documenter la rétention.
- Option « reconnaissance vocale locale uniquement » quand le navigateur le permet (Firefox), la divulgation Chrome/Edge étant déjà faite.
- Footer : ajouter le lien « Mentions légales » ; page presse : nuancer « aucun compte serveur » → « par défaut ».
- Vérifier que le Price Stripe custom (`STRIPE_PRICE_ID_PREMIUM`), s'il est utilisé, fait bien 4,99 €/mois EUR ; test d'achat réel en live.
- Documenter le traitement `past_due` (Premium actif pendant le dunning) dans les CGU si interruption.
- Tenir un registre des traitements interne (ce journal en est la base) et rejouer le test « droits accessibles en < 30 s » à chaque refonte de Réglages.

---

## 10. Avis final

**« Prêt à vendre juridiquement le 1/01/2027 ? » — NON en l'état ; OUI À CONDITION DE…**

Les pages légales v2.0 sont une bonne base (zéro traceur réel, données locales réelles, prix unique, webhook signé, annulation en un clic — tout cela est vérifié conforme). Mais **tant que les 13 points de la section 8 ne sont pas faits**, vendre un abonnement est illégal ou risqué : éditeur non identifiable, contact inexistant, suppression serveur fictive (promesse écrite non tenue), information précontractuelle et rétractation absentes, médiateur absent, « illimité » faux, garantie légale écartée, aucune facture, TVA UE non positionnée, aucun garde-fou mineur. Ce sont des corrections courtes et localisées (pages légales + une route API + le checkout), pas une refonte. **Recommandation : lancer la vente uniquement après la section 8, avec la section 9 traitée dans le premier mois.**

---

## Étapes (heure UTC)

- 2026-11-22 ~04:30 — `git fetch origin main` (dernier état `b37ac8e`) ; worktree `Centeryou-wt-huissier` créé sur branche neuve `vibe/huissier-juridique` depuis `origin/main` (la checkout principale était sur `vibe/verrou-securite` avec modifications non commitées — non touchée).
- 2026-11-22 ~04:35 — Lecture de `AGENTS.md`, `MISSIONS.md` (M-25), `docs/journal/` (coffre.md en entier + sentinelle.md), puis du code (pages légales, paiement, compte, voix, sync, middleware, sw.js, docs supabase/stripe).
- 2026-11-22 ~04:40 — Inscription M-25 dans `MISSIONS.md` (branche créée, audit en cours), commit `64a20d0`, push `vibe/huissier-juridique`.
- 2026-11-22 ~04:45-04:55 — Vérifications publiques : DNS `centeryou.fr` (NXDOMAIN) et `.com/.net` (tiers) via dns.google ; Trademarkia/USPTO « centeryou » = 0 résultat ; balayage moteurs des registres INPI/EUIPO/WIPO = aucun enregistrement indexé ; liste EU-US DPF (dataprivacyframework.gov) : Vercel, ElevenLabs, Stripe = Active, Supabase non listé (SCC + TIA publiés) ; ToS Vercel (Hobby non commercial) ; citations Légifrance (LCEN art. 6, L.221-5, L.221-28 13°, L.215-1, L.224-25-1 s., L.612-1/R.616-1, L.121-2), CNIL (délib. 2022-100 mots de passe ; art. 82 LIL traceurs), TVA (directive 2006/112 art. 58-59, OSS, franchise 37 500 € 2026).
- 2026-11-22 ~04:58 — Rédaction de ce rapport `apps/centeryou/docs/journal/huissier.md` (aucun fichier de code modifié ; `git status` propre hors ce fichier + MISSIONS.md).
- 2026-11-22 ~05:0x — Commit, push, **PR brouillon** « M-25 Huissier — audit juridique avant mise en vente » (base `main`) ; MISSIONS.md mis à jour « PR #XX ouverte ».

*Journal tenu par Huissier. Zone respectée : aucun fichier de code touché — livrable = ce journal + l'inscription MISSIONS.md.*
