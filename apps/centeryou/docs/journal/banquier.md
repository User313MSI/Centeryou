# Banquier — Évaluation d'investisseur impitoyable (M-26) — 22/11/2026

- **Agent** : Banquier (session dédiée, LECTURE SEULE — aucun fichier de code modifié).
- **Branche** : `vibe/banquier-investisseur` (base `main` `b559da3`, 22/11 ~05:00 UTC). PR : voir lien en bas de page.
- **Méthode réelle** : lecture de `AGENTS.md`, `MISSIONS.md` (section M-26), des **33 journaux** de `docs/journal/` en intégralité, des **5 documents** de `docs/marketing/`, de `docs/AUDIT-2026-11.md`, `docs/paiement-stripe.md`, `docs/INSTALL-SUPABASE.md`, `docs/supabase/schema.sql`, du code (`apps/centeryou/src/` : 15 312 lignes, 32 fichiers de tests : 7 163 lignes) ; **rejeu des tests moi-même sur `main`** : `npm test` = **543/543 ✅**, `npm run test:parser` ✅, `npx tsc --noEmit` ✅, `npm audit` rejoué (8 vulnérabilités, voir axe 4) ; historique git complet (146 commits depuis le 13/11) ; **40 PR GitHub consultées** (39 fusionnées, 1 brouillon ouverte) ; recherche marché/coûts externe (taille du marché, concurrents, prix ElevenLabs/Vercel/Supabase/Cloudflare, benchmarks de conversion freemium).
- **Ce que je n'ai PAS pu vérifier** (et c'est en soi un constat) : les variables d'environnement de production (clés Stripe/ElevenLabs/Supabase), le domaine réservé, le statut juridique de l'éditeur, et **toutes les métriques d'usage** — il n'en existe aucune dans le produit (zéro traceur, confirmé par Coffre M-14).

> Vocabulaire pour tout lire sans jargon : **localStorage** = la mémoire interne du navigateur de l'utilisateur (ses données restent sur son appareil, rien n'est envoyé ailleurs) ; **rate-limit** = plafond de requêtes par heure/adresse internet pour bloquer les abus ; **CSP à nonce** = règle de sécurité qui n'autorise à s'exécuter que les scripts prévus par le site, signés à la volée ; **webhook signé** = message de Stripe vérifié par cryptographie pour prouver qu'il vient bien de Stripe ; **CVE** = faille de sécurité publiée publiquement ; **freemium** = gratuit avec option payante ; **churn** = taux de départ des abonnés ; **MAU** = utilisateurs actifs mensuels ; **TVA** = taxe française de 20 % ; **ARPU** = revenu moyen par utilisateur.

---

## Résumé exécutif

