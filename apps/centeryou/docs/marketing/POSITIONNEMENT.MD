# POSITIONNEMENT — Centeryou

- **Mission** : M-15 Trompette (campagne « Grand V », vague 1) — marketing & plan de lancement.
- **Auteur** : Trompette, 21/11/2026. Zone : `apps/centeryou/docs/marketing/**` uniquement.
- **Règle d'or tenue** : chaque promesse ci-dessous est **vraie aujourd'hui** dans le produit (vérifiée dans le code de `main` au 21/11/2026). Rien n'est promis pour plus tard.
- **Ton de marque** : chaleureux, direct, jamais corporate, jamais hype.

---

## La phrase d'or

> **« Le seul planning qui te souhaite bon matin. »** (9 mots)

Baseline produit (slogan déjà en ligne sur `/`) : **« Ton planning qui te parle. »**

La phrase d'or dit la différenciation ; le slogan dit le produit. On les utilise ensemble, jamais l'un sans l'autre.

---

## Nos 3 promesses — et leurs preuves

### 1. « Tu ranges ton planning en parlant français, comme à un ami. »

**Preuve (vérifiée aujourd'hui)** : le parseur maison, écrit pour le français, comprend « sport demain 14h », « dentiste mardi 10h30 santé », « !lundi réunion » (point d'exclamation = priorité haute), « aujourd'hui », « après-demain », les jours de la semaine, « 14h », « 14h30 », « 14:30 », « midi ». Cinq catégories (Travail, Perso, Santé, Focus, Autre), trois priorités, répétition chaque jour / semaine / mois. La même phrase marche **à la voix** : « ajoute sport demain 14h », « mon programme », « quoi de prévu demain ? », « c'est fait sport » (il coche la tâche et te félicite). Page `/voix` + saisie rapide.

### 2. « Chaque matin, ton planning te dit bonjour. »

**Preuve (vérifiée aujourd'hui)** : le **film de lancement** — 5 scènes, environ 38 secondes, qui se joue chaque matin à l'ouverture de l'app — commence par la salutation réelle de l'heure (« Bonjour », « Bon après-midi »…) suivie de **ton prénom**, puis te donne tes vrais chiffres du jour (événements, tâches accomplies), ta prochaine étape, ta progression de la semaine et ta série de jours organisés. Il se lit **à voix haute** (c'est le texte du brief du matin, la même source). Un « bon matin » personnalisé, avec tes vrais rendez-vous — pas une notification générique. Carte « Ton brief du matin » + film sur `/aujourd'hui`.

### 3. « Tes données restent chez toi. »

**Preuve (vérifiée aujourd'hui)** : Centeryou est **100 % local par défaut** — événements, tâches et réglages vivent dans le `localStorage` de ton navigateur. Aucun compte serveur n'est nécessaire, aucun cookie publicitaire ni traceur tiers, rien n'est vendu ni partagé, et tout s'efface en un clic dans Réglages (« Effacer toutes mes données »). Tu peux exporter ta sauvegarde en JSON à tout moment. Le compte en ligne n'existe qu'en option (offre Premium) pour la sauvegarde et la synchro multi-appareils. Page `/legal` et `/confidentialite`.

---

## Portrait de l'utilisateur idéal

**Camille, 34 ans, cheffe de projet à Lyon, deux enfants.**

Camille jongle entre réunions qui dérapent, les devoirs, le sport du jeudi et le dîner chez les beaux-parents. Elle a testé trois applis de planning et les a abandonnées : trop de réglages, des écrans qui surchargent, aucune ne lui parlait. Ce qu'elle cherche, ce n'est pas « plus de fonctionnalités », c'est **moins de friction le matin** : ouvrir son téléphone, entendre « Bonjour Camille, aujourd'hui tu as 3 événements — le premier à 9h00 : point équipe », et savoir où elle en est. Elle veut aussi être sûre que son planning (qui connaît toute sa vie) ne parte pas chez n'importe qui.

**Portraits secondaires :**

- **Léo, 22 ans, étudiant en droit à Rennes.** Semestre chargé, partiels qui approchent, colocation à gérer. Il ajoute ses cours et ses séances de sport en trois mots (« révision droit lundi 14h ») depuis le amphi, sur son téléphone. Budget étudiant = 0 €.
- **La famille Martin, parents débordés, deux ados.** Chacun ses activités, leurs transport, leurs anniversaires. Ils veulent un agenda partagé simple — sans se créer un compte usine à gaz pour ça.

**Ce qu'ils ont tous en commun** : la fatigue des « usines à gaz ». Ils ne veulent pas d'un outil de plus à configurer. Ils veulent d'un outil qui **s'adapte à eux en une phrase**, pas l'inverse.

---

## Le paysage concurrentiel

| Acteur | Position | Ce qu'on en dit (honnêtement) |
|---|---|---|
| **Google Agenda** | Puissant mais froid | Gratuit, partout, fiable — mais il ne te connaît pas, ne te parle pas, et te noie dans des options. |
| **Fantastical** | Beau mais cher et traduit mal | Très soigné sur Apple, abonnement salé, et le français n'est pas sa langue maternelle — la saisie naturelle en français y patine. |
| **Notion** | Tout sauf un agenda | Un couteau suisse qui fait *presque* planning, mais demande de tout construire soi-même. Pas un compagnon de tous les matins. |
| **Les applis « to-do » pures** (Ticks, etc.) | La liste de courses du cerveau | Bien pour cocher, muettes pour le reste : pas de voix, pas de bonjour, pas de vision de la journée. |
| **Centeryou** | **Le planning qui te parle et te souhaite bon matin** | 100 % français (interface, voix, parseur), saisie en langage naturel, film du matin personnalisé, données locales par défaut. Gratuit pour l'essentiel. |

---

## Notre différenciation (les deux piliers)

1. **« Ton planning te parle. »** — Une vraie voix française, pas un chatbot : saisie en langage naturel à l'écrit **et** à la voix (« ajoute sport demain 14h »), commandes (« mon programme », « c'est fait sport »), et un parseur écrit pour le français, pas traduit de l'anglais.
2. **« Le seul qui te souhaite bon matin. »** — Le film de lancement du matin : salutation à ton prénom selon l'heure réelle, tes vrais chiffres du jour, ta prochaine étape, lu à voix haute. Aucun autre agenda ne te dit bonjour. Celui-là le fait, chaque matin, en ~38 secondes.

**Ce qu'on ne dit PAS** (règle d'or) : on ne promet pas l'export .ics (en cours, PR #29 non fusionnée), ni les créneaux suggérés (M-12 en cours), ni un rappel quand l'app est complètement fermée (les rappels sont locaux : app ouverte ou en arrière-plan — on le dit tel quel), ni une voix premium « illimitée » sans limite (il y a un quota serveur de protection de 300 caractères/jour, on l'assume).
