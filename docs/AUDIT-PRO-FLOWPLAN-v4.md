# Audit PRO FlowPlan v4.4 — 2026-11-02

Objectif : utilisable par tout le monde (pros, étudiants, seniors), pro, accessible.
109 tests, 0 échec.

## Corrigé dans cet audit
| Problème | Fix |
|---|---|
| Démo/confettis trop rapides (illisible) | démo 950 ms/élément, génération 750 ms, particules lentes (gravité 0.07, 30 particules, 90 frames) |
| Thème clair écrasé par le bloc sombre `!important` | bloc scopé `:root[data-theme="dark"]` + test de régression |
| Accessibilité clavier | focus trap dans les modales, retour du focus à la fermeture, `role="dialog" aria-modal`, aria-labels |
| SEO / partage | meta description, keywords, Open Graph, `color-scheme: dark light` |
| Rythme voix vs visuel | voix en file d'attente (pas de coupure), rate 1.25 |

## Déjà en place (vérifié)
- 100 % local, chiffrement AES-GCM optionnel (vault PIN), zéro compte, zéro réseau
- PWA hors-ligne, Electron durci, CSP stricte
- Undo 50 niveaux, dédoublonnage, conflits, catégories auto, recherche, filtres, export/import .ics
- Vues Jour/Semaine/Mois, drag & drop, mode présentation, mode focus
- Voix TTS (meilleure voix FR auto) + STT micro, génération progressive animée
- `prefers-reduced-motion` respecté partout
- 109 tests : parser, planner, store chiffré, ICS injection, attaques simulées, DOM (modales, undo, présentation, thème, a11y)

## Prochaines étapes possibles (hors code)
- Déploiement HTTPS public (PWA installable sur téléphone)
- Installeur Windows/macOS (electron-builder)
- Traduction EN/ES si tu veux vendre à l'international
- Voix premium (Mistral TTS) — nécessite une clé API côté serveur, à discuter quand on déploiera
