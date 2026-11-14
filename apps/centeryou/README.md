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

## PWA

`public/manifest.webmanifest` + icônes 192/512/maskable (générées) : installable, thème violet `#7C5CFF`.
Hors-ligne réel via `public/sw.js` (coquille précachée, assets et pages en cache), invite d'installation
discrète (Android `beforeinstallprompt`, astuce iOS Partager → « Sur l'écran d'accueil »).

## Mobile

Barre d'onglets en bas (Aujourd'hui / Planning / Tâches / Voix), navigation haute réservée au desktop.
Gestes tactiles : glisser horizontalement dans le planning = changer de jour/semaine/mois, glisser une
tâche vers la droite = terminée, appui long sur une tâche = menu d'actions. Zones sûres (`env(safe-area-inset-*)`,
`viewport-fit: cover`) et clavier (`interactive-widget: resizes-content`) pris en charge ; audit 360/390 px
(sans débordement, texte ≥ 12 px, cibles ≥ 44 px).
