# Vidéo 5 — « Le planning sans compte »

- **Idée forte** : tu peux utiliser Centeryou tout de suite, sans e-mail, sans compte serveur — juste un prénom, et tout reste sur cet appareil. Et si tu veux d'abord regarder : la démo, lecture seule, sans rien entrer.
- **Format** : vertical 9:16 (1080×1920) · **~30 s** · Reels / TikTok / Shorts · son natif + sous-titres.
- **Vérifié dans l'app** : `/inscription` = un seul champ « Comment t'appelles-tu ? », aucun e-mail demandé, profil 100 % local (`src/app/inscription`, note d'honnêteté COPY-VITRINE : ne jamais écrire « sans inscription », il y a bien une étape d'accueil) ; `/demo` = « la semaine de Sofia, graphiste », lecture seule, bannière « Mode démo — lecture seule » (`src/app/demo/page.tsx`, `src/components/demo/demo-view.tsx`) ; CTA accueil « Créer mon compte » / « Voir la démo » (`src/components/landing/home-gate.tsx`).

## Accroche (0–3 s)

- **Texte à l'écran** : « Un planning. Zéro e-mail. Zéro compte. 👌 »
- **Voix off** : « Pas besoin de t'inscrire nulle part pour commencer. »

## Plans

| # | Minutage | Ce qu'on voit | Texte affiché | Voix off | Tournage écran |
|---|---|---|---|---|---|
| 1 | 0–7 s | Accueil `/` : les deux boutons « Créer mon compte » et « Voir la démo » | « Deux façons de commencer, sans e-mail. » | « Deux façons de commencer. Aucun e-mail demandé, jamais. » | Ouvrir `/` sur un navigateur neuf (profil vidé). |
| 2 | 7–15 s | `/inscription` : un seul champ « Comment t'appelles-tu ? » → taper « Camille » → « Créer mon compte » → arrivée directe sur `/aujourdhui` | « Un prénom. Et c'est parti. » | « Un prénom, un clic. Tu es déjà dans ton aujourd'hui. Tout reste sur cet appareil. » | Parcours réel : `/inscription`, champ prénom, bouton, arrivée sur `/aujourdhui`. |
| 3 | 15–23 s | `/demo` : bannière « Mode démo — lecture seule », la semaine type de Sofia, graphiste, avec ses événements colorés | « Ou teste d'abord la démo : la semaine de Sofia, sans rien entrer. » | « Ou tu explores d'abord la démo — la semaine de Sofia — sans rien entrer du tout. » | Ouvrir `/demo`, montrer la bannière et le planning de Sofia. |
| 4 | 23–30 s | Écran final : logo + date | « Ton planning, sans compte. Données sur cet appareil. 1er janvier 2027. » | « Ton planning, sans compte. Rendez-vous le 1er janvier. » | Fin sur le logo. Lien en bio. |

## Notes de tournage

- **Dire « sans compte », jamais « sans inscription »** : il y a bien une étape d'accueil (un prénom), c'est la règle de COPY-VITRINE — « sans compte » est vrai au sens fort (aucun compte serveur, aucun e-mail).
- Navigateur de tournage vidé avant le plan 2 pour montrer le parcours neuf.
- **Ne pas dire** : « créez votre compte gratuit en ligne », « accès cloud » — pas de compte en ligne annoncé.

## CTA de publication

> Un planning sans compte, sans e-mail — juste un prénom, chez toi. 👌
> Essaie la démo de Centeryou (la semaine de Sofia, lecture seule), ou commence direct. En ligne le 1er janvier 2027 — lien en bio.
> #sansCompte #planning #gratuit #viePrivée #appliFrançaise
