# Vidéo 1 — « Le film du matin » ⭐ (la star — si tu n'en gardes qu'une, c'est ELLE)

- **Idée forte** : chaque matin, Centeryou te joue un petit film personnalisé, lu à voix haute — unique au monde, aucun autre agenda ne te souhaite bon matin.
- **Format** : vertical 9:16 (1080×1920) · **~40 s** · Reels / TikTok / YouTube Shorts · son natif (voix du film) + sous-titres.
- **Vérifié dans l'app** (`main` 23/11/2026) : film de lancement en 5 scènes, 38,2 s au total (`SCENE_DURATIONS` dans `src/components/today/launch-film.tsx`), joué à l'ouverture de `/aujourdhui` (réglage par défaut : une fois par jour) ; salutation selon l'heure réelle + prénom (`greetingFor`), vrais chiffres du jour, prochaine étape, semaine en pastilles, scène « magie » dictée, narration = brief du matin (`src/lib/launch-film.ts`, `src/lib/brief.ts`).

## Accroche (0–3 s, obligatoire)

- **Texte à l'écran** : « Personne ne te souhaite bon matin. »
- **Voix off** : « Sauf un. Chaque matin, Centeryou te fait un film rien que pour toi. »

## Plans

| # | Minutage | Ce qu'on voit à l'écran | Texte affiché (overlay) | Voix off | Tournage écran |
|---|---|---|---|---|---|
| 1 | 0–3 s | Fond nuit `#1A1B2E`, le monogramme violet s'allume doucement | « Personne ne te souhaite bon matin. » | « Sauf un. Chaque matin, Centeryou te fait un film rien que pour toi. » | Ouvrir `centeryou.app/aujourdhui` avec un profil déjà créé (prénom « Camille ») : le film se lance tout seul à l'ouverture. |
| 2 | 3–11 s | Scène 1 du film : salutation + date du jour | « Bonjour Camille. » + « lundi 23 novembre » | « Bonjour, avec ton prénom, selon l'heure réelle. » | Laisser jouer la scène 1. Préparer le profil avec le prénom « Camille ». |
| 3 | 11–20 s | Scène 2 : les vrais chiffres du jour | « Aujourd'hui : 3 événements — le premier à 9h00 : point équipe. 2 tâches sur 5 déjà faites. » | « Tes vrais rendez-vous du jour, tes vraies tâches. » | Profil préparé avec 3 événements aujourd'hui (dont « Point équipe » à 9h00) et 5 tâches dont 2 cochées. |
| 4 | 20–28 s | Scène 3 : la semaine en pastilles + encouragement ; puis scène 4 « magie » : la phrase dictée qui devient une carte | « Ta semaine avance bien. Bravo. » puis « ajoute sport demain 14h → Sport, demain 14h00 » | « Ta semaine en un coup d'œil. Et la saisie en français, comme par magie. » | Laisser jouer. La scène « magie » montre la phrase « ajoute sport demain 14h » se transformer en carte d'événement. |
| 5 | 28–36 s | Scène 5 + carte « Ton brief du matin » sur `/aujourdhui`, bouton « Écouter mon brief du jour » | « Le même texte, lu à voix haute. 38 secondes. » | « Et il se lit à voix haute — c'est ton brief du matin. » | Après « Passer », montrer la carte « Ton brief du matin » et cliquer « Écouter mon brief du jour » (son ON). |
| 6 | 36–40 s | Écran final : logo + slogan sur voiles pastel | « Centeryou — le seul planning qui te souhaite bon matin. 1er janvier 2027. Gratuit, données chez toi. » | « Le seul planning qui te souhaite bon matin. Rendez-vous le 1er janvier. » | Fin sur l'écran final du film, puis fondu sur le logo. Lien en bio. |

## Notes de tournage

- Enregistrement d'écran réel du produit (pas de stock) : lancer l'app en mobile (320×700 ou 1080×1920), profil « Camille » préparé.
- Son natif du film (voix) prioritaire ; sinon voix off enregistrée propre, sans musique agressive.
- Sous-titres : brûler les textes de la colonne « Texte affiché ».
- **Ne pas dire** : « notification push », « synchro », « sauvegarde en ligne » — le film est 100 % local aujourd'hui.

## CTA de publication (légende type)

> Chaque matin, un film de 38 secondes rien que pour toi : « Bonjour Camille », tes vrais rendez-vous, ta semaine — lu à voix haute. 🤍
> Centeryou, le seul planning qui te souhaite bon matin. En ligne le 1er janvier 2027 — lien en bio.
> #bonMatin #planning #appliFrançaise #français #gratuit
