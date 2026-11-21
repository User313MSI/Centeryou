# COPY-VITRINE — Refonte proposée des textes de la page d'accueil

- **Mission** : M-15 Trompette — propositions de **textes uniquement**, aucun code.
- **Page visée** : `/` (landing, composant `HomeGate`) — textes actuels relevés le 21/11/2026.
- **Règle d'or** : tout ce qui est écrit ici est vrai dans le produit aujourd'hui. Les formulations entre guillemets sont prêtes à être copiées telles quelles.

---

## 1. Titre principal (H1)

**Actuellement** : « Ton planning qui te parle »

**Proposition** :

> **« Le seul planning qui te souhaite bon matin. »**

Pourquoi : le slogan reste en baseline (voir §6), mais le titre doit porter la différenciation forte — le « bon matin » que personne d'autre ne te dit. 9 mots, concret, vérifiable dès l'ouverture de l'app.

**Baseline conservée juste en dessous** : « Ton planning qui te parle. »

---

## 2. Sous-titre

**Actuellement** : « Dis “ajoute sport demain 14h” — ou écris-le — et Centeryou range ton agenda, tes tâches et te briefe à la voix. 100 % en français, gratuit, et tes données restent sur ton appareil. »

**Proposition** :

> « Dis « sport demain 14h », et Centeryou range ton agenda. Chaque matin, un petit film te résume ta journée à voix haute — en français, et les données restent sur ton téléphone. Gratuit pour l'essentiel. »

Pourquoi : on garde la phrase magique (preuve immédiate du parseur), on ajoute le film du matin (la promesse « bon matin »), et on pose le prix et la confidentialité en une ligne, sans jargon.

---

## 3. Les 3 blocs avantages

**Actuellement** : « Le mobile d'abord » / « Ta voix te briefe » / « Tes données restent les tiennes ».

**Propositions** :

### Bloc 1 — « Dis-le, il le range. »

> « Écris ou dicte « dentiste mardi 10h30 santé », « !lundi réunion », « sport demain 14h » : Centeryou comprend le français naturel et place tout seul dans ton planning — avec la bonne catégorie et la bonne priorité. À la voix aussi : « mon programme », « c'est fait sport ». »

### Bloc 2 — « Chaque matin, ton film. »

> « À l'ouverture, Centeryou te joue un film de 38 secondes rien que pour toi : « Bonjour » + ton prénom, tes vrais rendez-vous du jour, ta prochaine étape, ta semaine en cours — le tout lu à voix haute si tu veux. Essaie, c'est le matin que ça fait du bien. »

### Bloc 3 — « Chez toi, vraiment. »

> « Pas de compte serveur, pas de pub, pas de traceur : ton planning vit dans ton navigateur et nulle part ailleurs. Tu peux tout exporter en JSON, et tout effacer en un clic dans Réglages. »

---

## 4. Appel à l'action

**Actuellement** : « Créer mon compte » (primaire) + « Voir la démo » (secondaire).

**Proposition** :

> Primaire : **« Essayer sans compte »**
> Secondaire : **« Voir la démo d'abord »**

**Note d'honnêteté (à garder en interne)** : « sans compte » est vrai aujourd'hui au sens fort — l'inscription (`/inscription`) ne crée qu'un **profil local** (un prénom dans le navigateur), aucun compte serveur, aucun e-mail demandé. La démo (`/demo`, semaine type de Sofia, lecture seule) reste le chemin sans aucune donnée du tout. Ne jamais écrire « sans inscription » : il y a bien une étape d'accueil en 3 étapes.

**Ligne sous les boutons (actuelle, à reformuler)** :

> « Aucun e-mail, aucun serveur : juste un prénom, chez toi. Déjà un planning sur cet appareil ? Ouvrir mon aujourd'hui → »

---

## 5. Section réassurance

**Proposition** — une rangée de 3 pastilles, sobre :

> - **🔒 Données privées** — Stockées dans ton navigateur uniquement par défaut. Jamais vendues, jamais partagées. [Politique de confidentialité](/legal)
> - **🇫🇷 100 % français** — Interface, voix et compréhension du français pensés en français, pas traduits.
> - **💜 Gratuit** — L'essentiel est gratuit pour toujours (offre Découverte, 0 €). [Voir les offres](/offres)

---

## 6. FAQ de vente (objections prix, réponses honnêtes)

> **« C'est vraiment gratuit ? »**
> Oui. Planning et tâches illimités, assistant vocal, voix de ton navigateur, mode sombre, rappels : l'offre Découverte est à 0 €, pour toujours. Tu as même 3 essais de la voix premium chaque mois, sans carte bancaire.
>
> **« Pourquoi payer 4,99 €/mois alors ? »**
> Pour trois conforts : la **voix premium illimitée** (une vraie voix chaleureuse, au-delà des 3 essais gratuits), la **sauvegarde en ligne** avec un compte, et la **synchronisation entre plusieurs appareils**. Si tu restes sur un seul appareil, le gratuit suffit — et on ne te poussera jamais à payer.
>
> **« Mes données, elles vont où exactement ? »**
> Par défaut : nulle part. Elles restent dans ton navigateur. Si tu crées le compte facultatif (offre Premium), une copie part chez notre hébergeur de sauvegarde (Supabase) pour la synchro — supprimable à tout moment. Un point transparent : si tu utilises la voix premium, le texte à prononcer transite par notre serveur puis par ElevenLabs (société américaine, encadré par des clauses contractuelles types). Tout est détaillé dans la [politique de confidentialité](/confidentialite). Sans voix premium, aucune donnée ne sort de ton appareil.
>
> **« Ça marche sur mon téléphone ? Et sur mon ordinateur Windows ? »**
> Oui : pensé d'abord pour le mobile (installable comme une app, fonctionne hors-ligne), et il existe un installateur Windows (« Centeryou-Setup », sans droits administrateur) sur notre page Releases GitHub.
>
> **« Et si je veux partir ? »**
> Tu exportes tes données en JSON depuis Réglages, et tu effaces tout en un clic. Ton planning t'appartient, même pour partir.
>
> **« Les rappels, ça marche quand l'app est fermée ? »**
> Honnêtement : non. Les rappels sont des notifications locales — ils partent quand l'app est ouverte ou en arrière-plan. On préfère te le dire plutôt que de te promettre un push magique.

---

## 7. Pied de page (inchangé, juste rappel)

Liens Démo / Offres / Presse / Mentions légales — garder. La ligne « fait avec soin, en français » reste.

---

*Document de travail marketing — à faire relire par Vibe Work avant intégration. Aucun code modifié.*
