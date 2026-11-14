# Elena — 2026-11-14 — Mission : paiement (Stripe)

## Contexte
Centeryou est local-first (Next.js App Router + TS + Tailwind + Zustand, persistance
localStorage, aucun backend). Mission : vendre l'offre **Premium** avec **Stripe**
(Checkout + portail client), sans rien casser pour les utilisateurs gratuits.

## Ce qui a été livré

1. **Offres configurables en un seul fichier** : `src/lib/plans.ts`
   (Découverte — gratuite ; Premium — 4,99 €/mois, voix premium illimitée,
   mode sombre, synchro multi-appareils). Prix/noms modifiables là uniquement.
2. **Paiement** : bouton « Passer Premium » dans Réglages (carte Abonnement) et
   toast CTA après les 3 essais gratuits de voix premium → `POST /api/checkout`
   → Stripe Checkout hébergé **en français** (`locale: 'fr'`) → retour
   `/reglages?checkout=success&session_id=…` → statut synchronisé + toast.
3. **Webhook** `POST /api/stripe/webhook` : signature HMAC-SHA256 vérifiée
   (`STRIPE_WEBHOOK_SECRET`, `node:crypto`, comparaison temps constant), événements
   `checkout.session.completed`, `customer.subscription.updated/deleted`,
   `invoice.payment_failed` → cache serveur de statut. Signature invalide → 400,
   erreur → 500 (Stripe réessaie) ; **si le webhook échoue, rien ne casse** car le
   client resynchronise le statut directement depuis Stripe (`/api/subscription/status`).
4. **Page Abonnement** dans Réglages (`src/components/settings/subscription-card.tsx`) :
   offre actuelle, statut (actif / impayé / annulé), date de renouvellement,
   « Gérer l'abonnement » → portail Stripe (changer d'offre, annuler).
5. **Protection douce** : annulation via le portail Stripe = `cancel_at_period_end` ;
   Premium reste actif jusqu'à `current_period_end`, puis retour à Découverte
   **sans perdre les données** (rien n'est supprimé, le mode sombre se désactive).
6. **Clés uniquement en variables d'environnement serveur** (`STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PREMIUM?`, `APP_URL`,
   `KV_REST_API_URL/TOKEN?`) — vérifié : aucune clé ni URL Stripe/ElevenLabs dans
   `.next/static`. La voix premium passe par la route serveur `/api/voix`
   (clé serveur, « quota serveur » de 300 car/jour) ; l'ancienne clé
   `NEXT_PUBLIC_ELEVENLABS_API_KEY` n'est plus injectée dans le bundle.

## Architecture retenue
- **Zéro dépendance ajoutée** : appels REST Stripe en `fetch` côté serveur
  (`src/lib/server/stripe.ts`) + vérification de signature webhook en `node:crypto`.
  Pas de SDK npm, pas de base de données : **Stripe est la source de vérité** du
  statut d'abonnement ; le webhook alimente un cache de repli.
- Identifiant d'appareil local (`deviceId`, localStorage) transmis comme
  `client_reference_id` à Checkout pour rattacher l'abonnement à l'appareil.
- Synchro multi-appareils (Premium) : snapshot local poussé vers `/api/sync`, indexé
  par customer Stripe ; stockage Vercel KV si `KV_REST_API_URL/TOKEN` configurés,
  sinon repli mémoire (documenté dans le mode d'emploi).
- Mode sombre Premium : couleurs Tailwind passées en variables CSS (`--c-*`),
  `html.dark` posé uniquement si Premium actif — le thème clair validé est inchangé.

## Vérifications
- `npm run build` ✅ (8 pages statiques + 6 routes API dynamiques)
- `npm run test:parser` ✅ tous les tests passent
- grep `.next/static` : aucune clé Stripe/ElevenLabs, aucune URL `api.stripe.com` ✅

## Parcours de test Stripe (mode test)
1. `stripe listen --forward-to localhost:3000/api/stripe/webhook` (ou endpoint Vercel en prod)
2. Réglages → « Passer Premium » → Checkout test (carte `4242 4242 4242 4242`) → retour app → badge « Actif », offre Premium
3. « Gérer l'abonnement » → portail → annuler → retour → « Annulé », Premium conservé jusqu'à la fin de période
4. Après la fin de période (ou `stripe` test clock) → retour à Découverte, données intactes

## Notes / limites connues
- Appareil sans compte : l'abonnement est rattaché au `deviceId` local (local-first,
  pas d'auth) — un changement de navigateur = nouvel appareil.
- Synchro multi-appareils : dernier écrivain gagne ; durable seulement avec Vercel KV
  (voir `docs/paiement-stripe.md`).

## 2026-11-14 (plus tard) — Synchronisation avec la branche par défaut

La branche par défaut `vibe/novaloom-suite-fe60b6` a avancé (PR #6 de Céleste :
voix ElevenLabs 100 % serveur via `/api/voix` + quota 300 car/jour + en-têtes de
sécurité ; PR #8 d'Alpha : audit + sanitation du localStorage). Conflits résolus en
gardant les deux côtés :

- `voice.ts` : endpoint `/api/voix` de Céleste conservé (clé serveur, quota, toast 429) ;
  ma barrière Stripe ajoutée devant (`speak()` tente la voix premium si Premium actif
  ou essai gratuit restant, puis bascule Web Speech). Ma route doublon
  `/api/voice/speak` supprimée.
- `store.ts` : sanitation des entrées persistées (Alpha/Céleste) conservée + mes champs
  `deviceId` / `subscription` / `voiceQuota` / `syncUpdatedAt` (fusion douce avec défauts).
- `next.config.mjs` : en-têtes de sécurité conservés, aucun `env:` (clés jamais inlinées).
- `.env.local.example`, `README.md`, `voix/page.tsx` : doc fusionnée (voix serveur +
  paiement Stripe).

**PR : https://github.com/User313MSI/Dev-Apps/pull/16** (base : branche par défaut
`vibe/novaloom-suite-fe60b6`, conformément à AGENTS.md — jamais `main`).
