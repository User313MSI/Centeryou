# Vidéo 4 — « Tout reste chez toi » (confidentialité)

- **Idée forte** : ton planning connaît ta vie, alors il reste sur ton appareil. Pas de compte serveur, pas de pub, pas de traceur — et tu peux tout exporter ou tout effacer quand tu veux.
- **Format** : vertical 9:16 (1080×1920) · **~40 s** · Reels / TikTok / Shorts · voix off douce + sous-titres.
- **Vérifié dans l'app** : données 100 % locales par défaut (navigateur), aucun compte nécessaire à l'ouverture (CGU art. 3) ; Réglages → carte « Données locales » : « Sauvegarder mes données » (export, toast « Sauvegarde exportée : fichier JSON téléchargé. ») et « Effacer toutes mes données » (toast « Toutes tes données ont été effacées. ») — `src/app/reglages/page.tsx` ; pages `/confidentialite`, `/legal`, `/cgu` ; zéro traceur (audit Coffre M-14).

## Accroche (0–3 s)

- **Texte à l'écran** : « Ton planning connaît ta vie. »
- **Voix off** : « Alors chez Centeryou, il reste chez toi. »

## Plans

| # | Minutage | Ce qu'on voit | Texte affiché | Voix off | Tournage écran |
|---|---|---|---|---|---|
| 1 | 0–8 s | Accueil `/` : la carte « Tes données restent les tiennes » / pastille « 🔒 Données privées » | « Tes données restent sur ton appareil. » | « Chez Centeryou, ton planning vit dans ton navigateur. Pas sur un serveur. » | Ouvrir `/` (ou `/confidentialite`), montrer la carte/pastille. |
| 2 | 8–18 s | Réglages (`/reglages`) → carte « Données locales » → clic sur « Sauvegarder mes données » | « Sauvegarder mes données » → toast « Sauvegarde exportée : fichier JSON téléchargé. » | « Tu peux tout exporter quand tu veux, dans un fichier lisible. » | Ouvrir `/reglages`, descendre à « Données locales », cliquer « Sauvegarder mes données », montrer le toast. |
| 3 | 18–27 s | Toujours dans « Données locales » : « Effacer toutes mes données », double confirmation, toast de confirmation | « Effacer toutes mes données » → « Toutes tes données ont été effacées. » | « Et tout effacer en un geste quand tu veux partir. Proprement. » | Cliquer « Effacer toutes mes données » (deux clics de confirmation), montrer le toast. **Relancer avec un profil de tournage neuf ensuite.** |
| 4 | 27–34 s | Texte plein écran sur fond clair `#FAFAFC`, sobre | « Pas de compte serveur. Pas de pub. Pas de traceur. Rien de vendu, rien de partagé. » | « Pas de compte obligatoire, pas de publicité, pas de traceur. Tes données ne sont ni vendues ni partagées. » | Carton texte (à monter en post-prod, fond uni `#FAFAFC`, typo propre) ou capture de `/confidentialite`. |
| 5 | 34–40 s | Écran final : logo + slogan | « Tes données restent chez toi. Gratuit pour l'essentiel. 1er janvier 2027. » | « Tes données restent chez toi. C'est gratuit pour l'essentiel. Rendez-vous le 1er janvier. » | Fin sur le logo. Lien en bio. |

## Notes de tournage

- **Ne jamais dire** : « sauvegarde en ligne », « synchronisé sur tous tes appareils », « compte cloud » — les comptes en ligne arrivent, on ne les annonce pas. Ici on montre le local, qui est réel aujourd'hui.
- Ton rassurant, pas anxiogène : on ne montre aucune fuite de données, on montre le contrôle.
- Le double-clic de confirmation d'effacement : le montrer tel quel (c'est honnête et rassurant).

## CTA de publication

> Ton planning connaît ta vie. Alors il reste chez toi. 🔒
> Chez Centeryou : pas de compte serveur, pas de pub, pas de traceur — et tout est exportable / effaçable en un geste. Gratuit pour l'essentiel, en ligne le 1er janvier 2027 — lien en bio.
> #donnéesPrivées #confidentialité #viePrivée #gratuit #appliFrançaise
