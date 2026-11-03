# Étude FlowPlan — 50 pistes d'amélioration distinctes (2026-11-02)

Chaque point est autonome, justifié, et noté (impact / effort / priorité).
Impact : ⭐ faible à ⭐⭐⭐⭐⭐ changer la donne. Effort : S / M / L.

---

## A. Expérience de saisie (texte & voix)

1. **Autocomplétion intelligente du champ** — propose des événements fréquents (« réunion équipe », « dentiste ») au fur et à mesure. *Pourquoi : la saisie vocale/texte répétitive fatigue ; l'autocomplétion divise par 2 le temps de saisie.* ⭐⭐⭐⭐ / S / P1
2. **Correction vocale en direct** — affiche la phrase reconnue en live (interim results) au lieu d'attendre la fin. *Pourquoi : on voit immédiatement si la reconnaissance a raté, on corrige tout de suite.* ⭐⭐⭐⭐ / S / P1
3. **Commandes vocales de contrôle** — « annule », « supprime le dernier », « montre le mois ». *Pourquoi : vrai contrôle mains-libres, utile en conduisant/cuisine.* ⭐⭐⭐⭐ / M / P2
4. **Dictionnaire perso** — l'app apprend tes mots (noms de clients, lieux). *Pourquoi : « chez Martin » reconnu même si « Martin » est rare.* ⭐⭐⭐ / M / P2
5. **Saisie rapide « + » flottant** — bouton fixe en bas à droite sur mobile pour ajouter sans remonter. *Pourquoi : sur téléphone, le haut est loin du pouce.* ⭐⭐⭐⭐ / S / P1
6. **Historique des 20 dernières phrases** — réutiliser une saisie d'hier en un appui. *Pourquoi : on redit souvent les mêmes choses chaque semaine.* ⭐⭐⭐ / S / P2

## B. Compréhension du langage (parser)

7. **Plages horaires naturelles** — « de 9h à 11h », « entre 14 et 16h ». *Pourquoi : tout le monde parle comme ça.* ⭐⭐⭐⭐ / S / P1 (partiellement fait : « à » géré, « de…à » à finaliser)
8. **Durées relatives** — « dans 2 semaines », « le mois prochain ». *Pourquoi : on pense en relatifs, pas qu'en dates.* ⭐⭐⭐⭐ / S / P1
9. **Lieux extraits** — « dentiste chez Dr Martin à Lyon » → champ lieu. *Pourquoi : un planning sans lieu est incomplet ; utile pour les itinéraires.* ⭐⭐⭐⭐ / M / P2
10. **Événements liés** — « déj avec Sam juste avant le dentiste » → proposition de chaînage. *Pourquoi : la vraie vie enchaîne les RDV.* ⭐⭐⭐ / L / P3
11. **Détection de conflits à la saisie** — avertir AVANT d'ajouter si ça chevauche. *Pourquoi : corriger avant, pas après.* ⭐⭐⭐⭐⭐ / S / P1
12. **Suggestions de créneaux libres** — « propose-moi 3 créneaux libres mardi ». *Pourquoi : c'est le vrai besoin derrière un planning.* ⭐⭐⭐⭐⭐ / M / P1
13. **Événements sur plusieurs jours** — « du 12 au 14 juillet ». *Pourquoi : vacances, déplacements.* ⭐⭐⭐⭐ / M / P2
14. **Répétition personnalisée** — « tous les 2 lundis », « le 1er lundi du mois ». *Pourquoi : les vraies récurrences ne sont pas hebdo simples.* ⭐⭐⭐⭐ / M / P2
15. **Annulation d'une occurrence** — « pas le 9 novembre ». *Pourquoi : une récurrence a toujours une exception.* ⭐⭐⭐⭐ / M / P2

## C. Vues & navigation

16. **Vue Agenda (liste chronologique)** — 4e vue à côté de Jour/Semaine/Mois. *Pourquoi : certains pensent en liste, d'autres en grille.* ⭐⭐⭐⭐ / M / P1
17. **Mini-calendrier permanent** (à côté, cliquable pour sauter à une date). *Pourquoi : navigation directe sans les flèches.* ⭐⭐⭐⭐ / S / P1
18. **Recherche de date** — taper « 12 mai » dans la recherche = saute à cette date. *Pourquoi : on cherche souvent une date, pas un mot.* ⭐⭐⭐ / S / P2
19. **Zoom sur la semaine (2 jours en grand)** — mode « focus 2 jours ». *Pourquoi : leWednesday-only view n'existe pas.* ⭐⭐⭐ / M / P3
20. **Vue « année »** — 12 mini-mois avec compteurs. *Pourquoi : vue d'ensemble pour planifier les vacances.* ⭐⭐⭐ / M / P3

## D. Édition & interactions

21. **Resize par les bords en vue Jour** — tirer le bas d'un événement pour changer sa durée. *Pourquoi : plus rapide que la modale pour ajuster.* ⭐⭐⭐⭐⭐ / M / P1
22. **Dupliquer vers le lendemain** — « répéter demain » en un clic. *Pourquoi : les routines quotidiennes se recopient.* ⭐⭐⭐⭐ / S / P1 (Ctrl+D existe pour même jour)
23. **Déplacer par clavier** — Ctrl+flèches déplace l'événement d'un jour. *Pourquoi : accessibilité + rapidité clavier.* ⭐⭐⭐⭐ / S / P2
24. **Sélection multiple** — Shift+clic pour déplacer/supprimer un groupe. *Pourquoi : « décaler toute ma semaine » en une fois.* ⭐⭐⭐⭐ / M / P2
25. **Copier-coller d'événement** — Ctrl+C / Ctrl+V. *Pourquoi : standard universel attendu.* ⭐⭐⭐⭐ / S / P2