Produit techniquement solide et une exécution d'équipe rare (39 PR fusionnées en 8 jours, 543 tests verts rejoués par moi-même, incidents corrigés et documentés). Mais **le business n'existe pas encore** : aucun paiement activé en production, aucun compte en ligne activé, aucun domaine confirmé, aucune structure juridique, aucune métrique d'usage, et un modèle « gratuit » dont le vrai coût (voix payante au caractère chez ElevenLabs, hébergement payant obligatoire dès le 1/01) n'est pas encore provisionné. Le marché est immense mais verrouillé par des acteurs gratuits (Google Agenda ~500 millions d'utilisateurs actifs, Outlook ~500 millions, Notion Calendar gratuit).

**Verdict : je n'investis pas en l'état.** Les conditions exactes qui me feraient changer d'avis sont listées §7.

---

## 1. Marché — **5/10**

**Preuves (recherche externe, 22/11/2026)** : le marché mondial des calendriers est estimé à ~16,8 milliards $ en 2025 ; celui des applications de productivité à ~12–13,4 milliards $ en 2025–2026, en croissance de ~8,6–9,2 %/an (prévisions ~18–30 milliards d'ici 2030–2035). Google Calendar : ~500 millions d'utilisateurs actifs mensuels (jusqu'à 1,5 milliard de comptes), ~50 milliards d'événements créés par jour. Outlook mobile : 500 millions d'utilisateurs. Google + Microsoft = plus de 3,2 milliards d'utilisateurs. Côté payant, le paysage 2026 : Notion Calendar **gratuit**, Fantastical ~4,75 $/mois (Apple uniquement), TickTick Premium 4,99 $/mois en annuel, Motion ~20–28 $/mois, Reclaim ~8–12 $/mois, Sunsama 20 $/mois.

**Commentaire sans ménagement** : le marché est gros, mature et **verrouillé par le gratuit**. Tout le monde a déjà un agenda (Google/Apple/Outlook) qui se synchronise partout, partage des agendas et coûte 0 €. La niche « calendrier payant pour particuliers francophones » existe (Fantastical, TickTick le prouvent) mais elle est étroite et trustée par des acteurs établis. Centeryou ne vise pas les entreprises (pas de partage d'équipe, pas de synchro live Google/Outlook — voir axe 2), donc le marché adressable réel est le **consommateur individuel francophone** : quelques dizaines de millions de personnes en France, dont une fraction minoritaire paiera. Ce n'est pas un marché de masse, c'est un marché de niche — viable si la niche est servie avec une vraie différenciation, pas si on rêve de remplacer Google Agenda.

## 2. Différenciation — **6/10**

**Preuves (code + tests + journaux)** : le parseur de langage naturel français est réel et prouvé par 70 tests (`tests/parser.test.ts`) : « sport demain 14h », « !lundi réunion », auto-correction orale « ah non, plutôt aujourd'hui » (test utilisateur du 22/11, MISSIONS.md). Le film du matin personnalisé (~38 s, salutation au prénom, vrais chiffres du jour, lu à voix haute — `src/lib/launch-film.ts`, `src/lib/brief.ts`, 24 tests) est **unique sur le marché** : aucun agenda mainstream ne produit une vidéo quotidienne personnelle. La voix premium (ElevenLabs, voix « Sarah ») passe par un serveur protégé (`src/app/api/voix/route.ts`). L'ICS export/import existe (M-07 Pont, 56 tests, round-trip prouvé).

**Réponse à l'objection « je continue avec mon agenda Google »** : honnêtement, elle tient. Centeryou importe un fichier .ics **une seule fois** (Pont : « pas d'abonnement d'agenda distant, pas de connexion Google/Apple — c'est de la phase 1 ») : pas de synchronisation live. Quelqu'un qui vit dans Google Agenda devra double-saisir ou rester. La vraie réponse de Centeryou, c'est la **friction de saisie supprimée** (on dicte en français naturel, Google comprend moins bien le français parlé) + le **bonjour du matin vocal** + la **confidentialité locale par défaut** (données dans le navigateur, zéro traceur — vérifié par Coffre). Ce sont de vrais atouts, mais le coût de changement (quitter Google) n'est pas résolu par le produit aujourd'hui.

**La voix est-elle un détail tranchant ou un gadget ?** Les deux. La saisie vocale naturelle en français est un vrai différenciateur (test utilisateur 22/11 : l'auto-correction orale fonctionne). Mais la **voix premium** elle-même est proche du gadget tant que la voix gratuite du navigateur suffit — le 2e test utilisateur (22/11) a jugé la voix « robotique » **normale**, signe que l'écart premium n'est pas encore ressenti comme indispensable. Le « bon matin » filmé est le vrai crochet émotionnel ; la voix seule ne vendra pas 4,99 €/mois.

**Note : 6/10.** Un différenciateur réel (film du matin + français parlé) mais un mur (Google gratuit, synchro live absente) que le produit ne franchit pas encore.

## 3. Modèle économique — **4/10**

**Preuves** : `src/lib/plans.ts` — Découverte 0 € (planning/tâches illimités, voix du navigateur, assistant vocal, mode sombre, données locales) ; Premium **4,99 €/mois TTC** = voix premium « illimitée » (en réalité plafonnée à 300 caractères/jour côté serveur, `src/app/api/voix/route.ts`), sauvegarde en ligne avec compte, synchro multi-appareils. 3 essais de voix premium gratuits/mois (`FREE_PREMIUM_VOICE_LIMIT_PER_MONTH = 3`). Paiement Stripe Checkout hébergé en français, webhook signé anti-rejeu, portail client (`src/app/api/checkout|portal|stripe/webhook`, `src/lib/server/stripe.ts` — appels REST purs, zéro SDK).

**Arithmétique vulgarisée** : 4,99 €/mois TTC → – 20 % de TVA (0,83 €) → 4,16 € HT → – frais Stripe (~1,5 % + 0,25 € ≈ 0,32 €) → **~3,84 € nets par abonné et par mois**. Prix bien placé (Fantastical ~5 $/mois, TickTick 4,99 $ annuel) — le prix n'est pas le problème.

**Conversion attendue** : benchmarks freemium 2026 — applications grand public : **2 à 5 %** de conversion gratuit→payant (OpenView : 2,2–4,0 % ; RevenueCat ~3,7 %) ; catégories productivité/business peuvent monter à 7–10 % mais c'est surtout du B2B. Pour un calendrier perso B2C, attendons **2–4 %**. Donc : 10 000 utilisateurs gratuits → 200–400 payants → ~800–1 500 €/mois nets. 100 000 gratuits → ~8 000–15 000 €/mois.

**Ce que le gratuit coûtera à l'échelle (chiffré)** :
- **Voix premium** : ElevenLabs facture au caractère (~1 crédit = 1 caractère ; ~0,08 $ les 1 000 caractères, soit ~0,08 $ la minute de voix ; plan Starter à 6 $/mois = 30 000 caractères seulement). Le plafond serveur (300 caractères/jour/utilisateur) borne le coût à **~0,7 $/mois par abonné premium maxant son quota** — soutenable. Mais les **3 essais gratuits** des utilisateurs gratuits : 1 000 utilisateurs gratuits qui les utilisent tous = jusqu'à ~900 000 caractères/mois ≈ **~70 $/mois de voix « gratuite »** ; à 10 000 utilisateurs, ~700 $/mois si la moitié maxe — le vrai coût caché du gratuit. Les plafonds sont en **mémoire vive par instance de serveur** (documenté dans `journal/verrou.md`) : au redémarrage d'une instance (démarrage à froid), les compteurs repartent à zéro — sur Cloudflare Workers sans stockage persistant, idem. Les quotas sont anti-abus, pas une facturation fiable.
- **Hébergement** : Vercel Hobby (gratuit) = **usage non commercial interdit**, 100 Go de bande passante/mois, 100 h d'exécution de fonctions, timeout 10 s ; Pro = 20 $/mois + dépassements. Au 1/01/2027, vendre sur Hobby = hors CGU de Vercel. Choix de l'équipe (M-09) : Cloudflare (Workers ~5 $/mois, 10 M requêtes incluses) + Supabase Pro (25 $/mois, 100k MAU, 8 Go) → **~30 $/mois de coûts fixes** jusqu'à ~100 000 comptes — c'est le bon choix, mais il n'est **pas encore exécuté**.
- **Stockage** : Supabase gratuit = 500 Mo et **pause après 1 semaine d'inactivité** — inutilisable en production ; il faudra le plan Pro à 25 $ dès les premiers comptes. La synchro Premium (`/api/sync`) retombe en mémoire vive (perdue au redémarrage) sans KV payant.
- **Bande passante** : chaque visite sert ~114 Ko de JavaScript initial (mesuré, `journal/souffle.md`) ; toutes les pages sont rendues à la volée (contrainte de sécurité CSP, prouvée dans `journal/souffle.md`) → chaque visite coûte de l'exécution serveur. À l'échelle, la facture Vercel/Cloudflare monte linéairement avec le trafic.

**Deux défauts structurels majeurs du modèle** :
1. **Le Premium est rattaché à l'appareil, pas à la personne** (`deviceId` dans le localStorage, `src/lib/billing.ts` ; « un changement de navigateur = nouvel appareil », `journal/elena.md`). Un client qui change de téléphone **perd son abonnement côté app** → réclamations, remboursements, double paiement. Tant que le compte e-mail (Supabase) n'est pas activé, le Premium n'est pas portable. C'est un churn artificiel.
2. **Aucune métrique nulle part** (zéro traceur, assumé et documenté par Coffre M-14 — c'est un choix de confidentialité louable, mais côté business vous pilotez **à l'aveugle** : pas de taux d'inscription, de rétention, de conversion mesurables).

Et : **aucun paiement n'est activé aujourd'hui** — `STRIPE_SECRET_KEY` vide dans `.env.local.example`, `/api/checkout` renvoie 503 « Paiement non configuré » en l'état ; MISSIONS.md confirme « activation Supabase/Stripe avec l'utilisateur » pas encore faite. Au 22/11, le chiffre d'affaires est de **0 €** et il n'y a **aucun abonné payant**.

**Note : 4/10.** Un prix juste et un freemium honnête, mais une structure de coûts non provisionnée, un Premium non portable, zéro mesure, zéro revenu aujourd'hui.

## 4. Solidité technique — **7/10**

**Preuves vérifiées par moi-même sur `main` (22/11 ~05:00 UTC)** : `npm test` = **543/543 tests ✅** (32 fichiers), `npm run test:parser` ✅, `npx tsc --noEmit` ✅ (TypeScript strict, 0 `any`), `npm audit` = **8 vulnérabilités** (3 critical, 2 high, 3 moderate). CI bloquante (`.github/workflows/centeryou-ci.yml`) : tests + test:parser + build + **scan de secrets bloquant** (M-13 Verrou).

**Points forts prouvés** :
- **Aucun secret dans le navigateur** : fuite ElevenLabs du 14/11 (journal `celeste.md`/`alpha.md` 🔴-1) corrigée le jour même ; re-vérifié par grep de bundle (Sentinelle) et par scan CI bloquant. La clé n'existe que côté serveur (`src/app/api/voix/route.ts`).
- **Sécurité offensive** (M-13 Verrou, 27 tests d'intrusion `tests/api-intrusion.test.ts`) : rate-limits sur **toutes** les routes API (429 + `Retry-After`), plafonds de taille des requêtes (413), validation stricte des entrées (champs inattendus → 400), URL de retour paiement derived d'un **hôte de confiance uniquement** (Host forgé → 400, zéro appel Stripe), quota voix renforcé (100 req/jour/IP + 3 000 car/jour/IP + session prioritaire sur le prénom), middleware 413 > 2 Mo.
- **Audit M-03 Sentinelle + correctifs M-08 Bouclier livrés** : `/api/sync` et `/api/compte/suppression` exigent une session vérifiée côté serveur (401/403, tests `api-sync-auth.test.ts`), crash du parseur « dans 999999999 jours » éradiqué (plafond 500, test), bug de hooks React réparé (`tests/event-block-hooks.test.ts`), payloads distants sanitisés item par item.
- CSP à nonce par requête (tous les scripts signés, vérifié en prod HTTP), `X-Frame-Options: DENY`, HSTS, webhook Stripe signé HMAC + anti-rejeu ±300 s, stockage local résilient (JSON corrompu → copie de secours + toast, jamais de crash — `safe-storage.ts`, testé), export/import JSON et .ics validés et sanitisés (jamais d'écrasement à l'import).
- Performance mesurée : premier chargement 114 Ko (–30 % grâce à Lynx), Supabase chargé uniquement à la demande (chunk hors du HTML initial, prouvé), service worker hors-ligne réel, PWA installable, app bureau Windows testée sur machine réelle (Bâtisseur, release `bureau-v1.0`).

**Dettes et points noirs (tous documentés, aucun caché)** :
- **`next@14.2.35` : 3 CVE critical + postcss high** (RCE via l'optimiseur d'images en self-hosted, SSRF, etc.). Correctif = montée majeure vers next 16.4.6, **reportée « après le lancement »** (journaux Sécure/Sentinelle). Sur Vercel hébergé c'est atténué par l'infrastructure ; mais la migration M-09 vers Cloudflare (runtime perso via OpenNext) **réexpose partiellement** ces failles — à re-évaluer impérativement avant/après migration. `npm audit` n'est qu'informatif en CI (choix assumé).
- **Rate-limits et quotas en mémoire par instance** : contournables partiellement par rotation d'instances/démarrages à froid (documenté Verrou) — acceptable en anti-abus, dangereux pour le coût voix à l'échelle.
- **Toutes les pages en rendu dynamique** (contrainte CSP nonce, prouvée) : pas de cache statique → coût et latence linéaires avec le trafic.
- **Pas de tests E2E navigateur** (pas de Playwright) ; le harnais d'audit `audit/` tourne hors CI ; l'app desktop n'a pas de CI.
- **Suppression de compte incomplète côté serveur** (Coffre M-14, hors zone documenté) : la route supprime une table `comptes` qui **n'existe pas** dans `docs/supabase/schema.sql` (les vraies tables sont `profiles`/`backups`) → le DELETE échoue en prod ; la session Supabase reste dans le navigateur après « tout effacer » ; le snapshot KV n'est pas purgé ; `contact@centeryou.fr` est un **placeholder** (les demandes RGPD y tombent dans le vide tant qu'il n'est pas remplacé).
- Dépendances tierces **codées mais non activées** : Supabase (comptes/sauvegarde), Stripe (paiement), KV (synchro durable) — tout repose sur des variables d'environnement vides aujourd'hui.

**Réaction aux incidents (journal)** : fuite de clé → corrigée le jour même + vérification bundle + règle « jamais NEXT_PUBLIC_ sur une clé » ; crash localStorage → sanitation + tests ; test périmé à minuit → CI rouge 3 h sur main → corrigé par Vibe Work (`d3c67e9`) + **règle 8** ajoutée (aucune date littérale comparée au jour réel) ; 3 faux échecs de build CI identifiés comme **faux positifs d'infrastructure** (même code vert en relance) et documentés comme leçon ; commit accidentel sur la mauvaise branche (Coffre) corrigé proprement par cherry-pick. Chaque incident a une trace, un correctif, et souvent une règle nouvelle. C'est exactement ce qu'on veut voir.

**Note : 7/10.** Du code propre, testé, défendu — avec une dette de sécurité connue (next 14) assumée mais à retoucher sérieusement, et des bouts RGPD non finis côté serveur.

## 5. Exécution et discipline — **9/10**

**Preuves mesurées (git + GitHub API, 22/11)** : **146 commits depuis le 13/11**, dont 35 le 14/11, 19 le 15/11, 35 le 20/11, **41 le 21/11** ; **39 PR fusionnées** en 8 jours (PR #6 à #40), 1 brouillon ouverte (M-22 Plume) ; suite de tests passée de **123 (14/11) à 543 (22/11)** sans jamais supprimer de test (les ajustements sont documentés un par un, ex. Bouclier : « 1 assertion qui encodait l'ancien bug corrigée, documentée »). Chaque mission : inscription dans MISSIONS.md **avant** de coder (pull d'abord), branche dédiée, **zone étanche vérifiée par `git diff --name-only`**, PR en brouillon base `main` ouverte tôt, push à chaque étape, journal horodaté en UTC. Doublons évités par grep préalable (« 0 occurrence » avant d'écrire Pont/Radar). CI bloquante + scan de secrets. **Deux tests utilisateurs réels déjà réalisés** (21/11 et 22/11 au soir) et leurs retours transformés en missions livrées le lendemain (M-19 Compris, M-20 Accord, PR #39/#40 fusionnées) — boucle feedback → correctif en < 24 h.

**Probabilité que le 1er janvier tienne** : côté **code**, très élevée (le produit fonctionne déjà en ligne sur Vercel, 543 tests, 2 tests utilisateurs passés). Côté **business**, le 1/01 dépend de tâches humaines externes non faites au 22/11 : activer Stripe (compte + mode live + webhook), activer Supabase, acheter/confirmer le domaine, remplacer le contact, faire la migration Cloudflare (M-09, « avant le 31/12 »), finir les correctifs juridiques (M-25 Huissier). 40 jours, cadence actuelle → faisable, mais chaque point est un goulot manuel.

**Note : 9/10.** Une discipline rare. Le –1 : tout repose sur **une seule personne** (l'utilisateur détient les clés, Vibe Work fusionne) — « bus factor » total — et deux missions (M-21 Cinéaste, M-22 Plume) étaient encore en vol au moment de l'audit.

## 6. Risques majeurs — les trois plus gros, dans l'ordre

1. **Le lancement commercial du 1/01 peut être bloqué ou illégal en l'état** : paiement non activé (503 aujourd'hui), Supabase non activé, domaine non confirmé, `contact@centeryou.fr` placeholder, et **Vercel Hobby interdit l'usage commercial** — rester dessus le 1/01 avec des paiements = violation des CGU de l'hébergeur ; la migration Cloudflare (M-09) n'est pas faite. Preuve : `.env.local.example` (clés vides), MISSIONS.md (« activation Supabase/Stripe avec l'utilisateur » à venir), `docs/paiement-stripe.md` (3 étapes manuelles restantes).
2. **L'adoption bute sur Google gratuit sans synchro live, et le Premium n'est pas portable** : import .ics one-shot seulement (Pont), Premium rattaché au `deviceId` de l'appareil (perdu au changement de téléphone → churn + réclamations), pas de compte par défaut. Tant que ces deux points ne sont pas résolus, l'objection « je reste sur Google Agenda » reste sans réponse produit, et chaque abonné est un abonné fragile.
3. **Les coûts à l'échelle et la dette sécurité/juridique s'accumulent en silence** : voix ElevenLabs au caractère (essais gratuits × masse = coût variable réel ; quotas en mémoire contournables au redémarrage des instances), hébergement payant obligatoire (~30 $/mois Cloudflare+Supabase, puis plus), `next@14.2.35` avec 3 CVE critical dont certaines se réexposent sur Cloudflare, suppression RGPD incomplète côté serveur, statut juridique inexistant (vente en tant que particulier), et **zéro métriques** pour détecter tout ça.

---

## 7. Verdict final

### « Je n'investis pas — en l'état. »

Le produit est mieux construit que 90 % des dossiers que je vois, et l'équipe exécute exceptionnellement bien. Mais j'investis dans une **entreprise**, pas dans un code : aujourd'hui il n'y a ni entité juridique, ni paiement actif, ni domaine confirmé, ni métriques, ni portabilité d'abonnement, ni synchro avec les agendas existants. Le 4,99 €/mois n'a aucun client derrière aujourd'hui.

**Si oui (conditions réunies), le montant que je mettrais** : **25 000 € en amorçage, en deux tranches** — 12 500 € à la signature des 5 conditions dures ci-dessous, 12 500 € à 6 mois si rétention et conversion sont mesurées.

**La liste exacte des étapes qui me feraient changer d'avis** (toutes vérifiables, dans cet ordre) :
1. **Paiement réel activé et prouvé en production** : compte Stripe live + webhook configuré, un achat test à 4,99 € réussi, une annulation via le portail, un remboursement — captures d'écran datées.
2. **Hébergement légal au 1/01 prouvé** : migration Cloudflare (M-09) faite, testée (smoke 200, voix, paiement, PWA) **ou** Vercel Pro souscrit — plus aucune dépendance au plan Hobby non commercial.
3. **Domaine et contact réels** : `centeryou.fr` (ou .app) acheté et en HTTPS, `contact@centeryou.fr` remplacé par une vraie adresse fonctionnelle, disponibilité de la marque « Centeryou » vérifiée (rapport M-25).
4. **Structure juridique créée** : société immatriculée (ou EI déclarée), compte bancaire pro, TVA gérée, CGU à jour avec le vendeur identifié.
5. **RGPD bouclé côté serveur** : suppression de compte testée de bout en bout (profil + sauvegarde + compte auth + snapshot de synchro), session navigateur purgée — avec un test rejoué.
6. **Le Premium rattaché à une personne** (compte e-mail obligatoire pour acheter) **ou** une synchro live Google Calendar (abonnement .ics) — pour tuer l'objection Google et la perte d'abonnement au changement d'appareil.
7. **Des métriques minimales sans traceur** : panneau interne agrégé (inscrits, actifs J7/J30, conversion, churn) ou au moins un comptage côté serveur des comptes créés.
8. **Plan de sécurité daté** : montée vers next 16.x (ou mitigation prouvée sur Cloudflare, notamment l'optimiseur d'images), pentest M-24 appliqué, quotas voix rendus persistants (KV/Durable Objects).
9. **1 000 bêta-testeurs réels** avec rétention J30 ≥ 40 % et conversion freemium ≥ 2 % mesurées (condition 7).
10. **Budget coûts à l'échelle chiffré** : plan ElevenLabs choisi, simulation à 10 000 gratuits / 1 000 payants, budget marketing du PLAN-LANCEMENT bouclé.

---

## 8. Les 10 questions qu'un vrai investisseur poserait au dirigeant (de la plus désagréable à la plus simple)

1. « Quel est le chiffre d'affaires réel au 22 novembre 2026, et combien d'abonnements Premium **payants et actifs** aujourd'hui en production ? » *(Réponse probable : 0 € et zéro — c'est ma question n°1 parce que tout le reste en découle.)*
2. « Vous vendez un abonnement sans mesurer quoi que ce soit (zéro traceur, zéro analytique). Comment pilotez-vous la rétention et la conversion sans un seul chiffre ? »
3. « Sous quel statut juridique vendez-vous 4,99 €/mois — particulier, entreprise individuelle, société ? Qui émet la facture, avec quelle TVA, et qui est responsable en cas de litige ? »
4. « L'hébergement gratuit actuel (Vercel Hobby) interdit l'usage commercial : le 1er janvier 2027, où tourne exactement le paiement, et la migration vers Cloudflare est-elle faite et testée ? Montrez-moi. »
5. « Aujourd'hui, la suppression de compte côté serveur échoue silencieusement (la table visée n'existe pas dans la base). Un client exerce son droit à l'effacement le 2 janvier : que lui répondez-vous, concrètement ? »
6. « Un client Premium change de téléphone : son abonnement, lié à son navigateur, est perdu. Quelle est votre politique de remboursement et de support — et combien de double paiements prévoyez-vous ? »
7. « Pourquoi ne pas synchroniser en direct avec Google Calendar — la raison n°1 pour laquelle vos prospects restent chez Google — alors que votre import .ics n'est qu'une photo à un instant T ? »
8. « Quel coût ElevenLabs prévoyez-vous à 10 000 utilisateurs gratuits (3 essais de voix premium par mois) et 1 000 payants, avec quel forfait ElevenLabs ? Et vos plafonds tiennent-ils quand les serveurs redémarrent à froid ? »
9. « Qui détient aujourd'hui les clés Stripe, ElevenLabs, Supabase et le nom de domaine — et que se passe-t-il si vous seul êtes indisponible le 31 décembre ? »
10. « Quel est le prix de l'offre Premium, et que contient-elle exactement ? » *(La plus simple — et la seule à laquelle le produit sait déjà répondre parfaitement.)*

---

*Rapport rédigé en lecture seule par Banquier, le 22/11/2026 ~05:00 UTC. Aucun fichier de code modifié ; ce fichier journal est le seul livrable de la PR. Tests rejoués sur `main` `b559da3` : 543/543 ✅, `test:parser` ✅, `tsc` ✅.*
