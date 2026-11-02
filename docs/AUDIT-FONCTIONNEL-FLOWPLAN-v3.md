# Audit fonctionnel & UX FlowPlan v3 — 2026-11-02

Basé sur les retours réels (captures utilisateur) + revue du code.

## Corrigé dans cette version
- Modale qui ne se fermait jamais visuellement (CSS `display:flex` battait `[hidden]`) → pilotage par classe `.open` + test de régression.
- « lundi » dit un lundi allait à la semaine prochaine → aujourd'hui ; « prochain lundi » = strictement futur.
- Double-clic sur « Générer » créait des doublons → dédoublonnage automatique.
- Conflits affichés pour toutes les semaines → limités à la semaine affichée.
- Boutons éparpillés en haut → menu ⋯, exemples repliés, hero compact.
- Reset des données nécessitant la console → bouton ⋯ → « Réinitialiser mes données ».

## Améliorations restantes, par priorité

| Priorité | Idée | Pourquoi |
|---|---|---|
| P0 | **Undo** (Ctrl+Z) après ajout/suppression/déplacement | un clic en trop = frustration immédiate |
| P0 | Toast au lieu de la ligne de statut pour les erreurs | plus visible |
| P1 | **Import .ics** (lecture de calendrier existant) | symétrie avec l'export, indispensable pour migrer depuis Google Agenda |
| P1 | Vue **jour** (détail d'une journée, glisser pour régler les horaires) | précision quand la semaine est chargée |
| P1 | Mode **focus** : masquer tout sauf la catégorie choisie | concentration |
| P2 | Rappels navigateur (Notification API, opt-in) | utile mais demande une permission → à valider avec l'utilisateur |
| P2 | Synchronisation optionnelle entre appareils (chiffrée, via un simple fichier export/import) | 100 % local toujours, mais multi-appareils |
| P2 | Raccourcis clavier documentés (Ctrl+Entrée, Échap, ←/→ semaines) | discoverability |
| P3 | Impression améliorée (liste plutôt que grille sur mobile) | — |
| P3 | Thème auto (suit le thème système `prefers-color-scheme`) | confort |

## Métriques à suivre quand on ouvrira à d'autres
- taux de conversion phrase → planning (nb événements créés / nb générations)
- temps moyen pour ajouter un événement à la main vs à la voix

## Non-fait volontairement
- Pas de compte, pas de cloud, pas d'analytics : c'est le positionnement souveraineté de FlowPlan.