## E. Design & animations

26. **Barre de progression du jour** — ligne « maintenant » qui traverse la vue Jour en direct. *Pourquoi : on sait où on en est dans la journée.* ⭐⭐⭐⭐⭐ / S / P1
27. **Couleurs par catégorie éditables** — choisir sa palette. *Pourquoi : chacun a ses codes couleur.* ⭐⭐⭐ / S / P2
28. **Thème « saisons »** — palettes automatiques selon la saison. *Pourquoi : détail wow, zéro config.* ⭐⭐ / S / P3
29. **Mode « papier »** — thème clair style agenda papier pour impression. *Pourquoi : certains impriment leur semaine.* ⭐⭐⭐ / S / P3
30. **Transitions de page fluides (View Transitions API)** — entre les vues. *Pourquoi : le changement Jour→Semaine doit couler, pas couper.* ⭐⭐⭐⭐ / M / P2

## F. Données, export & partage

31. **Export PDF paysage de la semaine** — mise en page propre. *Pourquoi : l'impression actuelle est brute.* ⭐⭐⭐⭐ / M / P1
32. **Partage lecture seule par lien** — URL temporaire qui montre le planning sans compte. *Pourquoi : montrer son dispo à quelqu'un sans lui donner l'édition.* ⭐⭐⭐⭐ / L / P3 (nécessite un mini-serveur)
33. **Import CSV** (Excel) — colonnes titre/date/heure. *Pourquoi : migration depuis un tableur existant.* ⭐⭐⭐⭐ / M / P2
34. **Export JSON** — sauvegarde complète lisible/modifiable. *Pourquoi : souveraineté totale des données.* ⭐⭐⭐⭐ / S / P1
35. **Auto-backup horodaté** — un fichier .ics/JSON par jour dans un dossier choisi. *Pourquoi : protection contre la perte, zéro cloud.* ⭐⭐⭐⭐ / M / P2
36. **Comparaison semaine vs semaine** — « j'ai 4h de sport en moins cette semaine ». *Pourquoi : bilan chiffré motivant.* ⭐⭐⭐ / M / P3

## G. Rappels & notifications

37. **Rappel personnalisable par événement** — 5 min, 15 min, 1h, veille. *Pourquoi : pas tout le monde veut 15 min.* ⭐⭐⭐⭐ / S / P1
38. **Rappel « partir maintenant »** — basé sur la durée de trajet estimée. *Pourquoi : le vrai moment critique c'est le départ.* ⭐⭐⭐⭐ / M / P2
39. **Mode « ne pas déranger »** — couper les rappels sur une plage horaire. *Pourquoi : réunions, sieste, nuit.* ⭐⭐⭐ / S / P2
40. **Résumé du lendemain le soir** — notification récapitulative à 20h. *Pourquoi : préparer sa journée en avance.* ⭐⭐⭐⭐ / S / P2

## H. Sécurité & confiance

41. **Verrouillage auto après inactivité** — re-lock après 5 min sans action. *Pourquoi : un PC ouvert ne doit pas rester déverrouillé.* ⭐⭐⭐⭐⭐ / S / P1
42. **Journal d'audit local** — qui a modifié quoi, quand (local only). *Pourquoi : traçabilité sans serveur.* ⭐⭐⭐ / M / P3
43. **Export chiffré du vault** — backup du planning chiffré avec le même PIN. *Pourquoi : restaurer sur un autre appareil sans le cloud.* ⭐⭐⭐⭐ / M / P2
44. **Indicateur visuel « verrouillé/déverrouillé »** — cadenas visible en permanence. *Pourquoi : on sait toujours dans quel état sont ses données.* ⭐⭐⭐⭐ / S / P1

## I. Performance & technique

45. **Virtualisation de la vue année** — ne rendre que les cellules visibles. *Pourquoi : 365 jours × événements = lag potentiel.* ⭐⭐⭐ / M / P3
46. **Debounce de la recherche** — 150 ms. *Pourquoi : la recherche tape à chaque frappe, actuellement re-render à chaque touche.* ⭐⭐⭐ / S / P1
47. **Migration de schéma du stockage** — versionner le localStorage (v1→v2) avec migration auto. *Pourquoi : aujourd'hui un changement de format casse les données.* ⭐⭐⭐⭐ / M / P2
48. **Mode hors-ligne PWA installée testé** — badge « hors-ligne » quand le réseau tombe. *Pourquoi : l'app est déjà offline-first, il faut le montrer.* ⭐⭐⭐ / S / P2

## J. Voix & accessibilité

49. **Lecture du planning du jour à la demande** — « lis-moi ma journée ». *Pourquoi : accessibilité (malvoyants) + conduite.* ⭐⭐⭐⭐⭐ / M / P1
50. **Taille de police réglable + contraste renforcé (AAA)** — 3 tailles, mode contraste max. *Pourquoi : seniors et malvoyants = vrai public, aujourd'hui c'est AA seulement.* ⭐⭐⭐⭐⭐ / S / P1

---

## Synthèse graphique (priorités)

- **P1 (à faire maintenant)** : 1, 2, 5, 7, 8, 11, 12, 16, 17, 21, 22, 26, 31, 34, 37, 41, 44, 46, 49, 50 → 20 points
- **P2 (ensuite)** : 3, 4, 6, 10, 13, 14, 15, 18, 23, 24, 25, 27, 30, 33, 35, 38, 39, 40, 43, 47, 48 → 21 points
- **P3 (plus tard)** : 9, 19, 20, 28, 29, 32, 36, 42, 45 → 9 points
