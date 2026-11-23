# Vidéo 2 — « sport demain 14h » (la saisie magique)

- **Idée forte** : tu écris (ou dis) « sport demain 14h », et Centeryou range ton planning tout seul — en français naturel, pas un formulaire.
- **Format** : vertical 9:16 (1080×1920) · **~30 s** · Reels / TikTok / Shorts · son natif + sous-titres.
- **Vérifié dans l'app** : barre « Ajoute vite : sport demain 14h… » sur `/aujourdhui` (`src/components/tasks/quick-add.tsx`) ; parseur maison FR (`src/lib/parser.ts`) : « demain », « jeudi 18h », « dans 3 jours », « midi », « ce soir », dates absolues « 14 décembre » / « 14/12/2026 » (M-31), « ! » = priorité haute, catégories Travail/Perso/Santé/Focus/Autre, répétition ; toast « Événement ajouté : « Sport » — … à 14h00. » ; carte qui apparaît dans le planning.

## Accroche (0–3 s)

- **Texte à l'écran** : « Tu viens d'écrire ça à ton planning : » puis **« sport demain 14h »** en très gros.
- **Voix off** : « « Sport demain 14h ». Trois mots. Aucun formulaire. »

## Plans

| # | Minutage | Ce qu'on voit | Texte affiché | Voix off | Tournage écran |
|---|---|---|---|---|---|
| 1 | 0–6 s | Page `/aujourdhui`, la grande barre « Ajoute vite : sport demain 14h… » ; le doigt tape la phrase, touche Entrée | « sport demain 14h » | « Tu écris « sport demain 14h ». Comme à un ami. » | Ouvrir `/aujourdhui`, taper exactement `sport demain 14h` dans la barre d'ajout rapide, Entrée. |
| 2 | 6–13 s | Le toast de confirmation + la carte « Sport » qui apparaît | « Événement ajouté : « Sport » — demain à 14h00. » | « Et c'est rangé. Jour, heure — tout seul. » | Laisser le toast (~2 s), la carte violette apparaît dans la liste du jour. |
| 3 | 13–20 s | Bascule sur `/planning` (vue Semaine) : la carte « Sport » posée au bon jour, à 14h00 | « Dans ton planning, sans rien configurer. » | « Dans ta semaine, sans formulaire ni réglage. » | Ouvrir l'onglet Planning, vue Semaine, montrer la carte. |
| 4 | 20–27 s | Retour sur la barre, deux saisies rapides en accéléré | « !lundi réunion » → priorité haute · « dentiste mardi 10h30 santé » → catégorie Santé | « « !lundi réunion » pour la priorité haute. « Dentiste mardi 10h30 santé » : la catégorie se met toute seule. » | Retaper `!lundi réunion` puis `dentiste mardi 10h30 santé`, montrer les deux toasts. |
| 5 | 27–30 s | Écran final : logo + date | « Centeryou — 100 % français. 1er janvier 2027. » | « Centeryou comprend le français parlé. Rendez-vous le 1er janvier. » | Fin sur le logo. Lien en bio. |

## Notes de tournage

- Son natif (bruit des touches + toast). Pas de musique qui couvre la voix off.
- Cadrage : téléphone en main, pouce qui tape — le geste doit être lisible.
- **Ne pas dire** : « dictée reconnue à 100 % », « import Google » — on montre l'écrit, qui marche partout.

## CTA de publication

> « sport demain 14h » — et c'est rangé. 🤯
> Centeryou range ton planning quand tu lui parles en français. En ligne le 1er janvier 2027 — lien en bio.
> #planning #langageNaturel #français #productivité #appliFrançaise
