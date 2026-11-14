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
- Voix : `src/lib/voice.ts` — Web Speech API par défaut (sans clé), ElevenLabs **optionnel** via `NEXT_PUBLIC_ELEVENLABS_API_KEY` (voir `.env.local.example`), bascule automatique sans erreur.
- Saisie intelligente : parseur français maison `src/lib/parser.ts` (« sport demain 14h », « !lundi réunion »…).

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run test:parser` | tests du parseur FR + conflits + commandes vocales (sans navigateur) |
| `npm run icons` | régénère les icônes PWA + le manifest depuis `design/tokens.ts` |

## Raccourcis

`N` nouvel événement · `T` saisie rapide de tâche · `V` assistant vocal · `1/2/3` vues Jour/Semaine/Mois · `?` aide.

## Pages publiques & lancement

| Route | Rôle |
|---|---|
| `/` | Accueil public (landing « Ton planning qui te parle ») — un profil existant sur l’appareil est redirigé vers `/aujourdhui` |
| `/aujourdhui` | Vue « Aujourd’hui » (anciennement `/`) |
| `/inscription` · `/onboarding` | Création du compte local (prénom, sans serveur) + prise en main en 3 étapes |
| `/demo` | Semaine type de Sofia, graphiste indépendante — lecture seule, sans compte, aucune donnée réelle |
| `/presse` | Fiche de presse : description, slogan, logo et visuels téléchargeables |
| `/offres` | Offre gratuite et principes local-first |
| `/legal` | Mentions légales, confidentialité (localStorage uniquement) et CGU |

SEO : titres et descriptions en français, `robots: index, follow` explicite (aucun `noindex`), `/robots.txt`,
`/sitemap.xml` (pages publiques), image Open Graph 1200×630 générée à la build (`/opengraph-image` : logo + slogan
sur fond `#FAFAFC`). URL publique configurable via `NEXT_PUBLIC_SITE_URL` (défaut `https://centeryou.vercel.app`).

## PWA

`public/manifest.webmanifest` + icônes 192/512 (générées) : installable, thème violet `#7C5CFF`.
