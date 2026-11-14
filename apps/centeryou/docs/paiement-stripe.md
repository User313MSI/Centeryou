# Mode d'emploi — Vendre Centeryou Premium avec Stripe (français)

Tout est déjà codé dans l'app. Il reste 3 étapes de configuration : un compte Stripe,
des variables d'environnement sur Vercel, et (optionnel) le mode réel.

## 1. Créer le compte Stripe

1. Va sur [dashboard.stripe.com](https://dashboard.stripe.com) et crée un compte (ou connecte-toi).
2. Reste en **mode Test** au début : les clés commencent par `sk_test_` / `pk_test_`,
   et tu paies avec la carte fictive `4242 4242 4242 4242` (date et CVC quelconques).
3. Récupère ta **clé secrète** : menu **Developers → API keys → « Secret key »** (bouton « Reveal test key »). Elle ressemble à `sk_test_51…`.

## 2. Coller chaque variable dans Vercel

Dans ton projet Vercel : **Settings → Environment Variables** (ajoute pour
Production + Preview + Development), puis redéploie :

| Variable | Où la trouver dans Stripe | Obligatoire |
|---|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret key (`sk_test_…` en test, `sk_live_…` en réel) | oui |
| `STRIPE_WEBHOOK_SECRET` | voir étape 3 ci-dessous (`whsec_…`) | oui |
| `STRIPE_PRICE_ID_PREMIUM` | Products → crée « Centeryou Premium », 4,99 €/mois récurrent → copie le `price_…` | non (sinon le prix est construit depuis `src/lib/plans.ts`) |
| `APP_URL` | l'URL de prod, ex. `https://centeryou.vercel.app` | recommandé |
| `ELEVENLABS_API_KEY` | [dashboard.elevenlabs.io](https://dashboard.elevenlabs.io) → API keys (voix premium, servie par le serveur) | non (sinon voix du navigateur) |
| `ELEVENLABS_VOICE_ID` | ElevenLabs → voix choisie (défaut : voix FR féminine) | non |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Vercel → Storage → KV → Connect (synchro multi-appareils durable) | non |

En local : copie `.env.local.example` en `.env.local` et remplis les mêmes valeurs.

**Aucune clé n'est jamais dans le code ni dans le bundle navigateur** : elles ne sont
lues que par les routes serveur `/api/*`.

## 3. Activer le webhook (mise à jour fiable du statut)

- **En local** : installe la [Stripe CLI](https://stripe.com/docs/stripe-cli), puis :
  ```bash
  stripe login
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```
  Copie le `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET` (`.env.local`).
- **En production (Vercel)** : Stripe dashboard → **Developers → Webhooks → Add endpoint** :
  URL = `https://centeryou.vercel.app/api/stripe/webhook`, événements à envoyer :
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`.
  Copie le **Signing secret** (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET` sur Vercel.

Si un webhook échoue, rien ne casse : l'app resynchronise le statut directement
depuis Stripe à chaque ouverture de Réglages.

## 4. Passer en mode réel (mise en production payante)

1. Dans le dashboard Stripe, active ton compte (formulaire « Activate your account » :
   identité, coordonnées bancaires pour les virements).
2. Bascule en **mode Live** (toggle en haut à gauche du dashboard) et récupère la
   vraie clé secrète `sk_live_…`.
3. Sur Vercel, remplace `STRIPE_SECRET_KEY` par la clé live, recrée un webhook en
   mode live (même URL, nouveau `whsec_…` → `STRIPE_WEBHOOK_SECRET`), puis redéploie.
4. Test réel conseillé : paie 4,99 € avec ta vraie carte, vérifie le statut Premium,
   annule dans le portail client (menu « Gérer l'abonnement »), confirme que Premium
   reste actif jusqu'à la fin du mois puis retombe à Découverte.

## 5. Parcours de test complet (mode test)

1. Ouvre l'app → **Réglages** → « Passer Premium — 4,99 €/mois ».
2. Sur la page Stripe Checkout (en français), paie avec `4242 4242 4242 4242`.
3. Retour automatique dans l'app : toast de bienvenue, badge **Actif**, offre
   **Premium**, date de renouvellement affichée.
4. « Gérer l'abonnement » → portail Stripe → **Annuler** → retour dans l'app :
   badge **Annulé**, mais Premium actif jusqu'à la fin de la période (protection douce).
5. Utilise la voix 3 fois en Découverte : au 3ᵉ essai, toast « Passer Premium ».
6. Utilisateur gratuit : rien de cassé — voix du navigateur, pas de mode sombre,
   aucune erreur.

## Modifier les offres

Un seul fichier : `src/lib/plans.ts` (noms, prix, libellés, limite de voix gratuite).
Si tu crées un Price dans le dashboard Stripe, renseigne son `price_…` dans
`STRIPE_PRICE_ID_PREMIUM` pour l'utiliser à la place du prix construit à la volée.
