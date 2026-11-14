# Publication — Centeryou

## Avant toute PR
- [ ] `cd apps/centeryou && npm run build` — build de production sans erreur
- [ ] `npm run test:parser` — tests du parseur FR, des conflits et des commandes vocales
- [ ] Parcourir l'application de bout en bout (accueil, planning, tâches, voix, réglages) — aucune régression

## PWA
- [ ] `npm run icons` régénère le manifest et les icônes 192/512 depuis `design/tokens.ts`
- [ ] Application installable (ajout à l'écran d'accueil), thème violet `#7C5CFF`

## Déploiement
- [ ] Déployer `apps/centeryou/` (Next.js standard) — aucun backend ni base de données requis (local-first)
- [ ] Variables d'environnement uniquement via l'environnement de la plateforme (ex. Vercel), jamais dans le code — voir `.env.local.example`

## Règles de sécurité
- [ ] Aucune clé ni secret dans le dépôt ni dans le bundle navigateur
- [ ] Interface 100 % française ; tokens de design inchangés (`#7C5CFF`, `#5B3FE8`, `#2DD4BF`, `#FFB020`, `#FF6B6B`, `#FAFAFC`, `#1A1B2E`)
