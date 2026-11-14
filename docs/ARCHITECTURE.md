# Architecture — Centeryou

```
Dev-Apps/
├── AGENTS.md                # Règles d'équipe (à lire avant d'agir)
├── brand.config.json        # Marque, palette et crédits (source unique)
├── README.md                # Présentation
├── docs/                    # Documentation
└── apps/
    └── centeryou/           # Planning interactif personnel (Next.js + PWA)
        ├── design/tokens.ts # Design tokens (source de vérité unique)
        ├── src/app/         # Pages (App Router) : accueil, planning, tâches, voix, réglages
        ├── src/components/  # Composants d'interface
        ├── src/lib/         # Store Zustand, parseur FR, voix, dates, catégories
        └── public/          # Manifest + icônes PWA (générés depuis les tokens)
```

## Principes

- **Un seul produit, une stack légère.** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand + lucide-react — aucun autre paquet.
- **Design system centralisé.** Couleurs, ombres, rayons et typographie vivent uniquement dans `apps/centeryou/design/tokens.ts`, câblés dans `tailwind.config.ts` ; les icônes et le manifest sont générés depuis ces tokens (`npm run icons`).
- **Local-first.** Persistance `localStorage` via le store Zustand (`src/lib/store.ts`, clé `centeryou-v1`) : aucun backend, aucune base de données.
- **Voix.** Web Speech API par défaut, sans clé ; ElevenLabs optionnel via variable d'environnement (voir `.env.local.example`) — aucune clé en dur dans le code.
- **Saisie intelligente.** Parseur de langage naturel en français (`src/lib/parser.ts`) : « sport demain 14h », « !lundi réunion »…
- **Testé.** `npm run test:parser` (parseur, conflits, commandes vocales) et `npm run build` doivent passer avant toute PR (voir `docs/PUBLISH.md`).
