# Centeryou

Planning interactif personnel — agenda + tâches + assistant vocal, **100 % en français**, local-first (aucun backend, aucune base de données : persistance `localStorage`).

## Lancer l'app

```bash
cd apps/centeryou
npm install
npm run dev      # puis ouvrir http://localhost:3000
```

Production : `npm run build && npm start`.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand + lucide-react. Aucun autre paquet.

- Design system : `design/tokens.ts` (source unique des couleurs/ombres/rayons/typo), câblé dans `tailwind.config.ts`.
- Persistance : store Zustand `src/lib/store.ts` (`persist`, clé `centeryou-v1`).
- Voix : `src/lib/voice.ts` — Web Speech API par défaut (gratuite, sans clé), voix premium ElevenLabs via la **route API serveur** `/api/voix` (voir ci-dessous), bascule automatique sans erreur.
- Saisie intelligente : parseur français maison `src/lib/parser.ts` (« sport demain 14h », « !lundi réunion »…).

## Sécurité de la voix (clé ElevenLabs)

La clé `NEXT_ELEVENLABS_API_KEY` (déjà enregistrée sur Vercel) est une variable **serveur uniquement** : elle est lue exclusivement par la route API `src/app/api/voix/route.ts` et n'apparaît **jamais** dans le bundle navigateur (aucun `NEXT_PUBLIC_*`, rien d'inliné dans `next.config.mjs` — vérifié dans le build de production).

- Voix premium (Sarah, `EXAVITQu4vr4xnSDxMaL`) : réservée aux **profils renseignés** (prénom dans Réglages), via `POST /api/voix`.
- **Quota de protection** : 300 caractères/jour par profil. Au-delà, la route renvoie `429` avec un message français clair et le client bascule en douceur sur la voix du navigateur.
- **Anonymes** (pas de prénom) : la voix du navigateur (Web Speech API, gratuite), sans erreur.
- En-têtes de sécurité sur toutes les réponses (`next.config.mjs` : CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, + `Cache-Control: no-store` sur `/api/voix`).

Configuration (voir `.env.local.example`) : `NEXT_ELEVENLABS_API_KEY` (et optionnellement `NEXT_ELEVENLABS_VOICE_ID`), variables serveur déjà présentes sur Vercel — ne jamais leur ajouter le préfixe `NEXT_PUBLIC_` côté client.

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run test:parser` | tests du parseur FR + conflits + commandes vocales (sans navigateur) |
| `npm run icons` | régénère les icônes PWA + le manifest depuis `design/tokens.ts` |

## Raccourcis

`N` nouvel événement · `T` saisie rapide de tâche · `V` assistant vocal · `1/2/3` vues Jour/Semaine/Mois · `?` aide.

## PWA

`public/manifest.webmanifest` + icônes 192/512 (générées) : installable, thème violet `#7C5CFF`.
