# AGENTS.md — Règles d'équipe Centeryou

Ce fichier s'adresse à tous les agents travaillant sur ce dépôt. Lis-le en entier avant d'agir.

## Ton identité et ton journal
- Tu portes un prénom d'agent. Crée et tiens à jour ton journal : `apps/centeryou/docs/journal/<ton-prénom>.md` (mission, date et heure, avancée, décisions, lien de ta PR).
- **Avant de commencer et avant de finir**, lis le dossier `apps/centeryou/docs/journal/` : d'autres agents travaillent en parallèle. Ne refais pas ce qui est déjà fait, ne touche pas à la zone d'un autre (voix, comptes, paiement, design, tests…).

## Publication en temps réel
- Pousse ta branche (`git push`) à chaque étape significative, même en cours de travail.
- Ouvre ta pull request dès que possible (brouillon accepté), en ciblant la **branche par défaut du dépôt : `vibe/novaloom-suite-fe60b6`**. ⚠️ N'utilise JAMAIS la branche `main` comme base (c'est une vieille branche gelée).
- Mets à jour ton journal à chaque push, avec l'heure.

## Coordination entre camps
- Avant de terminer : synchronise-toi avec la branche par défaut (`vibe/novaloom-suite-fe60b6`) et résous tes propres conflits — jamais l'inverse.
- Si ta mission chevauche celle d'un autre agent (regarde son journal), arrête-toi et signale-le dans ton rapport au lieu d'écraser son travail.

## Règles qualité bloquantes
- `npm run build` doit passer sans erreur avant toute PR.
- Interface 100 % française ; tokens inchangés (#7C5CFF, #5B3FE8, #2DD4BF, #FFB020, #FF6B6B, #FAFAFC, #1A1B2E) ; jamais de barre latérale ; ondes concentriques réservées à la voix.
- Ne renomme jamais les variables d'environnement ; aucune clé ni secret dans le code ou le bundle navigateur.
- Ne casse aucune fonctionnalité existante : parcours l'application avant de terminer.
