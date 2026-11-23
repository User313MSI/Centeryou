# Vidéo 3 — « La voix qui comprend le français parlé »

- **Idée forte** : Centeryou te comprend quand tu lui parles en français — et te répond à voix haute. Un parseur écrit pour le français, pas traduit de l'anglais.
- **Format** : vertical 9:16 (1080×1920) · **~35 s** · Reels / TikTok / Shorts · son natif (réponses vocales) + sous-titres.
- **Vérifié dans l'app** : page `/voix` (`src/app/voix/page.tsx`, `src/components/voice/voice-panel.tsx`) — bouton micro avec ondes turquoise, champ texte de secours, commandes listées : « ajoute sport demain 14h », « mon programme », « quoi de prévu demain ? », « c'est fait sport » (coche la tâche et félicite).

## Accroche (0–3 s)

- **Texte à l'écran** : « Et si ton planning te répondait à voix haute ? 🎙️ »
- **Voix off** : « Centeryou comprend le français parlé. Vraiment. »

## Plans

| # | Minutage | Ce qu'on voit | Texte affiché | Voix off | Tournage écran |
|---|---|---|---|---|---|
| 1 | 0–8 s | Page `/voix` : le gros bouton micro violet, les ondes turquoise qui ondulent, le champ « Écris ta commande : « ajoute sport demain 14h »… » | « Parle à ton planning. » | « Ouvre la page Voix. Un bouton, et il t'écoute. » | Ouvrir `/voix`. Montrer le bouton micro (ondes = motif réservé à la voix, ligne Nuage). |
| 2 | 8–16 s | Le doigt tape dans le champ commande (ou parle dans le micro) : `ajoute sport demain 14h` | « ajoute sport demain 14h » | « Tu dis « ajoute sport demain 14h ». » | Taper la commande dans le champ texte de la page Voix (fonctionne même sans micro), valider. |
| 3 | 16–24 s | La réponse de l'app s'affiche et se lit à voix haute | « C'est noté : « Sport » — demain à 14h00. » | « Il te répond. À l'écrit, et à voix haute. » | Laisser la réponse s'afficher + la synthèse vocale du navigateur lire la réponse (son ON). |
| 4 | 24–31 s | Deux autres commandes en accéléré : `mon programme` → « Camille, aujourd'hui : … » ; `c'est fait sport` → la tâche se coche + félicitation | « mon programme » · « c'est fait sport » | « « Mon programme » : il te lit ta journée. « C'est fait sport » : il coche et te félicite. » | Taper `mon programme`, écouter ; puis `c'est fait sport` sur une tâche « Sport » créée avant. |
| 5 | 31–35 s | Écran final : logo + date | « Ta voix, en français. 1er janvier 2027. » | « Une voix française, pas un robot traduit. Rendez-vous le 1er janvier. » | Fin sur le logo. Lien en bio. |

## Notes de tournage

- Si le navigateur de tournage ne reconnaît pas la parole, utiliser le **champ texte** de la page (prévu pour ça — le texte de la page le dit : « ou écris ta commande si ton navigateur ne reconnaît pas la parole »).
- Son natif obligatoire pour ce script (la réponse vocale est la preuve).
- **Ne pas dire** : « compréhension parfaite à 100 % », « toutes les langues » — on montre le français, c'est le claim.

## CTA de publication

> « mon programme », « c'est fait sport », « ajoute sport demain 14h »… 🎙️
> Centeryou te comprend en français et te répond à voix haute. En ligne le 1er janvier 2027 — lien en bio.
> #voix #français #assistantVocal #planning #appliFrançaise
